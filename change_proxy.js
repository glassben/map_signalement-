const {Builder,By} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const crypto = require("crypto");



async function change_proxy(driver){
    driver.get("https://sslproxies.org/");


    const tbody = driver.findElement(By.xpath('//section[@id="list"]/div/div[2]/div/table/tbody'));
    const trElements = await tbody.findElements(By.css('tr'));
    const list_api=[];
    for (const tr of trElements){
        const tds = await tr.findElements(By.css('td'));
        const code = await tds[2].getText();
        if (code == "US"){
            const text1= await tds[0].getText();
            const text2= await tds[1].getText();
            list_api.push(text1+':'+text2);
        }
    }

    console.log(list_api)
    return list_api;
}

async function test(){
    const options = new chrome.Options();
    //options.addArguments('--headless');
    options.addArguments("--disable-gpu");
    options.addArguments("--no-sandbox");

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    const list_api =await change_proxy(driver);

    if (list_api.length !=0){

        const index = crypto.randomInt(0,list_api.length-1);

        console.log("\n")

        console.log(list_api[index]);

        await options.addArguments(`--proxy-server=${list_api[0]}`);
        
        await new Promise(resolve => setTimeout(resolve, 5000));

        const driver2 = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

        await driver2.get("https://demarches.grenoble.iziici.fr/grc-peps/signaler-dysfonctionnement-sur-espace-public/");

    }

    

}

test();


