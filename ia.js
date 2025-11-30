const mygroq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config()


const connect = async (text)=>{
    try{
        const groq_connect = new mygroq.Groq({
          apiKey: process.env.GROQ
        
        });

        const response = await groq_connect.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages:[
                {
                    role : 'user',
                    content: `Peux-tu me réécrire la phrase suivante décrivant un problème de voirie en une seule phrase en ne prenant compte que des informations que je t'ai données pour pouvoir être traitée efficacement par les autorités compétentes, la phrase est : ${text}  ?`,
                },
            ],
        });

        return response.choices[0].message.content;

    }catch (err){
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = {connect};


