/*
  Mongoose schema and model for storing a single hour data as a document.
  This approach has not been selected for the final solution.
  Instead, the final solution stores all data for a single day as a document.
*/
import mongoose from 'mongoose';

const oteOneHourSchema = new mongoose.Schema({
    year: mongoose.Schema.Types.Number,
    month: mongoose.Schema.Types.Number,
    day: mongoose.Schema.Types.Number,
    hour: mongoose.Schema.Types.Number,
    price: mongoose.Schema.Types.Number,
    volume: mongoose.Schema.Types.Number,
    saldo: mongoose.Schema.Types.Number,
    export: mongoose.Schema.Types.Number,
    import: mongoose.Schema.Types.Number,
}, {
    methods: {
    },
});
export default mongoose.model('oteOneHour', oteOneHourSchema);
