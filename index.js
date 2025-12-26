const express = require("express");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require('express-rate-limit');
const connected = require("./connect.js");
const dotenv = require("dotenv");
const helmet = require('helmet');
const cookieParser = require("cookie-parser");
const requestIp = require('request-ip');
const mail_manager = require("./send_mail.js");
const sanitize = require('mongo-sanitize');
const cors = require("cors");
const sanitizeHtml = require('sanitize-html')
const filemanag = require("./filemanagement.js");


dotenv.config();


const app = express();
app.use(express.json({ limit : '10kb' }));
app.use(express.urlencoded({ extended: true, limit : "1mb" }));
app.use(helmet());
app.use(cookieParser());

app.use((req,res,next)=>{
  res.set("Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self';");
  next();
});


app.use(express.static('public'));

app.disable('x-powered-by');



const corsOptions = {
  origin:'https://map-signalement-2015ef4f555e.herokuapp.com/', 
  methods:'GET,POST',
  credential : true,
}

app.use(cors(corsOptions));

//app.enable("trust proxy");

// app.use((req,res,next)=>{
//   if (req.secure || req.headers["x-forwarded-proto"] == "https"){
//     return next();
//   }
//   res.redirect("https://" + req.headers.host + req.url);
// });



function checkFileType(file,cb){
  const filetypes=/jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname){
    return cb(null,true);
  } else{
    cb('Erreur : Seule les images du format (jpeg,jpg,png) sont authorisées !')
  }
}




let storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, path.join(__dirname, 'tmp/') )
  },
  filename : function (req,file,cb){
    cb(null,file.originalname)
  }
});

const upload = multer({ 
			storage: storage, 
			limits: {
   			 fileSize: 8000000},
      fileFilter(req,file,cb){
        checkFileType(file,cb);
      }
		});


const schedule = require("./schedule.js");
const { error } = require("console");


const newmiddleware = async (req,res,next)=>{
  const userIp = await requestIp.getClientIp(req);
  const forbiddenIp = await connected.ip_forbidden.findOne({ip_list : userIp});
  if (forbiddenIp || userIp == undefined || userIp == null){
    return res.status(400).json({message : 'Fobidden Access'});
  }
  return next();
}

const initiatemiddleware = async (req,res,next)=>{
  const userIp = await requestIp.getClientIp(req);
  const count_associated = await connected.count_number_connexion_table.findOne({ip_ : userIp});

  if (!count_associated){
    const association = new connected.count_number_connexion_table({ip_ : userIp});
    association.save();
    return next();
  }

  else if (count_associated.number_ >=4){

    const new_ip = new connected.ip_forbidden({ip_list : userIp});
    new_ip.save();
    
    mail_manager.send_mail("ip blocked", ` the following ip ${userIp} was blocked due to too much attempt `,null,process.env.FROMMAIL);

    await connected.count_number_connexion_table.deleteOne(count_associated);
    return res.status(400).json({message : 'Fobidden Access'});

  }else {
    count_associated.number_+=1;
    count_associated.save();
    return next();
  }
}



app.get('/',newmiddleware,(req,res) => {
    res.sendFile(path.join(__dirname , "/public/Authorization.html"));
});


const loginlimiter = rateLimit({
  windowMs: 15*60*1000,
  max : 15,
  message : "Trop d'opérations, veuillez attendre 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,

});


app.use(loginlimiter);





app.post('/information',newmiddleware,initiatemiddleware,async (req,res)=>{
  try{
    
    let userIp = await requestIp.getClientIp(req);


    const {error,value} = connected.Schema_validation.validate(req.body);
    
    if (error) {
      mail_manager.send_mail("Access denied", "the following ip try to access to the device without authorization : \n" +` ip : ${userIp}` + "\n" + `Date: ${new Date()}` + "\n" + `And failed due to the following reason : ${error.details[0].message} `,null,process.env.FROMMAIL);
      return res.redirect("/");
    }


    let {identifiant,mot_de_passe} =  value;

    identifiant.replace(" ","").replace("<","").replace(">","");

    identifiant = sanitizeHtml(identifiant);

    mot_de_passe = sanitizeHtml(mot_de_passe);

    const user = await connected.id_people.findOne({name_id : sanitize(identifiant)});
    const userspecial = await connected.special_people.findOne({name_id : sanitize(identifiant)});

    

    if ((!user || !(await bcrypt.compare(mot_de_passe,user.code_id))) && !userspecial){
      mail_manager.send_mail("Access denied", "the following ip try to access to the device without authorization : \n" +` ip : ${userIp}` + "\n" + `Date: ${new Date()}`,null,process.env.FROMMAIL);
      return res.redirect("/");
    }

    
   
    if (userspecial){
      mail_manager.send_mail("Access ", " the following user have accessed to the device : \n" + `user :${userspecial.name_id}` + "\n" +`ip : ${userIp}` + "\n" + `Date : ${new Date()}`,null,process.env.FROMMAIL);

    }else{
      mail_manager.send_mail("Access ", " the following user have accessed to the device : \n" + `user :${user.name_id}` + "\n" +`ip : ${userIp}` + "\n" + `Date : ${new Date()}`,null,process.env.FROMMAIL);
    }
   
   
    let payload;

    if (userspecial){
      payload ={
        userId: userspecial._id,
        username: identifiant,
      };
    } 
    else{
      payload ={
        userId: user._id,
        username: identifiant,
      };
    }

 
    const token = jwt.sign(payload,process.env.JWT_SECRET, {expiresIn:'30m'});

    res.cookie("auth_token",token,{
      httpOnly:true,
      secure:true,
      sameSite:"strict",
      maxAge: 30*60*1000,
    });

    const new_connex = new connected.connex_table({name:identifiant,name_loc:userIp,nature : "Connexion"});
    new_connex.save();

    if (userspecial){
      return res.redirect("/dashboard_special");
    }

    return res.redirect("/dashboard");


  } catch (err) {
    console.error(err);
  }
})


