const async = require("async");
const schedule = require("./schedule");

const scraperQueue = async.queue(async (job) => {
    const {description,localisation,description_precise,path_image1,path_image2,path_image3,username_} = job;
    await schedule.schedule(description,localisation,description_precise,path_image1,path_image2,path_image3,username_);
    
},1);

module.exports = {scraperQueue};