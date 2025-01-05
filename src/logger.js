import pino from 'pino';
import {mongoUrl} from './util.js';

/*
  When trying to use the URI below in combination with the mongoOptions
  property, the DB authentication was failing.

  const mongoUriDoesNotWork = `${process.env.OTE_MONGO_SCHEMA}://${process.env.OTE_MONGO_IP}:${process.env.OTE_MONGO_PORT}/?authSource=admin`;
*/

export default pino(
  pino.transport({
    target: 'pino-mongodb',
    level: process.env.OTE_PINO_LOG_LEVEL || 'info',
    options: {
      uri: mongoUrl,
      // uri: mongoUriDoesNotWork,
      // database: process.env.OTE_MONGO_DB_NAME,
      collection: 'log-collection',
      /*
      mongoOptions: {
        auth: {
          username: mongoUser,
          password: process.env.OTE_MONGO_PASSW,
        },
        // authSource: 'admin',
      },
      */
    },
  }),
);
