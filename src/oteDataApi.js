// myStuff-BE main file
// created by jan.spudich@origimi.com on 14-Sep-2022

import mongoose from 'mongoose';
import 'dotenv/config';
import cors from 'cors';
import http from 'http';
import util from 'util';
import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

import { oteOneDay as oteOneDayDataModel, oteApiKey } from './datamodel/oneDayData.js';
import { dateToDateStr, mongoUrl, dateDiff } from './util.js';

const errorObj = (msg) => ({
    message: msg,
});

const authMW = (req, res, next) => {
    const findKeyInDb = async (key) => {
        try {
            const keyFound = await oteApiKey.findOne({ hashedKey: key }).exec();
            console.log(`apiKeyFound: ${keyFound}`);
            if (keyFound === null) {
                const errMsg = 'The API key used in the request is not authorized.';
                return res.status(401).send(errorObj(errMsg));
            }
            else {
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
        const errMsg = 'Authorization header missing';
        return res.status(401).send(errorObj(errMsg));
    }
    else {
        findKeyInDb(crypto.createHash('sha256', process.env.HASH_KEY)
                    .update(match[1])
                    .digest('hex'));
    }
};



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

    // middlware to parse a JSON request body and store it in req.body
    // if the request Content-Type is "application/json"
    app.use(express.json());

    app.get('/', (req, res) => {
        res.status(200).json({ msg: 'OTE server 123' });
    });

    app.use(authMW);
    
    app.get('/marketData', (req, res) => {
        
        async function readMarketData() {
            let queryObj;
            const startDate = new Date(req.query.startDate);
            console.log('startDate query param: ', req.query.startDate);
            if(req.query.endDate){
                // date range
                const endDate = new Date(`${req.query.endDate}T21:59:59`);
                queryObj = {
                    $gte: startDate,
                    $lte: endDate
                };
            }
            else {
                // single date
                const endDate = new Date(`${req.query.startDate}T21:59:59`);
                queryObj = {
                    $gte: startDate,
                    $lte: endDate
                };
            }
            console.log('QueryObj: ', queryObj);
            const marketData = await oteOneDayDataModel.
                  find(
                      {
                          date: queryObj,
                      },
                  ).
                  //                  select('marketData').
                  exec();

            let retVal = [];

            if(marketData.length > 1){
                // date range
                marketData.forEach((oneDayDataIn) => {
                    let oneDayDataOut = [];
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
        }
        
        readMarketData();
    });

    app.get('/coverage', (req, res) => {
        async function getTheFirstLastDate(order = 1) {
            try {
                const recordFound = await oteOneDayDataModel.
                      findOne().
                      sort({date: order}).
                      limit(1).
                      exec();
                return recordFound.date;
            }
            catch (err) {
            }
            return null;
        };

        async function coverage() {
            const theFirstDate = await getTheFirstLastDate();
            const theLastDate = await getTheFirstLastDate(-1);
            // https://stackoverflow.com/a/3224854
            const diffTime = Math.abs(theFirstDate - theLastDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const duration = dateDiff(theFirstDate, theLastDate) + 1;
            const coverage = await oteOneDayDataModel.countDocuments();
            res.status(200).json({
                startDate: dateToDateStr(theFirstDate),
                endDate: dateToDateStr(theLastDate),
                duration,
                coverage,
                gap: duration - coverage,
            });
        }
        coverage();
    });

    app.get('/dateDiff', (req, res) => {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);
        res.status(200).json({
            startDate: dateToDateStr(startDate),
            endDate: dateToDateStr(endDate),
            duration: dateDiff(startDate, endDate),
        });
    });

    app.use((err, req, res, next) => {
        // myStuff error handling
        // res.status(err.myStuff.httpRespCode).json(err.myStuff);
        console.log('ERROR: ', err);
    });

    app.use((req, res) => {
        res.status(404).json({ msg: 'Not found' });
    });


    const httpsServer = http.createServer(app).listen( port, () => {
        console.log('The OTE server has started.');
        console.log(`Listening on the port ${port}.`);
    });

}

console.log(`Connecting to DB at ${process.env.OTE_MONGO_IP}`);

mongoose.connect(mongoUrl)
    .then((resp) => {
        console.log(`Successfully connected to DB.`);
        setApiServer();
    })
    .catch((err) => {
        console.log(`Error while connecting to DB.`);
        console.log(
            util.inspect(err, false, null, true), // The fourth param is to enable colors
        );
    });