const authMiddleware = async (req,res,next)=>{
  const token = req.cookies.auth_token;
  if (!token){
    return res.redirect("/");
  }
  try {
    
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    let user_verify = await connected.id_people.findOne({name_id : req.user.username});

    if (!user_verify){
      return res.redirect("/");
    }

    return next();
  } catch (err) {
    console.log(err);
    return res.redirect("/");
}
}

const authMiddleware_special = async (req,res,next)=>{
  const token = req.cookies.auth_token;
  if (!token){
    return res.redirect("/");
  }
  try{
    req.user = jwt.verify(token,process.env.JWT_SECRET);
    let user_verify = await connected.special_people.findOne({name_id : req.user.username});
    
    if (!user_verify){
      return res.redirect("/");
    }
    return next();

  } catch (err){
    console.log(err);
    return res.redirect("/");
  }
}


app.use('/upload',authMiddleware,newmiddleware,express.static('protected'));



app.get("/dashboard", authMiddleware, newmiddleware, (req, res) => {
  return res.sendFile(path.join(__dirname,"protected","index2.html"));
});


app.get("/dashboard_special", authMiddleware_special, newmiddleware, (req,res) =>{
  return res.sendFile(path.join(__dirname,"protected_bis","index3.html"));
});


app.post('/upload', authMiddleware, newmiddleware,upload.fields([
  {name:"image1",maxCount:1},
  {name:"image2",maxCount:1},
  {name:"image3",maxCount:1}
]) , async (req,res)=> {

  try{

    const description=sanitize(sanitizeHtml(req.body.descript));
    const localisation = sanitize(sanitizeHtml(req.body.local));
    const description_precise = sanitize(sanitizeHtml(req.body.prec));

   

    let path_image1= req.files["image1"]?.[0];
    let path_image2= req.files["image2"]?.[0];
    let path_image3= req.files["image3"]?.[0];

    path_image1 = filemanag.SafeFilePath(path_image1);
    path_image2 = filemanag.SafeFilePath(path_image2);
    path_image3 = filemanag.SafeFilePath(path_image3);

    console.log(`description originale : ${description} \n`);
    
    console.log(`path image : ${path_image1} \n`);

    schedule.schedule(description,localisation,description_precise,path_image1,path_image2,path_image3,req.user.username);

    return res.redirect("/dashboard");

  }catch (err){
    console.log(err);
    mail_manager.send_mail("Issue on the upload directory ", `There was the following issue with the upload directory \n ${err}`,null,process.env.FROMMAIL);
    return res.redirect("/upload");
  }

    
});




app.post('/transfert',authMiddleware_special,newmiddleware, (req,res)=>{
  const {deleting} = req.body;

  try{
    const new_ip = new connected.ip_forbidden({ip_list : deleting});
    new_ip.save();
    return res.redirect("/dashboard_special");
} catch (err){
    console.error(err.message);
}});




app.post("/disconnected",authMiddleware,newmiddleware, async (req,res)=>{
  try{
    let userIp = await requestIp.getClientIp(req);
    let user = req.user.username;
    res.clearCookie("auth_token");
    mail_manager.send_mail("Deconnexion", " the following user have been deconnected : \n" + `user :${user}` + "\n" +`ip : ${userIp}` + "\n" + `Date : ${new Date()}`,null,process.env.FROMMAIL);
    const new_deconnex = new connected.connex_table({name : req.user.username, name_loc : userIp, nature: "Deconnection"});
    new_deconnex.save();
    await connected.count_number_connexion_table.deleteOne({ip_ : userIp});
    return res.redirect('/');
  } catch (err){
    console.log(err);
  }
});


app.post("/deconnected_bis",authMiddleware_special,newmiddleware,async (req,res)=>{
  try{
    let userIp = await requestIp.getClientIp(req);
    let user = req.user.username;
    res.clearCookie("auth_token");
    mail_manager.send_mail("Deconnexion", " the following user special have been deconnected : \n" + `user :${user}` + "\n" +`ip : ${userIp}` + "\n" + `Date : ${new Date()}`,null,process.env.FROMMAIL);
    const new_deconnex = new connected.connex_table({name : req.user.username, name_loc : userIp, nature: "Deconnection"});
    new_deconnex.save();
    await connected.count_number_connexion_table.deleteOne({ip_:userIp});
    return res.redirect('/');
  } catch (err){
    console.log(err);
  }
});



const PORT = process.env.PORT || 3000;

console.log(PORT);


app.listen(PORT,()=>{
  console.log('Server running');
});
