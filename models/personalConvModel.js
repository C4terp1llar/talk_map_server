const mongoose = require("mongoose");

const PersonalConversationSchema = new mongoose.Schema(
  {
    user1_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

PersonalConversationSchema.index({ user1_id: 1, user2_id: 1 }, { unique: true });

const PersonalConversation = mongoose.model("PersonalConversation", PersonalConversationSchema, "PersonalConversations");

module.exports = PersonalConversation;
