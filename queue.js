const async = require("async");
const schedule = require("./schedule");

const scraperQueue = async.queue(async (job) => {
    const {description,localisation,description_precise,photo1,photo2,photo3,author} = job;
    await schedule.schedule(description,localisation,description_precise,photo1,photo2,photo3,author);
},1);

module.exports = {scraperQueue};