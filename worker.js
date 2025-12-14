const {Builder,By,Key,until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const ia = require("./ia");
const filemanag = require("./filemanagement");
const mailmanag = require("./send_mail");
const dotenv = require('dotenv');
const fs = require("fs");
const path = require("path");
dotenv.config();

async function scraper(description,localisation,description_precise,photo1,photo2,photo3,mail){

    const path = `${mail}_issue_.txt`;
    await filemanag.createfile(path);

    const options = new chrome.Options();

    options.setChromeBinaryPath(process.env.CHROME_BIN);
    options.addArguments('--headless');
    options.addArguments("--disable-gpu");
    options.addArguments("--no-sandbox");
    options.addArguments('--disable-dev-shm-usage');
    
    //const driver = new Builder().forBrowser('chrome').setChromeOptions(options).build();
    //let service = new chrome.ServiceBuilder().setPort(46653).build();
    
    //let service = new chrome.ServiceBuilder(process.env.CHROMEDRIVER_PATH).setPort(46653).build();
    
    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    await filemanag.add_to_the_file(path,"-------- Driver initialisé ------------------");

    description = ia.connect(description);

    await filemanag.add_to_the_file(path,"----------- Description IA Ok-----------------");

    description_precise = ia.connect(description + " " +description_precise);

    await filemanag.add_to_the_file(path, "--------- Description precise IA OK --------------- ");

    try {
        await driver.get("https://demarches.grenoble.iziici.fr/grc-peps/signaler-dysfonctionnement-sur-espace-public/");

        filemanag.add_to_the_file(path, "---------- Connexion OK -----------");
    
        let element=driver.findElement(By.id("f132_op_0"));
        driver.executeScript("arguments[0].click();",element);

        console.log("Qualification du probleme OK");
    
        await filemanag.add_to_the_file(path,"---- Qualification du probleme OK ------");

        let file_input = driver.findElement(By.id("form_f155")).sendKeys(Key.TAB);
        file_input = driver.findElement(By.id("form_f155")).clear();
        file_input = driver.findElement(By.id("form_f155")).sendKeys(description);

        console.log("Dysfonctionnement OK");

        await filemanag.add_to_the_file(path,"------ Dysfonctionnement OK ----------")

        let selection_adresse=driver.findElement(By.xpath("/html/body/div/main/div/div/div[2]/div/div/div/div[3]/form/div[8]/div[2]/label/input"));
        driver.executeScript("arguments[0].click();",selection_adresse);

        await filemanag.add_to_the_file(path,"----------- demande de saisi manuel de l'adresse  OK ------")

        const timeout = 10000;

        let select2Container = await driver.wait(
            until.elementLocated(By.css('span.select2-selection[aria-labelledby="select2-form_f151-container"]')),
            timeout
        )

        await driver.wait(until.elementIsVisible(select2Container), timeout);
        await driver.wait(until.elementIsEnabled(select2Container), timeout);

        await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", select2Container);

        await new Promise(resolve => setTimeout(resolve, 500));

        await select2Container.click();

        filemanag.add_to_the_file(path,"--------- Selection Encoche OK ----------");

        let search_box= await driver.wait(
            until.elementLocated(By.css(".select2-search__field")),
            timeout
        );


        search_box.sendKeys(localisation);

        filemanag.add_to_the_file(path,"---------Completion OK -----------------");

        await new Promise(resolve => setTimeout(resolve, 2000));

        let selection = await driver.findElement(By.xpath("//ul[@id='select2-form_f151-results']/li"));
        
        const html =await selection.getAttribute('outerHTML');

        await new Promise(resolve => setTimeout(resolve, 500));

        await selection.click();



        await new Promise(resolve => setTimeout(resolve, 500));
        

        await filemanag.add_to_the_file(path,"---------- Validation Choix OK -----");
        

        let description_p =await driver.findElement(By.id("form_f177"));
        await description_p.sendKeys(description_precise);

        await filemanag.add_to_the_file(path,"---------- Precision OK ---------");

        if (photo1 != undefined){

            await new Promise(resolve => setTimeout(resolve, 500));

            let photo1_= await driver.findElement(By.id("form_f50"));
            await photo1_.sendKeys(photo1);

            await filemanag.add_to_the_file(path,"------------Ajout Photo 1 OK ------");

        }

        if (photo2!= undefined){

            await new Promise(resolve => setTimeout(resolve, 500));
            let photo2_= await driver.findElement(By.id("form_f52"));
            await photo2_.sendKeys(photo2);
            await filemanag.add_to_the_file(path,"------------Ajout Photo 2 OK ------");
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (photo3!= undefined){

            await new Promise(resolve => setTimeout(resolve, 500));

            let photo3_= await driver.findElement(By.id("form_f7d84ab12-8f89-4ac8-ac29-9f81c0a43353"));
            await photo3_.sendKeys(photo3);

            await filemanag.add_to_the_file(path,"------------Ajout Photo 3 OK ------");

        }

       

        await new Promise(resolve => setTimeout(resolve, 1000));

        /* let submit = await driver.wait(
            until.elementLocated(By.xpath("//div[@id='rub_service']/form/div[16]/div[1]/div/button"))
        ) */

        let submit = await driver.wait(
            until.elementLocated(By.name("submit"))
        )

        await new Promise(resolve => setTimeout(resolve, 500));
        
        const html2 =await submit.getAttribute('outerHTML');

        await driver.executeScript("arguments[0].click();",submit);

        await filemanag.add_to_the_file(path,"------------ Submit OK ------");


        await new Promise(resolve => setTimeout(resolve, 3000));

        let yes_button = await driver.findElement(By.id("f166_op_0"));
        await driver.executeScript("arguments[0].click();",yes_button);


        await filemanag.add_to_the_file(path,"------------ Personal Information Button OK------");


        await new Promise(resolve => setTimeout(resolve, 1000));

        let email = await driver.findElement(By.id("form_f185"));
        await email.sendKeys(mail);

        await filemanag.add_to_the_file(path,"--------- MAIL OK ------- ");

        await new Promise(resolve => setTimeout(resolve, 1000));

        let checkbox_condition = await driver.findElement(By.id("form_fdab017b1-bf70-4c56-86d0-6fde5b6def9e"));
        await driver.executeScript("arguments[0].click();",checkbox_condition);


        await filemanag.add_to_the_file(path, "-------- condition checkbox OK -----");

        await new Promise(resolve => setTimeout(resolve, 1000));

        let submit2 = await driver.findElement(By.name("submit"));
        await driver.executeScript("arguments[0].click();",submit2);

        await filemanag.add_to_the_file(path, "-------- Submit OK  -----");

        await new Promise(resolve => setTimeout(resolve, 100));

        await filemanag.delete_file(path);

        return true;



    } catch(error){
        console.log(error);

        let screenshot = await driver.takeScreenshot();

        
        fs.writeFileSync(path.join("./ERROR",'screenshot.png'),screenshot,'base64');

        await mailmanag.send_mail('screenshot','here is the screenshot','screenshot.png',process.env.FROMMAIL)
        
        await filemanag.add_to_the_file(path, `Une erreur a eu lieu \n ${error}`);
        await mailmanag.send_mail(`${mail}_erreur_execution`,"Voici ci-joint le contenu du LOG de l'exécution \n",path,process.env.FROMMAIL);
        await mailmanag.send_mail(`${mail}_erreur_execution`,"Voici ci-joint le contenu du LOG de l'exécution \n",path,mail);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await filemanag.delete_file(path);

        return false;

    } finally{
        await driver.quit(); 
    }
    


};


module.exports = {scraper};


