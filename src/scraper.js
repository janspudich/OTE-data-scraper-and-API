/**
 * @file Defines the Data Scraper Module (DSM).
 * @module DSM
 * @author Jan Spudich <jan.spudich@origimi.com>
 */
import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
// Formerly used data model, replaced by the oteOneDay data model
// import oteOneHourDataModel from './datamodel/oneHourData.js';
import {oteOneDay as oteOneDayDataModel} from './datamodel/oneDayData.js';
import {
  dateToDateStr,
  oteUrlBase,
} from './util.js';

const retryPeriod = 15*60*1000; // 15 mnts
const retryCount = 20; // 20 retries @ 15 mnts each -> 5 hrs

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
 * Repeatedly calls {@link getMarketData} until {@link getMarketData}
 * returns market data.
 * @param {string} url URL of the OTE page to retrieve the market data from
 */
export async function getMarketDataRetryWrapper(url) {
  for (let i = 0; i<retryCount; i++) {
    let rows;
    try {
      rows = await getMarketData(url);
    }
    catch (err) {
      rows = [];
      /** @todo Log the error in DB */
    }
    if ((rows.length < 23) || (rows.length > 25)) {
      /* We assume that something went wrong during the data scraping process
         if we do not get the expected number of rows */
      await new Promise((resolve) => setTimeout(resolve, retryPeriod));
      // console.log(`Retry ${i}`);
    }
    else {
      return rows;
    }
  }
  throw (new Error('Max retries reached'));
}

/**
 * Store the data passed in as parameters in DB.
 * @function storeOneDayData
 * @param {Date} date The date for which data has been scraped.
 * @param {Array<Array.Number>} oneDayData The data for a single day organized
 * as two dimensional array
 */
export async function storeOneDayData(date, oneDayData) {
  const newNode = oteOneDayDataModel({
    date: date,
    marketData: oneDayData,
  });
  await newNode.save();
}


/**
 * Convert a date to the OTE URL where data for the date are available.
 * @param {Date} date A date for which the OTE URL is desired.
 * @returns {string} An OTE URL where data for the date are avilable.
 */
export function dateToScrapeUrl(date) {
  const scrapeDateStr = dateToDateStr(date);
  return `${oteUrlBase}${scrapeDateStr}`;
}

export const CONF_DB_DATE_TIME = 'T13:00:00';
