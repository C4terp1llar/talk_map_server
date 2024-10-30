const mongoose = require("mongoose");

const FriendSchema = new mongoose.Schema({
    user1_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user2_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

FriendSchema.index({ user1_id: 1, user2_id: 1 }, { unique: true });

const Friend = mongoose.model('Friend', FriendSchema);

module.exports = Friend;
