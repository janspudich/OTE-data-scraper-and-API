// myStuff-BE main file
// created by jan.spudich@origimi.com on 14-Sep-2022

// const mongoose = require('mongoose');
import mongoose from 'mongoose';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import cors from 'cors';
import http from 'http';
import util from 'util';
import express from 'express';


dotenv.config();


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
        res.status(200).json({ msg: 'OTE server' });
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
        console.log('OTE server');
        console.log(`Listening on the port ${port}.`);
    });

}

console.log(`Connecting to DB: ${process.env.OTE_MONGO_URL}`);

mongoose.connect(process.env.MONGO_URL)
    .then((resp) => {
        console.log(`Successfully connected to DB.`);
        setApiServer();
    })
    .catch((err) => {
        console.log(`Error while connecting to DB.`);
        console.log(
            util.inspect(err, false, null, true /* enable colors */),
        );
    });
