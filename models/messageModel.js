const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "conversationType",
    required: true,
  },
  conversationType: {
    type: String,
    enum: ["PersonalConversation", "GroupConversation"],
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: false
  },
  media: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
  ],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  messageType: {
    type: String,
    enum: ["default", "system"], 
    default: "default", 
  },
  additionalInfo: {
    type: String,
    required: false,
    default: null,
  },
  isRead: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  }],
  isEdited: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isForwarded: {
    type: Boolean,
    default: false,
  }
}, {timestamps: true});

MessageSchema.index({ conversation_id: 1, createdAt: -1 });

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
