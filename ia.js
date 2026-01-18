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
                    content: `Peux-tu me réécrire la phrase suivante décrivant un problème de voirie en une seule phrase en ne prenant compte que des informations que je t'ai données pour pouvoir être traitée efficacement par les autorités compétentes, la phrase est : ${text}  ? \n` +
                    " Si une erreur ou un disfonctionnement intervient ou tu n'arrives pas à construire la phrase, retournes : Impossible d'exécuter la demande \n"+
                    "Pour t'aider voici deux exemples de phrase est leurs réecritures : \n" +
                    " Phrase initiale : Graffiti noir 'Free Gaza' rue Condorcet  \n" +
                    " Réecriture : Un graffiti noir 'Free Gaza' présent sur la rue Condorcet, nécessité d'intervention immediate \n"+
                    " Phrase initiale : tag sur le pont d'Oxford, tag 'Death to the IDF' inscrit au début du pont \n "+
                    " Réécriture : Tag situé sur le pont d'Oxford présentant la mention antisémite 'Death to the IDF' et inscrit au début du pont nécessitant une intervention urgente \n",
                },
            ],
        });

        return response.choices[0].message.content;

    }catch (err){
        console.error(err.message);
        return "Impossible d'exécuter la demande";
    }
};









module.exports = {connect};


