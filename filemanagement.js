const fs = require("node:fs");
const path = require("path");

function createfile(file_path){
    const dateObj = new Date();
    fs.writeFileSync(`./ERROR/${file_path}`,`Date : ${dateObj}  `+ "LOG BEGIN " +"\n","utf8",(err)=>{
        if (err) {
            console.error("Error writing file: ",err);
            return;
        }
    });
};

function add_to_the_file(file_path,content){
    const dateObj = new Date();
    fs.appendFileSync(`./ERROR/${file_path}`,`Date : ${dateObj}  `+ content + "\n","utf8",(err)=>{
        if (err) {
            console.error("Error writing file: ",err);
            return;
        }
    });
};

function delete_file(file_path){
    fs.unlinkSync(`./ERROR/${file_path}`, (err)=>{
        if (err){
            console.error("Error deleting file",err);
            return;
        }
    });    
};

function getFullPath(file_path){
    return `./ERROR/${file_path}`;
}

function SafeFilePath(file){
    
    if (!file){
        return undefined;
    }
    const UPLOAD_DIR = path.join(__dirname, 'tmp/');

    let fullpath = path.resolve(UPLOAD_DIR,'44_'+file.originalname);

    if (!fullpath.startsWith(UPLOAD_DIR)){
        throw new Error("invalid file path");
    }

    return fullpath;
}




module.exports = {createfile,add_to_the_file,delete_file,getFullPath,SafeFilePath};

