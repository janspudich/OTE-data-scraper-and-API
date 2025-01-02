import {v4 as uuidv4} from 'uuid';
import crypto from 'crypto';
import 'dotenv/config';
import {oteApiKey} from './datamodel/oneDayData.js';
import {connectToDb} from './util.js';
import mongoose from 'mongoose';


/**
 * Stores a hashed API key in a database.
 * @param {string} hashedKey Hex digest of an API key hasehed using the app
 * secret as stored in process.env.OTE_HASH_KEY.
 */
async function storeHashedKeyInDb(hashedKey) {
  try {
    const newNode = oteApiKey({
      hashedKey,
    });
    await newNode.save();
  }
  catch (err) {
    console.log('Error writing a hashed key to DB: ', err.errorResponse);
  }
}


const newKey = uuidv4();
const hashKey = process.env.OTE_HASH_KEY;
const hash = crypto.createHmac('sha256', hashKey)
    .update(newKey)
    .digest('hex');

console.log('A new API key for the OAM module: ', newKey);
console.log(`Hash key: ${hashKey}`);
console.log(`Hex digest of the hashed API key: ${hash}`);

await connectToDb();
await storeHashedKeyInDb(hash);
await mongoose.connection.close();

console.log(`The API key hashed (${hash}) and stored in the DB.`);
