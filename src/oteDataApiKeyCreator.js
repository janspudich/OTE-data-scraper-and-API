import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import 'dotenv/config';
import { oteApiKey } from './datamodel/oneDayData.js';
import { connectToDb } from './util.js';
import mongoose from 'mongoose';


async function storeHashedKeyInDb(hashedKey) {
    try {
        const newNode = oteApiKey({
            hashedKey,
        });
        await newNode.save();
    }
    catch(err) {
        console.log('Error writing a hashed key to DB: ', err.errorResponse);
    }
}


const newKey = uuidv4();
console.log('A new API key for the OAM module: ', newKey);
const hashKey = process.env.HASH_KEY;
//console.log(`Hash key: ${hashKey}`);
const hash = crypto.createHash('sha256', hashKey)
      .update(newKey)
      .digest('hex');

await connectToDb();
await storeHashedKeyInDb(hash);
await mongoose.connection.close();

console.log(`The API key hashed (${hash}) and stored in the DB.`);
