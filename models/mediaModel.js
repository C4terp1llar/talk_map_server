const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    conversation_id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'conversation_model',
        default: null,
    },
    conversation_model: {
        type: String,
        enum: ['GroupConversation', 'PersonalConversation'],
        default: null,
    },
    client_filename: {
        type: String,
        required: true,
    },
    client_file_type: {
        type: String,
        required: true,
    },
    client_file_size: {
        type: Number,
        required: true,
    },
    store_filename: {
        type: String,
        required: true,
    },
    store_url: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

MediaSchema.index({ conversation_id: 1 });

const Media = mongoose.model('Media', MediaSchema);

module.exports = Media;
