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
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },    
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

GroupConversationSchema.index({ "members.user_id": 1 });

const GroupConversation = mongoose.model("GroupConversation", GroupConversationSchema, "GroupConversations");

module.exports = GroupConversation;
