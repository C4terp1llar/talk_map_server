const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ['Publication', 'Post', 'Comment'],
        required: true,
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'entityType',
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
    isEdited: {
        type: Boolean,
        required: true,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false,
    },
}, {timestamps: true});

CommentSchema.index({entityType: 1, entityId: 1, parentCommentId: 1});

const Comment = mongoose.model('Comment', CommentSchema);

module.exports = Comment;
