/*
  Mongoose schema and model for storing the whole day market data as a single document.
  This is the solution finally used to store the data.
*/

import mongoose from 'mongoose';

const oteOneDaySchema = new mongoose.Schema({
    date: {
        type: mongoose.Schema.Types.Date,
        unique: true,
    },
    marketData: [
            Array
    ],
}, {
    methods: {
    },
});
export default mongoose.model('oteOneDay', oteOneDaySchema);
