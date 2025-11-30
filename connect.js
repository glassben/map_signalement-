const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Joi  = require("joi");
dotenv.config();




const connection = async () => {
    try {
        await mongoose.connect(process.env.URI,{
        });
        console.log("Connection OK")
    } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
};


connection();


const schema = new mongoose.Schema({
    title :{
        type : String,
        required : true,
        trim: true,
        unique:true,
        lowercase:true,
    },
    code :{
        type : String,
        required : true,
        unique: true,
        lowercase: true,
    }
});

const pupil = mongoose.model('pupil',schema);

const schema_authentification = new mongoose.Schema({
    name_id :{
        type : String,
        required : true,
        unique: true,
        lowercase : true,
    },

    code_id :{
        type : String,
        required : true,
        unique : true,
    }
});

const id_people = mongoose.model('id_people',schema_authentification);




const special_schema = new mongoose.Schema({
    name_id :{
        type : String,
        required : true,
        unique: true,
        lowercase : true,
    },

    code_id :{
        type : String,
        required : true,
        unique : true,
    }
});

const special_people = mongoose.model('special',special_schema);


const Schema_validation = Joi.object({
    identifiant  : Joi.string().alphanum().min(3).max(30).required(),
    mot_de_passe : Joi.string().min(8).max(50).required(),
});


const schema_ip_forbidden = new mongoose.Schema({
    ip_list : {
        type : String,
        required : true,
        unique : true,
    }
});

const ip_forbidden = mongoose.model('ip_forbidden',schema_ip_forbidden);


const schema_request = new mongoose.Schema({
    
    date: {
        type: Date,
        default : Date.now,
        required : true,
    },
    
    initiated : {
        type : String,
        required : true,
    },

    location : {
        type : String,
        required : true,
    },

    accepted : [
        {
            type: Boolean,
        },
    ],
});

const request_list = mongoose.model('schema_request',schema_request);


module.exports = {pupil,id_people,Schema_validation,ip_forbidden, special_people, request_list};