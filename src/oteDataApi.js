/**
 * @file Defines the OTE API Module (OAM).
 * @module OAM
 * @author Jan Spudich <jan.spudich@origimi.com>
 */

import 'dotenv/config';
import cors from 'cors';
import http from 'http';
import util from 'util';
import express from 'express';
import crypto from 'crypto';
import cron from 'node-cron';
import {
  oteOneDay as oteOneDayDataModel,
  oteApiKey,
} from './datamodel/oneDayData.js';
import {
  dateToDateStr,
  connectToDb,
  dateDiff,
} from './util.js';
import {
  dateToScrapeUrl,
  getMarketDataRetryWrapper,
  storeOneDayData,
  CONF_DB_DATE_TIME,
} from './scraper.js';


const respMessage = {
  authHeaderMissing: 'Authorization header missing',
  authHeaderDoesNotMatch: 'The API key used in the request is not authorized.',
  serverId: 'OTE API Module (OAM), v0.0.1',
  notFound: 'Not found',
  serverError: 'Server unknown error',
};

// const CONF_START_DATE = '2024-12-18';
// const scrapeDate = new Date(`${CONF_START_DATE}${CONF_DB_DATE_TIME}`);

const cronExpr = {
  dailyAt1200: '0 12 * * *',
  dailyAt1300: '0 13 * * *',
  dailyAt1400: '0 14 * * *',
  everyMinute: '* * * * *',
};

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
  const findKeyInDb = async (key) => {
    try {
      const keyFound = await oteApiKey.findOne({hashedKey: key}).exec();

      if (keyFound === null) {
        console.log(`Hashed API key not found in DB - call not authorized.`);
        res.status(401).json({msg: respMessage.authHeaderDoesNotMatch});
      }
      else {
        // eslint-disable-next-line max-len
        console.log(`Hashed API key found in DB: ${keyFound.hashedKey} - call authorized`);
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
    res.status(401).json({msg: respMessage.authHeaderMissing});
  }
  else {
    const receivedApiKey = match[1];
    const hexDigest = crypto
        .createHmac('sha256', process.env.OTE_HASH_KEY)
        .update(receivedApiKey)
        .digest('hex');
    // console.log(`Received API key: ${receivedApiKey}`);
    // console.log(`Hash key: ${process.env.OTE_HASH_KEY}`);
    // console.log(`Hex digest of the received API key: ${hexDigest}`);
    findKeyInDb(hexDigest);
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
      console.log(err);
    }
    return null;
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
    console.log('startDate query param: ', req.query.startDate);
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
    console.log('QueryObj: ', queryObj);
    const marketData = await oteOneDayDataModel
        .find(
          {
            date: queryObj,
          },
        )
    // select('marketData').
        .exec();

    const retVal = [];

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
    else {
      // single date
      marketData[0].marketData.forEach((hour) => {
        retVal.push(hour);
      });
      res.status(200).json({
        date: dateToDateStr(startDate),
        marketData: retVal,
      });
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
    console.log(
      util.inspect(err, false, null, true), // The fourth param enables colors
    );
    res.status(500).json({msg: respMessage.serverError, err});
  });

  http.createServer(app).listen(port, () => {
    console.log('The OTE server has started.');
    console.log(`Listening on the port ${port}.`);
  });
}

/**
 * Scrapes and stores one day data for the current date.
 * It gets called daily at 14:00.
 */
async function scrapeAndStoreOneDayData() {
  const scrapeDate = new Date(dateToDateStr(Date.now()) + CONF_DB_DATE_TIME);
  const scrapeUrl = dateToScrapeUrl(scrapeDate);
  console.log('Scrape URL: ', scrapeUrl);
  try {
    const docExtract = await getMarketDataRetryWrapper(
      dateToScrapeUrl(scrapeDate),
    );
    await storeOneDayData(scrapeDate, docExtract);
  }
  catch (err) {
    console.log(`Error while scraping the data and storing them in DB for the date ${dateToDateStr(scrapeDate)}: `, err);
  }
}


await connectToDb();

setApiServer();

cron.schedule(cronExpr.dailyAt1200, scrapeAndStoreOneDayData);
