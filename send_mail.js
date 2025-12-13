const nodemail=require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();
const filemanaging = require("./filemanagement")


async function send_mail(mysubject,mytext,file,mymail){
    


    let transport = await nodemail.createTransport({
        host:'smtp-relay.brevo.com',
        port:465,
        secure: true,
        auth:{
            user : process.env.MAIL,
            pass : process.env.PASS,
        }
    });

    let mail ={
        from : process.env.FROMMAIL,
        to : mymail,
        subject : mysubject,
        text: mytext};
    

    if (file!=null){
        
        let filepath = await filemanaging.getFullPath(file);
        
        mail.attachments = [
            {
                filename:file,
                path: filepath
            },
        ];

    }

    
    await transport.sendMail(mail,function(error){
        if (error){
            console.log(error);
        } 
    }); 

};





module.exports = {send_mail};