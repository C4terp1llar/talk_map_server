const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ['Photo', 'Post', 'Comment'],
        required: true,
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'entityType',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

ReactionSchema.index({ entityType: 1, entityId: 1, userId: 1 }, { unique: true });

const Reaction = mongoose.model('Reaction', ReactionSchema);

module.exports = Reaction;
