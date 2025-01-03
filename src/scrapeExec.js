import {
  dateToScrapeUrl,
  getMarketData,
  storeOneDayData,
  CONF_DB_DATE_TIME,
} from './scraper.js';
import {
  connectToDb,
} from './util.js';
import mongoose from 'mongoose';
/*
  The main part of the script
*/
// const CONF_START_DATE = '2024-10-26';
// const CONF_START_DATE = '2024-03-30';
const CONF_START_DATE = '2025-01-01';
const CONF_PERIOD_IN_DAYS = 3;
// If we do not set the time, the default value 00:00:00 is assumed
// This time is interpreted as local time according to the locale settings
// and translated to UTC when storing the data in the DB.
// This caused a problem when transitioning between CET and CEST.
// Setting the time to 13:00:00 should eliminate this problem.
// See the paragraph starting "When the time zone is absent..."
// at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format


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
