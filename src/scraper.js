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
  logMessage,
} from './util.js';
import mongoose from 'mongoose';
import logger from './logger.js';

const retryPeriod = 10*60*1000; // 10 mnts
const retryCount = 30; // 30 retries @ 10 mnts each -> 5 hrs

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
        $(row).find('td').each((j, cell) => {
          const strFromWeb = $(cell).text().trim();
          const floatString = strFromWeb.replace(/\s/g, '').replace(/,/, '.');
          const value = parseFloat(floatString);
          cells.push(isNaN(value) ? null : value);
        });
        rows.push(cells);
      }
      else {
        logger.warn(logMessage.noDataToScrape(i));
      }
    }
  });
  logger.info(logMessage.rowsScraped(rows.length));
  return rows;
}

const oteScraperErrorName = 'OteScrapeError';

/**
 * @class Error OteScrapeError
 * @classdesc Error sub-class indication an error while scraping data from the
 * OTE webiste.
 */
class OteScrapeError extends Error {
  /**
   * @param {string} message Error message
   */
  constructor(message) {
    super(message);
    this.name = oteScraperErrorName;
  }
}

/**
 * Repeatedly calls {@link getMarketData} until either {@link getMarketData}
 * returns market data or maximum re-tries have been reached. In the first case
 * the function returns the market data scraped, in the later case the function
 * does not return a value and throws an error instead.
 * @param {Date} scrapeDate A date to scrape the OTE market data for.
 * @returns {Array<Array.Number>} The data for a single day organized as 2D
 * array of Number.
 */
export async function getMarketDataRetryWrapper(scrapeDate) {
  for (let i = 0; i<retryCount; i++) {
    let rows;
    try {
      rows = await getMarketData(dateToScrapeUrl(scrapeDate));
    }
    catch (err) {
      rows = [];
      /** @todo Log the error in DB */
      logger.error(err.message);
    }
    if ((rows.length < 23) || (rows.length > 25)) {
      /* We assume that something went wrong during the data scraping process
         if we do not get the expected number of rows */
      /** @todo Log the error in DB */
      logger.error(logMessage.scrapeError);
      await new Promise((resolve) => setTimeout(resolve, retryPeriod));
    }
    else {
      return rows;
    }
  }
  throw (new OteScrapeError(
    logMessage.scrapeRetryError(retryCount, dateToDateStr(scrapeDate)))
  );
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
  logger.debug('Mongoose document created, going to save it now');
  logger.debug(`DB connection state: ${mongoose.connection.readyState}.`);
  await newNode.save();
  logger.debug('Mongoose document saved');
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

/**
 * Creates an instance of `Date` where
 * - the date part carries a date of tomorrow with respect to the moment when
 * this function gets called
 * - the time part is set to 13:00:00
 * @returns {Date} Tomorrow's date, 13:00
 */
export function dateTomorrow1300() {
  const dateToday = new Date(Date.now());
  const dateTomorrow = new Date();
  dateTomorrow.setDate(dateToday.getDate() + 1);
  dateTomorrow.setHours(13, 0, 0, 0);
  logger.debug(`dateToday: ${dateToday} \ndateTomorrow: ${dateTomorrow}`);
  return dateTomorrow;
}
