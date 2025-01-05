/**
 * @file Defines the OTE API Module (OAM).
 * @module OAM
 * @author Jan Spudich <jan.spudich@origimi.com>
 */

import 'dotenv/config';
import cors from 'cors';
import http from 'node:http';
// The use of util.inspect is commented out but left in the code for edu
// purposes. Thus the following import is left in the code.
// import util from 'util';
import express from 'express';
import crypto from 'crypto';
import cron from 'node-cron';
import logger from './logger.js';
import {
  oteOneDay as oteOneDayDataModel,
  oteApiKey,
} from './datamodel/oneDayData.js';
import {
  dateToDateStr,
  connectToDb,
  disconnectFromDb,
  dateDiff,
  logMessage,
  respMessage,
} from './util.js';
import {
  getMarketDataRetryWrapper,
  storeOneDayData,
  dateTomorrow1300,
} from './scraper.js';


// const CONF_START_DATE = '2024-12-18';
// const scrapeDate = new Date(`${CONF_START_DATE}${CONF_DB_DATE_TIME}`);

const cronExpr = {
  dailyAt1200: '0 12 * * *',
  dailyAt1300: '0 13 * * *',
  dailyAt1400: '0 14 * * *',
  everyMinute: '* * * * *',
};

let httpServer;

/**
 * Attempts to retrieve an authorization header from the request object.
 * If the authorization header is not found, it sends an HTTP response,
 * the code 401. Otherwise it retrieves an authorization token from the header,
 * hashes the token using the app secret and searches the hashed image of the
 * received token in the DB. If not found, it sends an HTTP response, the code
 * 401. Otherwise the call is considered to be authorized and the middleware
 * passes the execution on to the next Express middleware, one of the API
 * methods.
 * @function emwAuth
 * @param {} req The Express Request object
 * @param {} res The Express Response object
 * @param {} next The Express Next function
 */
const emwAuth = (req, res, next) => {
  const findKeyInDb = async (hashedKey, receivedApiKey) => {
    try {
      const keyFound = await oteApiKey.findOne({hashedKey}).exec();

      if (keyFound === null) {
        logger.info(logMessage.apiKeyNotFound(req.ip, receivedApiKey));
        res.status(401).json({msg: respMessage.authHeaderDoesNotMatch});
      }
      else {
        logger.info(logMessage.apiKeyFound(req.ip));
        next();
      }
    }
    catch (err) {
      next(err);
    }
  };

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/Bearer (.+)/);
  if (!match) {
    // const errMsg = 'Authorization header missing';
    logger.info(logMessage.apiKeyMissing(req.ip));
    res.status(401).json({msg: respMessage.authHeaderMissing});
  }
  else {
    const receivedApiKey = match[1];
    const hexDigest = crypto
        .createHmac('sha256', process.env.OTE_HASH_KEY)
        .update(receivedApiKey)
        .digest('hex');
    logger.debug(logMessage.apiKeyReceived(receivedApiKey, hexDigest));
    findKeyInDb(hexDigest, receivedApiKey);
  }
};

/**
 * The Express middleware function which implements the `GET /dateDiff`
 * API method.
 * @function emwDateDiff
 * @param {} req The Express Request object
 * @param {} res The Express Response object
 */
const emwDateDiff = (req, res) => {
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);
  res.status(200).json({
    startDate: dateToDateStr(startDate),
    endDate: dateToDateStr(endDate),
    duration: dateDiff(startDate, endDate),
  });
};

/**
 * The Express middleware function which implements the `GET /coverage`
 * API method.
 * @function emwCoverage
 * @param {} _req The Express Request object
 * @param {} res The Express Response object
 */
const emwCoverage = (_req, res) => {
  // async function getTheFirstLastDate(order = 1) {
  const getTheFirstLastDate = async (order = 1) => {
    try {
      const recordFound = await oteOneDayDataModel.
          findOne().
          sort({date: order}).
          limit(1).
          exec();
      return recordFound.date;
    }
    catch (err) {
      logger.error(err.message);
    }
  };

  // async function coverage() {
  const coverage = async () => {
    const theFirstDate = await getTheFirstLastDate();
    const theLastDate = await getTheFirstLastDate(-1);
    // https://stackoverflow.com/a/3224854
    const duration = dateDiff(theFirstDate, theLastDate) + 1;
    const coverage = await oteOneDayDataModel.countDocuments();
    res.status(200).json({
      startDate: dateToDateStr(theFirstDate),
      endDate: dateToDateStr(theLastDate),
      duration,
      coverage,
      gap: duration - coverage,
    });
  };

  coverage();
};

/**
 * The Express middleware function which implements the `GET /marketData`
 * API method.
 * @function emwMarketData
 * @param {} req The Express Request object
 * @param {} res The Express Response object
 */
