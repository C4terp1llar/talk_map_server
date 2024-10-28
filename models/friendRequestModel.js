const mongoose = require("mongoose");

const friendReq = new mongoose.Schema({
    initiator_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    send_time: {
        type: Date,
        default: Date.now,
    }
});

const FriendRequest = mongoose.model('friendRequest', friendReq, 'friendRequests');

module.exports = FriendRequest;
