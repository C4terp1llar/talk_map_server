const mongoose = require("mongoose");

const GroupConversationSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member",
        },
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    cover_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    cover_url: {
      type: String,
      required: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

GroupConversationSchema.index({ owner_id: 1, title: 1 }, { unique: true });

const GroupConversation = mongoose.model("GroupConversation", GroupConversationSchema, "GroupConversations");

module.exports = GroupConversation;
