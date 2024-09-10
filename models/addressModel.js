const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // связь с юзером
        required: true
    },
    lat: {
        type: String,
        required: true
    },
    lon: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    }
});

const Address= mongoose.model('Address', AddressSchema);

module.exports = Address;