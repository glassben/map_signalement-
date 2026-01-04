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
    },
    code :{
        type : String,
        lowercase: true,
    }
});

const pupil = mongoose.model('pupil',schema);

const schema_authentification = new mongoose.Schema({
    name_id :{
        type : String,
        required : true,
        unique: true,
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
    
    date: {
        type: Date,
        default : Date.now,
        required : true,
    },

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

    url_list : [ 
        {
            type : String
        },
    ],

});

schema_request.pre('save',function (next){
    console.log("saving ...");
    next();
});


const request_list = mongoose.model('schema_request',schema_request);





const connexion_and_deconnexion = new mongoose.Schema({
    date : {
        type : Date,
        default : Date.now,
        required : true,
    },
    name : {
        type : String,
        required : true,
    },

    name_loc : {
        type : String,
        required : true,
    },

    nature : {
        type : String,
        required : true,
    },
});


const connex_table = mongoose.model('connex_table',connexion_and_deconnexion);


const count_number_connexion = new mongoose.Schema({
    date: {
        type: Date,
        default : Date.now,
    },
    
    ip_ : {
        type : String,
        required: true,
        unique : true,
    },

    number_ : {
        type : Number,
        default : 0,
        required : true,
    },
    
});


const count_number_connexion_table = mongoose.model('number_connexion',count_number_connexion);


const registration_schema = new mongoose.Schema({
    token : {
        type : String,
        required : true,
        unique : true,
    },

    Status : {
        type : String,
        default : "unconnected",
        required : true,
    },

    expireAt : {
        type : Date,
        default : new Date(Date.now() + 1800000),
        required : true,
    },

    attempt : {
        type : Number,
        default : 0,
        required : true,
    },

});

const registration = mongoose.model('registration',registration_schema);


const Schema_identification = Joi.object({
    pseudonyme  : Joi.string().alphanum().min(3).max(30).required(),
    identificator : Joi.string().min(8).max(50).required(),
    mail : Joi.string().email({tlds: {allow: ['com','net','fr','org'] }, minDomainSegments: 2}).required(),
});



module.exports = {pupil,id_people,Schema_validation,ip_forbidden, special_people, request_list,connex_table,count_number_connexion_table,registration, Schema_identification};
