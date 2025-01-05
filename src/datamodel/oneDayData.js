/*
 * Mongoose schema and model for storing the whole day market data as a single
 * document.
  This is the solution finally used to store the data.
*/

import mongoose from 'mongoose';

const oteOneDaySchema = new mongoose.Schema({
  date: {
    type: mongoose.Schema.Types.Date,
    unique: true,
  },
  marketData: [
    Array,
  ],
}, {
  methods: {
  },
});
export const oteOneDay = mongoose.model('oteOneDay', oteOneDaySchema);

const oteApiKeySchema = new mongoose.Schema({
  hashedKey: {
    type: String,
    match: /^[a-fA-F0-9]+$/, // Validate as hexadecimal string
    required: true,
  },
});
export const oteApiKey = mongoose.model('oteApiKey', oteApiKeySchema);
