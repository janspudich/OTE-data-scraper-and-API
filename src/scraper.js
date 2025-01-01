/**
 * @file Defines the Data Scraper Module (DSM).
 * @module DSM
 * @author Jan Spudich <jan.spudich@origimi.com>
 */
import mongoose from 'mongoose';
import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
// Formerly used data model, replaced by the oteOneDay data model
// import oteOneHourDataModel from './datamodel/oneHourData.js';
import {oteOneDay as oteOneDayDataModel} from './datamodel/oneDayData.js';
import {dateToDateStr, oteUrlBase, connectToDb} from './util.js';


/**
 * Loads the the HTML document determined by th input parameter, retrieves
 * the market data from the document and returns the data as JSON value
 * @function getMarketData
 * @param {string} url URL of the OTE page to retrieve the market data from
 * @returns {Array<Array.Number>} The data for a single day organized as
 * 2D array of Number
 */
async function getMarketData(url) {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  // There are two tables of the class 'report_table', select the second one
  const marketDataTable = $('.report_table tbody').eq(1);

  // Extract table data
  const rows = [];
  marketDataTable.find('tr').each((i, row) => {
    const cells = [i];
    const hourColumnInTheRow = parseInt($(row).find('th').text(), 10);
    if (i < 25) {
      if (!isNaN(hourColumnInTheRow) && (hourColumnInTheRow == (i + 1))) {
        // console.log
        $(row).find('td').each((j, cell) => {
          const strFromWeb = $(cell).text().trim();
          const floatString = strFromWeb.replace(/\s/g, '').replace(/,/, '.');
          const value = parseFloat(floatString);
          cells.push(isNaN(value) ? null : value);
        });
        rows.push(cells);
      }
      else {
        // console.log(`No data to scrape in the row ${i}, zero-based.`);
      }
    }
  });
  console.log(`Rows scraped: ${rows.length}`);
  return rows;
}


/**
 * Store the data passed in as parameters in DB.
 * @function storeOneDayData
 * @param {Date} date The date for which data has been scraped.
 * @param {Array<Array.Number>} oneDayData The data for a single day organized
 * as two dimensional array
 */
async function storeOneDayData(date, oneDayData) {
  try {
    const newNode = oteOneDayDataModel({
      date: date,
      marketData: oneDayData,
    });
    await newNode.save();
  }
  catch (err) {
    console.log('Error writing data to DB: ', err.errorResponse);
  }
}


/**
 * Convert a date to the OTE URL where data for the date are available.
 * @param {Date} date A date for which the OTE URL is desired.
 * @returns {string} An OTE URL where data for the date are avilable.
 */
function dateToScrapeUrl(date) {
  const scrapeDateStr = dateToDateStr(date);
  return `${oteUrlBase}${scrapeDateStr}`;
}

/*
  The main part of the script
*/
// const CONF_START_DATE = '2024-10-26';
// const CONF_START_DATE = '2024-03-30';
const CONF_START_DATE = '2024-12-31';
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

const scrapeDate = new Date(`${CONF_START_DATE}${CONF_DB_DATE_TIME}`);
for (let i = 0; i < CONF_PERIOD_IN_DAYS; i++) {
  console.log('Scrape URL: ', dateToScrapeUrl(scrapeDate));
  const docExtract = await getMarketData(dateToScrapeUrl(scrapeDate));
  //    console.log('Scraped data: ', docExtract);
  await storeOneDayData(scrapeDate, docExtract);
  scrapeDate.setDate(scrapeDate.getDate() + 1);
}
await mongoose.connection.close();

console.log('Job done');
