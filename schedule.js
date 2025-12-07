const connection = require('./connect.js');
const scrap = require("./worker.js");
const crypto = require("crypto");
const fs = require("fs");




async function schedule(description,localisation,description_precise,photo1,photo2,photo3,author) {
    
    
    let status =[];

    const all_pupil = await connection.pupil.find().cursor();

    


    try{
        for (let x = await all_pupil.next();x!=null;x = await all_pupil.next()){
            
            console.log(x);
            
            let value_status = await scrap.scraper(description,localisation,description_precise,photo1,photo2,photo3,x.title)
            
            console.log(value_status);
            
            status.push(value_status);
            
            const time = crypto.randomInt(3000,20000);
            
            await new Promise(resolve => setTimeout(resolve, time));
            
            console.log("\n");
            console.log("\n");
        }
    } catch (error){

        console.log(error);

        const new_request = connection.request_list({initiated: author,location:localisation,accepted:status});
        await new_request.save();

        delete_file(photo1,photo2,photo3);
        return;
    }

    delete_file(photo1,photo2,photo3);

    const new_request = connection.request_list({initiated: author,location:localisation,accepted:status});
    await new_request.save();
    
    return status;
    
};

async function delete_file(photo1,photo2,photo3){
    if (photo1!=undefined){
        fs.unlink(photo1, (err) => {
            if (err) console.error('Error deleting file:', err);
            else console.log('Temporary file deleted.');
        });
    }
    
    if (photo2!=undefined){
        fs.unlink(photo2, (err) => {
            if (err) console.error('Error deleting file:', err);
            else console.log('Temporary file deleted.');
        });
    } 

    if (photo3!=undefined){
        fs.unlink(photo3, (err) => {
            if (err) console.error('Error deleting file:', err);
            else console.log('Temporary file deleted.');
        });
    } 
}



module.exports ={schedule};
