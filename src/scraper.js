// myStuff-BE main file
// created by jan.spudich@origimi.com on 14-Sep-2022

import mongoose from 'mongoose';
import 'dotenv/config';
import util from 'util';
import axios from 'axios';
import * as cheerio from 'cheerio';

import oteOneHourDataModel from './datamodel/oneHourData.js';
import oteOneDayDataModel from './datamodel/oneDayData.js';
import { dateToDateStr, mongoUrl, oteUrlBase } from './util.js';






/**
 * Loads the the HTML document determined by th input parameter, retrieves the market
 * data from the document and returns the data as JSON value
 * @function getMarketData
 * @param {string} url URL of the OTE page to retrieve the market data from
 */
async function getMarketData(url) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const marketDataTable = $('.report_table tbody').eq(1); // there are two tables with this class

    // Extract table data
    const rows = [];
    marketDataTable.find('tr').each((i, row) => {
        let cells = [i];
        const hourColumnInTheRow = parseInt($(row).find('th').text(), 10);
        if(i < 25) {
            if(!isNaN(hourColumnInTheRow) && (hourColumnInTheRow == (i+1))) {
                //console.log
                $(row).find('td').each((j, cell) => {
                    const value = parseFloat($(cell).text().trim().replace(/\s/g, '').replace(/,/, '.'));
                    cells.push(isNaN(value) ? null : value);
                });
                rows.push(cells);
            }
            else {
 //               console.log(`No data to scrape in the row ${i}, zero-based.`);
            }
        }
    });
    console.log(`Rows scraped: ${rows.length}`);
    return rows;
}

async function connectToDb() {
    console.log(`Connecting to DB at ${process.env.OTE_MONGO_IP}`);
    try {
        await mongoose.connect(mongoUrl);
        console.log(`Successfully connected to DB.`);
    }
    catch(err) {
        console.log(`Error while connecting to DB.`);
        console.log(
            util.inspect(err, false, null, true), // The fourth param is to enable colors
        );
    };
}


async function storeOneDayData(date, oneDayData) {
    try {
        const newNode = oteOneDayDataModel({
            date: date,
            marketData: oneDayData,
        });
        await newNode.save();
    }
    catch(err) {
        console.log('Error writing data to DB: ', err.errorResponse);
    }
}

async function readOneDayData(date) {
    const oneDayData = await oteOneDayDataModel.
          find(
              {
                  date: date,
              },
          ).
          select('marketData').
          exec();
    let retVal = [];
    oneDayData[0].marketData.forEach((hour) => {
        retVal.push(hour);
    });
    return retVal;
}

function dateToScrapeUrl(date){
    const scrapeDateStr = dateToDateStr(date);
    return `${oteUrlBase}${scrapeDateStr}`;
}

/*
  The main part of the script
*/
// const CONF_START_DATE = '2024-10-26';
// const CONF_START_DATE = '2024-03-30';
const CONF_START_DATE = '2020-12-31';
const CONF_PERIOD_IN_DAYS = 1;
// If we do not set the time, the default value 00:00:00 is assumed
// This time is interpreted as local time according to the locale settings
// and translated to UTC when storing the data in the DB.
// This caused a problem when transitioning between CET and CEST.
// Setting the time to 13:00:00 should eliminate this problem.
// See the paragraph starting "When the time zone is absent..."
// at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format
const CONF_DB_DATE_TIME = 'T13:00:00';

await connectToDb();
let scrapeDate = new Date(`${CONF_START_DATE}${CONF_DB_DATE_TIME}`);
for (let i=0; i<CONF_PERIOD_IN_DAYS; i++){
    console.log('Scrape URL: ', dateToScrapeUrl(scrapeDate));
    const docExtract = await getMarketData(dateToScrapeUrl(scrapeDate));
//    console.log('Scraped data: ', docExtract);
    await storeOneDayData(scrapeDate, docExtract);    
    scrapeDate.setDate(scrapeDate.getDate() + 1);
}
await mongoose.connection.close();

console.log('Job done');