const emwMarketData = (req, res) => {
  const readMarketData = async () => {
    // async function readMarketData() {
    let queryObj;
    const startDate = new Date(req.query.startDate);
    logger.debug(logMessage.apiMethod.marketData.reqParams(
      req.query.startDate,
      req.query.endDate,
    ));
    if (req.query.endDate) {
      // date range
      const endDate = new Date(`${req.query.endDate}T21:59:59`);
      queryObj = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    else {
      // single date
      const endDate = new Date(`${req.query.startDate}T21:59:59`);
      queryObj = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    logger.debug({msg: 'queryObj value', ...queryObj});
    const marketData = await oteOneDayDataModel
        .find(
          {
            date: queryObj,
          },
        )
    // select('marketData').
        .exec();

    const retVal = [];

    logger.debug({msg: 'marketData value', ...marketData});

    if (marketData.length > 1) {
      // date range
      marketData.forEach((oneDayDataIn) => {
        const oneDayDataOut = [];
        oneDayDataIn.marketData.forEach((hour) => {
          oneDayDataOut.push(hour);
        });
        retVal.push({
          date: dateToDateStr(oneDayDataIn.date),
          marketData: oneDayDataOut,
        });
      });
      res.status(200).json(retVal);
    }
    else if (marketData.length === 1) {
      // single date
      marketData[0].marketData.forEach((hour) => {
        retVal.push(hour);
      });
      res.status(200).json({
        date: dateToDateStr(startDate),
        marketData: retVal,
      });
    }
    else {
      // no date
      logger.info(logMessage.apiMethod.marketData.notFound(
        req.query.startDate,
        req.query.endDate,
      ));
      res.status(404).json({msg: respMessage.notFound});
    }
  };

  readMarketData();
};

/**
 * Initialize the Express framework by carrying out the following:
 * 1. Set the CORS middleware to enable for the server API methods to be called
 * from an environment which enforces the same-origin-policy, e.g. a browser.
 * See https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 * 2. Set the json middlware to parse a JSON request body and store it in
 * req.body if the request Content-Type is "application/json"
 * 3. Define the API method `GET /`.
 * 4. Set the authorization middleware [OAM.emwAuth]{@link module:OAM~emwAuth}.
 * From now on, all API methods are protected by this middleware.
 * 5. Define the API method `GET /marketData`
 * using [OAM.emwMaerketData]{@link module:OAM~emwMarketData}.
 * 6. Define the API method `GET /coverage`
 * using [OAM.emwCoverage]{@link module:OAM~emwCoverage}.
 * 7. Define the API method `GET /dateDiff`
 * using [OAM.emwDateDiff]{@link module:OAM~emwDateDiff}.
 */
function setApiServer() {
  const app = express();

  const port = process.env.OTE_BE_TUPLE_PORT;

  // allow scripts with an origin other than the back-end server and running
  // in a browser to consume data from this back-end server
  app.use(cors({
    // origin: 'http://192.168.2.222:3000',
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }));

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.status(200).json({msg: respMessage.serverId});
  });

  app.use(emwAuth);

  app.get('/marketData', emwMarketData);

  app.get('/coverage', emwCoverage);

  app.get('/dateDiff', emwDateDiff);

  app.use((_req, res) => {
    res.status(404).json({msg: respMessage.notFound});
  });

  app.use((err, _req, res, _next) => {
    // error handling
    /*
    console.log(
      util.inspect(err, false, null, true), // The fourth param enables colors
    );
    */
    logger.error(err.message);
    res.status(500).json({msg: respMessage.serverError, err});
  });

  httpServer = http
      .createServer(app)
      .listen(port, () => {
        logger.info(logMessage.serverStart(port));
      })
      .on('error', (err) => { // https://stackoverflow.com/a/22263571
        logger.error(`${err.message}`);
        process.emit('SIGINT');
      });
}

/**
 * Scrapes and stores one day data for the next date.
 * It gets called daily at the time determined by the cron scheduler
 * set in this module.
 */
async function scrapeAndStoreOneDayData() {
  const scrapeDate = dateTomorrow1300();
  try {
    const docExtract = await getMarketDataRetryWrapper(scrapeDate);
    await storeOneDayData(scrapeDate, docExtract);
  }
  catch (err) {
    logger.error(err.message);
    // logError(scrapeDate, err.name, err.message);
  }
}

/**
 * Gracefully shuts down the server by closing the HTTP server and by closing
 * the DB connection.
 * @param {string} signal A name of the signal which triggered this function.
 */
async function gracefulShutdown(signal) {
  logger.info(logMessage.serverSignal(signal));

  // Close the http server
  try {
    await httpServer.close();
    logger.info(logMessage.serverHttpClosed);
  }
  catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  // Close the DB connection
  try {
    await disconnectFromDb();
  }
  catch (err) {
    logger.error(err.message);
    process.exit(2);
  }
  logger.info(logMessage.goodBye);
  process.exit(0);
}

/* Graceful shutdown */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/* Server start */
await connectToDb();
setApiServer();
cron.schedule(cronExpr.dailyAt1200, scrapeAndStoreOneDayData);

