/**
 * @file Defines utilities used in [the Data Scraper Module (DSM)]{@link
 * module:DSM} and [the OTE API Module (OAM)]{@link module:OAM} modules.
 * @module OAM&DSM utilities
 * @author Jan Spudich <jan.spudich@origimi.com>
 */
import mongoose from 'mongoose';
import logger from './logger.js';

export const mongoUrl = `${process.env.OTE_MONGO_SCHEMA}://${process.env.OTE_MONGO_USER}:${process.env.OTE_MONGO_PASSW}@${process.env.OTE_MONGO_IP}:${process.env.OTE_MONGO_PORT}/${process.env.OTE_MONGO_DB_NAME}`;

export const oteUrlBase = 'https://www.ote-cr.cz/cs/kratkodobe-trhy/elektrina/denni-trh?date=';

export const dateToDateStr = function(date) {
  const month = date.getMonth() + 1;
  const monthStr = (month < 10) ? `0${month}` : `${month}`;

  const day = date.getDate();
  const dayStr = (day < 10) ? `0${day}` : `${day}`;

  return `${date.getFullYear()}-${monthStr}-${dayStr}`;
};

export const dateDiff = function(dateStart, dateEnd) {
  // https://stackoverflow.com/a/3224854
  const diffTime = Math.abs(dateStart - dateEnd);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Create a connection to a MongoDB database.
 */
export async function connectToDb() {
  logger.info(logMessage.dbConnecting(
    process.env.OTE_MONGO_IP,
    process.env.OTE_MONGO_PORT,
    process.env.OTE_MONGO_DB_NAME,
  ));
  try {
    await mongoose.connect(mongoUrl);
    logger.info(logMessage.dbConnected(
      process.env.OTE_MONGO_IP,
      process.env.OTE_MONGO_PORT,
      process.env.OTE_MONGO_DB_NAME,
    ));
  }
  catch (err) {
    logger.error(err.message);
  }
}

/**
 *  Disconnects from a MongoDB database and logs the information.
 */
export async function disconnectFromDb() {
  await mongoose.connection.close();
  logger.info(logMessage.dbConnClosed);
}

export const logMessage = {
  serverStart: (port) => `The OTE server has started, listening on the port ${port}.`,
  serverSignal: (signal) => `The OTE server has received the ${signal} signal, shutting down.`,
  serverHttpClosed: 'The HTTP server has been closed.',
  dbConnecting: (dbIp, dbPort, dbName) => `Connecting to MongoDB: ${dbIp}:${dbPort}/${dbName}...`,
  dbConnected: (dbIp, dbPort, dbName) => `Successfully connected to MongoDB: ${dbIp}:${dbPort}/${dbName}`,
  dbConnClosed: `The connection to MongoDB has been closed.`,
  goodBye: `Good bye`,
  // The following message is not used, we log the Error::message instead.
  dbConnError: (dbIp) => `Error while connecting to MongoDB at ${dbIp}.`,
  apiKeyNotFound: (reqIp, reqKey) => `The API key ${reqKey} received from ${reqIp} not found in the DB - the call is not authorized.`,
  apiKeyFound: (reqIp) => `The API key received from ${reqIp} found in the DB - the call is authorized.`,
  apiKeyMissing: (reqIp) => `The API key is missing in the request from ${reqIp} - the call is not authorized.`,
  apiKeyReceived: (reqKey, hexDigest) => `The request API key: ${reqKey}, its HEX digest is ${hexDigest}.`,
  apiMethod: {
    marketData: {
      reqParams: (startDate, endDate) => `GET /marketData params: startDate=${startDate}, endDate=${endDate}`,
      notFound: (startDate, endDate) => `GET /marketData did not find any data for the input parameters startDate=${startDate}, endDate=${endDate}`,
    },
  },
  noDataToScrape: (row) => `No data to scrape in the row ${row}, zero-based.`,
  rowsScraped: (rows) => `Rows scraped: ${rows}.`,
  scrapeError: 'The number of rows scraped is either lower than 23 or greater than 25.',
  scrapeExecFinished: 'The scraper utility has finished its job.',
  scrapeRetryError: (rtrCnt, scrDate) => `Max retries (${rtrCnt}) reached for the scrape date ${scrDate}.`,
};

export const respMessage = {
  authHeaderMissing: 'Authorization header missing',
  authHeaderDoesNotMatch: 'The API key used in the request is not authorized.',
  serverId: 'OTE API Module (OAM), v0.0.1',
  notFound: 'Not found',
  serverError: 'Server unknown error',
};

