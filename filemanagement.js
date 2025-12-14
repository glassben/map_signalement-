const fs = require("node:fs");
const path = require("path");

async function createfile(file_path){
    const dateObj = new Date();
    await fs.writeFile(`./ERROR/${file_path}`,`Date : ${dateObj}  `+ "LOG BEGIN " +"\n","utf8",(err)=>{
        if (err) {
            console.error("Error writing file: ",err);
            return;
        }
    });
};

async function add_to_the_file(file_path,content){
    const dateObj = new Date();
    await fs.appendFile(`./ERROR/${file_path}`,`Date : ${dateObj}  `+ content + "\n","utf8",(err)=>{
        if (err) {
            console.error("Error writing file: ",err);
            return;
        }
    });
};

async function delete_file(file_path){
    await fs.unlink(`./ERROR/${file_path}`, (err)=>{
        if (err){
            console.error("Error deleting file",err);
            return;
        }
    });    
};

async function getFullPath(file_path){
    return `./ERROR/${file_path}`;
}

module.exports = {createfile,add_to_the_file,delete_file,getFullPath};

