import 'dotenv/config';
import logger from './logger.js';
import {
  connectToDb,
  disconnectFromDb,
  logMessage,
} from './util.js';
import {
  dateToScrapeUrl,
  getMarketDataRetryWrapper,
  storeOneDayData,
  CONF_DB_DATE_TIME,
} from './scraper.js';


/*
  The main part of the script
*/
// const CONF_START_DATE = '2024-10-26';
// const CONF_START_DATE = '2024-03-30';
const CONF_START_DATE = '2025-01-06';
const CONF_PERIOD_IN_DAYS = 2;
// If we do not set the time, the default value 00:00:00 is assumed
// This time is interpreted as local time according to the locale settings
// and translated to UTC when storing the data in the DB.
// This caused a problem when transitioning between CET and CEST.
// Setting the time to 13:00:00 should eliminate this problem.
// See the paragraph starting "When the time zone is absent..."
// at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format


await connectToDb();

// console.log('DB connection state: ', mongoose.connection.readyState);

const scrapeDate = new Date(`${CONF_START_DATE}${CONF_DB_DATE_TIME}`);
// const scrapeDate = dateTomorrow1300();


for (let i = 0; i < CONF_PERIOD_IN_DAYS; i++) {
  logger.debug(`Scrape URL: ${dateToScrapeUrl(scrapeDate)}`);
  try {
    const docExtract = await getMarketDataRetryWrapper(scrapeDate);
    logger.debug('Data scraped, going to save it now');
    // The keyword `await` in the next line is important:
    // if ommitted, the DB connection (few lines below) gets closed earlier
    // than the data get saved. When the async job scheduled "for later" (and
    // not "waited for") gets called/carried out/scheduled, it will throw an
    // error because the DB connection is closed by that time.
    await storeOneDayData(scrapeDate, docExtract);
  }
  catch (err) {
    logger.error(err.message);
  }
  scrapeDate.setDate(scrapeDate.getDate() + 1);
}

await disconnectFromDb();

/**
 * @todo The following log statement does not appear in the log. Probably
 * because the DB connection has been closed on the previous line and
 * it has an effect on the logger.
 */
logger.info(logMessage.scrapeExecFinished);
