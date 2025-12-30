const connection = require('./connect.js');
const scrap = require("./worker.js");
const crypto = require("crypto");
const fs = require("fs");
const cloud = require("./cloud.js");



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

    let potential_url =[]

    if (status.includes(true)){
        
        if (photo1){
            const result_1 = await cloud.upload_cloud(photo1);
            potential_url.push(result_1);
        }
    
        if (photo2){
            const result_2 = await cloud.upload_cloud(photo2);
            potential_url.push(result_2);
        }
    
        if (photo3){
            const result_3 = await cloud.upload_cloud(photo3);
            potential_url.push(result_3);
        }
    }
    


    const new_request = new connection.request_list({author,localisation,status,potential_url});

    console.log(`the following new request : ${new_request}`);

    try {
        await new_request.save();
    } catch (error){
        console.log(error);
    }

    console.log("Save OK");

    delete_file(photo1,photo2,photo3);


    return status;
    
};

function delete_file(photo1,photo2,photo3){
    
    if (photo1!=undefined){
        fs.unlinkSync(photo1, (err) => {
            if (err) console.error('Error deleting file:', err);
            else console.log('Temporary file deleted.');
        });
    }
    
    if (photo2!=undefined){
        fs.unlinkSync(photo2, (err) => {
            if (err) console.error('Error deleting file:', err);
            else console.log('Temporary file deleted.');
        });
    } 

    if (photo3!=undefined){
        fs.unlinkSync(photo3, (err) => {
            if (err) console.error('Error deleting file:', err);
            else console.log('Temporary file deleted.');
        });
    } 
}



module.exports ={schedule};
