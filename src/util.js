/**
 * @file Defines utilities used in [the Data Scraper Module (DSM)]{@link
 * module:DSM} and [the OTE API Module (OAM)]{@link module:OAM} modules.
 * @module OAM&DSM utilities
 * @author Jan Spudich <jan.spudich@origimi.com>
 */
import util from 'util';
import mongoose from 'mongoose';

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

export const mongoUrl = `${process.env.OTE_MONGO_SCHEMA}://${process.env.OTE_MONGO_USER}:${process.env.OTE_MONGO_PASSW}@${process.env.OTE_MONGO_IP}:${process.env.OTE_MONGO_PORT}/${process.env.OTE_MONGO_DB_NAME}`;

export const oteUrlBase = 'https://www.ote-cr.cz/cs/kratkodobe-trhy/elektrina/denni-trh?date=';

/**
 * Create a connection to a MongoDB database.
 */
export async function connectToDb() {
  console.log(`Connecting to DB at ${process.env.OTE_MONGO_IP}`);
  try {
    await mongoose.connect(mongoUrl);
    console.log(`Successfully connected to DB.`);
  }
  catch (err) {
    console.log(`Error while connecting to DB.`);
    console.log(
      util.inspect(err, false, null, true), // The fourth param enables colors
    );
  }
}
