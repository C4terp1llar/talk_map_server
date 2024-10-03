const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // связь с юзером
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    lon: {
        type: Number,
        required: true
    },
    display_name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: false
    },
    address_type: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: false
    },
    road: {
        type: String,
        required: false
    },
    house_number: {
        type: String,
        required: false
    },
    city_district: {
        type: String,
        required: false
    },
    state: {
        type: String,
        required: false
    },
    boundingbox: {
        type: [String],
        required: false
    }
});

const Address = mongoose.model('Address', AddressSchema);

module.exports = Address;
