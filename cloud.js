const cloudinary = require('cloudinary').v2;
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

async function upload_cloud(buffer){
    try {
        const result = await cloudinary.uploader.upload(buffer);
        console.log(result.secure_url);
        return result.secure_url;
    } catch (error){
        console.log(error);
    }
};

module.exports = {upload_cloud};

