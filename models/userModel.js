const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        match: /.+@.+\..+/ // валидация на имаил
    },
    password: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        unique: true,
        required: true
    },
    nickname_color: {
        type: String,
        required: false,
        default: null
    },
    b_date: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    }
});

const User= mongoose.model('User', UserSchema);

module.exports = User;