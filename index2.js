const express = require("express");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const crypto = require('crypto');
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
const scraperQueue = require("./queue.js");
const bouncer = require("express-bouncer")(500,90000);
const validator = require('validator');
const sanitize_filename = require("sanitize-filename");

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


function checkFileType(file,cb){
  const filetypes=/jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname){
    return cb(null,true);
  } else{
    cb('Erreur : Seules les images du format (jpeg,jpg,png) sont authorisées !')
  }
}


let storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, path.join(__dirname, 'tmp/') )
  },
  filename : function (req,file,cb){
    const safeName = sanitize_filename(file.originalname);
    cb(null,'44_'+safeName)
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


const { error } = require("console");


const newmiddleware = async (req,res,next)=>{
  const userIp = await requestIp.getClientIp(req);
  const forbiddenIp = await connected.ip_forbidden.findOne({ip_list : userIp});
  if (forbiddenIp || userIp == undefined || userIp == null){
    return res.status(400).json({message : 'Website not reachable'});
  }
  return next();
}

const initiatemiddleware = async (req,res,next)=>{
  const userIp = requestIp.getClientIp(req);
  const count_associated = await connected.count_number_connexion_table.findOne({ip_ : userIp});

  if (!count_associated){
    const association = new connected.count_number_connexion_table({ip_ : userIp});
    association.save();
    return next();
  }

  else if (count_associated.number_ >=4){

    const new_ip = new connected.ip_forbidden({ip_list : userIp});
    new_ip.save();
    
    await mail_manager.send_mail("ip blocked", ` the following ip ${userIp} was blocked due to too much attempt `,null,process.env.FROMMAIL);

    await connected.count_number_connexion_table.deleteOne(count_associated);
    return res.status(400).json({message : 'Website not reachable'});

  }else {
    count_associated.number_+=1;
    count_associated.save();
    return next();
  }
}

function generateCSRFToken(req, res, next) {
  const csrfToken = crypto.randomBytes(16).toString('hex');
  res.cookie('mycsrfToken', csrfToken,{
    httpOnly:true,
    secure:true,
    sameSite:"strict",
    maxAge: 30*60*1000,
  });
  req.csrfToken = csrfToken;
  console.log(req.csrfToken)
  return next();
 }


 async function validateCSRFToken(req, res, next) {
  const csrfToken = req.cookies.mycsrfToken;
  const userIp = requestIp.getClientIp(req);
  if (sanitize(sanitizeHtml(validator.escape(req.body?.csrfToken))) === csrfToken) {
    return next();
  } else {
    await mail_manager.send_mail("attempt of CSRF attack", `the following ip ${userIp} try to access to the website via a corrupted way`,null,process.env.FROMMAIL);
    return res.status(400).json({message : 'Website not reachable'});
  }
 }
 

app.get('/',newmiddleware,generateCSRFToken,(req,res) => {
  //res.set('Content-Type', 'text/plain');
  return res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <link rel="stylesheet" href="style.css">
    <script type= "text/javascript" src = "Clear.js" defer></script>
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title> Identifiant </title>
    </head>
    <body>
    <form action="/information"  method="post">

    <input type="hidden" name="csrfToken" value="${req.cookies.mycsrfToken}" />

    <label for="identifiant"></label>
    <input type="text" id="identifiant" name="identifiant" placeholder="identifiant"  required>
            
    <label for="mot de passe"></label>
    <input type="password" id="mot_de_passe" name="mot_de_passe" placeholder="mot de passe" required>
            
    <button type="submit">Submit</button>

    </form>
    <input type="checkbox" id="toggleBtn">Code en claire
    </body>
    </html>`
  );
});


const loginlimiter = rateLimit({
  windowMs: 15*60*1000,
  max : 15,
  message : "Trop d'opérations, veuillez attendre 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,

});


app.use(loginlimiter);


bouncer.blocked = function (req,res,next,remaining)
{
  res.send("Too many requests, please wait " + remaining/1000 + "seconds");
}


app.post('/information',bouncer.block,newmiddleware,initiatemiddleware,validateCSRFToken,async (req,res)=>{
  
  try{
    
    let userIp = requestIp.getClientIp(req);


    const {error,value} = connected.Schema_validation.validate(req.body);
    
    if (error) {
      mail_manager.send_mail("Access denied", "the following ip try to access to the device without authorization : \n" +` ip : ${userIp}` + "\n" + `Date: ${new Date()}` + "\n" + `And failed due to the following reason : ${error.details[0].message} `,null,process.env.FROMMAIL);
      return res.redirect("/");
    }


    let {identifiant,mot_de_passe} =  value;

    console.log(`${identifiant}  ${mot_de_passe}`);

    identifiant.replace(" ","").replace("<","").replace(">","");

    identifiant = sanitize(sanitizeHtml(identifiant));

    mot_de_passe = sanitize(sanitizeHtml(mot_de_passe));

    const user = await connected.id_people.findOne({name_id : identifiant}).collation({ locale: 'en', strength: 3 });
    const userspecial = await connected.special_people.findOne({name_id : identifiant}).collation({ locale: 'en', strength: 3 });

    

    if ((!user || !(await bcrypt.compare(mot_de_passe,user.code_id))) && !userspecial){
      //mail_manager.send_mail("Access denied", "the following ip try to access to the device without authorization : \n" +` ip : ${userIp}` + "\n" + `Date: ${new Date()}`,null,process.env.FROMMAIL);
      return res.redirect("/");
    }

    
   
    if (userspecial){
      await mail_manager.send_mail("Access ", " the following user have accessed to the device : \n" + `user :${userspecial.name_id}` + "\n" +`ip : ${userIp}` + "\n" + `Date : ${new Date()}`,null,process.env.FROMMAIL);

    }else{
      await mail_manager.send_mail("Access ", " the following user have accessed to the device : \n" + `user :${user.name_id}` + "\n" +`ip : ${userIp}` + "\n" + `Date : ${new Date()}`,null,process.env.FROMMAIL);
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
      bouncer.reset(req);
      return res.redirect("/dashboard_special");
    }

    bouncer.reset(req);
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



app.get("/dashboard", authMiddleware, newmiddleware,generateCSRFToken,(req, res) => {
  //res.set('Content-Type', 'text/plain');
  return res.send(`
              <!DOCTYPE html>
              <html lang="fr">
              <link rel="stylesheet" href ="style.css">
              <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title> Essai Formulaire </title>
              </head>
              <body>
                    
              <form action="/upload"  method="post" enctype="multipart/form-data">

              <input type="hidden" name="csrfToken" value="${req.cookies.mycsrfToken}" />

              <label for="descript">Description</label>
              <input type="text" id="descript" name="descript" placeholder="description de l'infraction"  required>
    
              <label for="local">Localisation</label>
              <input type="text" id="local" name="local" placeholder= "Localisation précise (Attention mettre le numero avant)" required>

              <label for="prec">Description_precise</label>
              <input type="text" id="prec" name="prec" placeholder= "description précise "required>
            
              <label for="im1">Image 1</label>
              <input type="file" accept="image/*" id="im" name="image1" style="margin: 10px 0;" />

              <label for="im2">Image 2</label>
              <input type="file" accept="image/*" id="im" name="image2" style="margin: 10px 0;" />
            
              <label for="im3">Image 3</label>
              <input type="file" accept="image/*" id="im" name="image3" style="margin: 10px 0;" />

              <button type="submit">Submit</button>
        
              </form>

              <form action="/disconnected" method="post">
              <button type="disconnected">Deconnexion</button>
              </form>

              </body>
              </html>`
            );
        });


app.get("/dashboard_special", authMiddleware_special, newmiddleware,generateCSRFToken,(req,res) =>{
  //res.set('Content-Type', 'text/plain');
  return res.send(`
                    <!DOCTYPE html>
                    <html lang="fr">
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title> Essai Formulaire </title>
                    </head>
                      <form action = "/transfert" method="post">
                      <input type="hidden" name="csrfToken" value="${req.cookies.mycsrfToken}" />
                      <label for="deleting">IP</label>
                      <input type="text" id="deleting" name="deleting" required>
                      <button type="submit">Submit</button>
                      </form>
        
                    <form action="/deconnected_bis" method="post">
                      <button type="submit">Deconnexion</button>
                    </form>
    
                    </html>`);
});


app.post('/upload', authMiddleware, newmiddleware,upload.fields([
  {name:"image1",maxCount:1},
  {name:"image2",maxCount:1},
  {name:"image3",maxCount:1}
]) , async (req,res)=> {

  try{

    
    
    const csrf_ = sanitize(sanitizeHtml(validator.escape(req.body.csrfToken)));

    if (csrf_ != req.cookies.mycsrfToken){

      const userIp = requestIp.getClientIp(req);
      await mail_manager.send_mail("attempt of CSRF attack", `the following ip ${userIp} try to access to the website via a corrupted way`,null,process.env.FROMMAIL);
      return res.status(400).json({message : 'Website not reachable'});
    }

    const description=sanitize(sanitizeHtml(validator.escape(req.body.descript)));
    const localisation = sanitize(sanitizeHtml(validator.escape(req.body.local)));
    const description_precise = sanitize(sanitizeHtml(validator.escape(req.body.prec)));

   

    let path_image1= req.files["image1"]?.[0];
    let path_image2= req.files["image2"]?.[0];
    let path_image3= req.files["image3"]?.[0];

    path_image1 = filemanag.SafeFilePath(path_image1);
    path_image2 = filemanag.SafeFilePath(path_image2);
    path_image3 = filemanag.SafeFilePath(path_image3);

    console.log(`description originale : ${description} \n`);
    
    console.log(`path image : ${path_image1} \n`);

    const username_ = String(req.user.username);

    //console.log(`the user is ${username_}`);

    scraperQueue.scraperQueue.push({description,localisation,description_precise,path_image1,path_image2,path_image3,username_})

    return res.redirect("/dashboard");

  }catch (err){
    console.log(err);
    mail_manager.send_mail("Issue on the upload directory ", `There was the following issue with the upload directory \n ${err}`,null,process.env.FROMMAIL);
    return res.redirect("/upload");
  }

    
});




app.post('/transfert',authMiddleware_special,newmiddleware,validateCSRFToken,(req,res)=>{
  const {deleting} = req.body;

  try{
    const new_ip = new connected.ip_forbidden({ip_list : deleting});
    new_ip.save();
    return res.redirect("/dashboard_special");
} catch (err){
    console.error(err.message);
}});




app.post("/disconnected",authMiddleware,newmiddleware,async (req,res)=>{
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




const middleWarelogin = async (req,res,next) => {
    try {

      const token_ = sanitize(sanitizeHtml(req.params.token));
      
      //console.log(`MiddleWarelogin and here is the token : ${token} \n`);

      const possibleregistration = await connected.registration.findOne({token:token_,Status:"unconnected",expireAt : {$gt: new Date()}});

      if (!possibleregistration){
        return res.status(404).send('Website not reachable');
      }
      
      possibleregistration.Status="connected";
      possibleregistration.save();

      return next();

    } catch (err){
      console.log(err);
    }

}

app.get('/authentification/:token',bouncer.block,newmiddleware,initiatemiddleware,middleWarelogin,async (req,res) => {
  
  const token = sanitize(sanitizeHtml(req.params.token));

  res.cookie("authentif_token",token,{
    httpOnly:true,
    secure:true,
    sameSite:"strict",
    maxAge: 30*60*1000,
  });

  bouncer.reset(req);
  await connected.count_number_connexion_table.deleteOne({ip_: requestIp.getClientIp(req)});
  
  return res.redirect(`/identification/`);

});


const middleWarelogincontinue = async (req,res,next) => {
  try {
    const token_ = sanitize(sanitizeHtml(req.cookies.authentif_token));

    //console.log(`MiddleWareLoginContinue and here is the token : ${token} \n`);
    
    const possibleregistration = await connected.registration.findOne({token:token_,Status:"connected",expireAt : {$gt: new Date()}});

    if (!possibleregistration || possibleregistration.attempt >=4){
      return res.status(404).send("Website not reachable");
    }

    possibleregistration.attempt+=1;
    possibleregistration.save();

    return next();

  } catch (err){
    console.log(err);
  }
}



app.get('/identification/',middleWarelogincontinue,generateCSRFToken,async (req,res) => {
    //res.set('Content-Type', 'text/plain');
    return res.send(`<!DOCTYPE html>
                     <html lang="fr">
                     <link rel="stylesheet" href ="style.css">
                     <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title> Inscription </title>
                     </head>
                     <body>
                      <form action="/identification/"  method="post">
        
                        <input type="hidden" name="csrfToken" value="${req.cookies.mycsrfToken}" />

                        <label for="pseudonyme">Pseudonyme (si possible sans lien avec votre identité) </label>
                        <input type="text" id="pseudonyme" name="pseudonyme" placeholder="Doit contenir entre 3 et 30 lettres "  required>
    
                        <label for="identificator"> Mot de passe (si possible sans lien avec votre date de naissance ou tout autre élément publiquement visible sur Internet) </label>
                        <input type="text" id="identificator" name="identificator" placeholder= "Doit contenir au moins 8 élements et un caractère spécial" required>

                        <label for="mail"> Adresse mail (si possible une adresse dédiée en faisant apparaitre le moins possible votre véritable identité)</label>
                        <input type="text" id="mail" name="mail" placeholder= "Votre mail dédié au signalement automatique" required>

                        <label for="submit">En appuyant sur Submit vous acceptez que votre adresse mail puisse être utilisée pour le signalement automatique d'anomalies sur la voie publique de Grenoble</label>
                        <button type="submit">Submit</button>
        
                      </form>

                     </body>
                     </html>`
                    );    
});




app.use("/identification/",middleWarelogincontinue,express.static('protected_login'));

app.post('/identification/',middleWarelogincontinue,validateCSRFToken,async (req,res) => {
  try{

    const token_ = sanitize(sanitizeHtml(req.cookies.authentif_token));

    const {error,value} = connected.Schema_identification.validate(req.body);

    console.log(error);


    if (error) {
      
      await mail_manager.send_mail("issue with the validation ", `there is the following error ${error} `,null,FROMMAIL);
      
      return res.redirect(`/identification/`);

    }

    let {pseudonyme,identificator,mail} = value;

    pseudonyme = sanitize(sanitizeHtml(pseudonyme));
    identificator = sanitize(sanitizeHtml(identificator));
    mail = sanitize(sanitizeHtml(mail));

    console.log(pseudonyme);
    console.log(identificator);
    console.log(mail);

    pseudonyme = String(pseudonyme);

    const newcode = await bcrypt.hash(identificator,10);
    const newpeople = new connected.id_people({name_id : pseudonyme, code_id : newcode});
    newpeople.save();
    
    const newpupil = new connected.pupil({title : mail});
    newpupil.save();

    await mail_manager.send_mail(" Bienvenue sur map signalement " , "Vous trouverez ci-dessous les informations pour vous connecter à votre compte : \n" + `Identifiant : ${pseudonyme} \n` + `Mot de passe : ${identificator}\n` + `site web : https://map-signalement-2015ef4f555e.herokuapp.com \n` + " Veuillez conserver ces informations de manière personnelle et discrète. Notez que vous pourrez être amené à changer de mot de passe afin de renforcer la sécurité du site. ",null,mail); 

    await mail_manager.send_mail(" A new user subscribe ", `the following ip ${requestIp.getClientIp(req)} has subscribed to your app with the following profile : \n`+ `Identifiant : ${pseudonyme} \n` + `Mot de passe : ${identificator}\n`,null,process.env.FROMMAIL);

    await connected.registration.deleteOne({token : token_});

    res.clearCookie("authentif_token");

    return res.send(" L'identification a été complétée avec succès. Veuillez regarder votre mail (en particulier vos spams) afin de pouvoir passer à la suite ");

  } catch (err){
    console.log(err);
  }
})





const PORT = process.env.PORT || 3000;

console.log(PORT);


app.listen(PORT,()=>{
  console.log('Server running');
});
