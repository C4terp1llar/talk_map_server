const personalConv = require("../models/personalConvModel");
const groupConv = require("../models/groupConvModel");
const Message = require("../models/messageModel");

const MediaService = require('./mediaService')

const mongoose = require("mongoose");

async function uploadMedia(requester, files) {
  const uploads = await Promise.all(
    Object.values(files)
      .flat()
      .map((file) => MediaService.uploadToS3(file, requester))
  );

  return await Promise.all(
    uploads.map((upload) =>
      MediaService.createMedia(
        requester,
        upload.client_filename,
        upload.client_file_type,
        upload.client_file_size,
        upload.store_filename,
        upload.store_url
      )
    )
  );
}


class smService {
  async getConversations(uid, searchQ = "", page = 1, limit = 30) {
    try {
    } catch (err) {
      console.error("Ошибка при получении диалогов:", err);
      throw err;
    }
  }

  async createMessage(from, to, content, files, conversationId = null, replyTo = null, chatType) {
    if (!content && !files) {
      throw new Error("Сообщение не может быть пустым");
    }

    try {
      let conversation;

      if (chatType === "personal") {
        if (conversationId) {
          conversation = await personalConv.findById(conversationId);
          if (!conversation) {
            throw new Error("Личный диалог не найден");
          }
        } else {
          conversation = await personalConv.findOne({
            $or: [
              { user1_id: from, user2_id: to },
              { user1_id: to, user2_id: from },
            ],
          });

          if (!conversation) {
            conversation = new personalConv({
              user1_id: from,
              user2_id: to,
            });
            await conversation.save();
          }
        }
      } else if (chatType === "group" && conversationId) {
        conversation = await groupConv.findById(conversationId);
        if (!conversation) {
          throw new Error("Групповой чат не найден");
        }

        const userExists = conversation.members.some((i) => i.user_id.toString() === from.toString());
        if (!userExists) {
          throw new Error("Пользователь не может писать в этот групповой чат");
        }
      } else {
        throw new Error("Неверное указание чата");
      }

      let media = [];
      if (files) {
        try {
          media = await uploadMedia(from, files);
        } catch (uploadError) {
          throw uploadError
        }
      }

      const message = new Message({
        conversation_id: conversation._id,  
        conversationType: chatType === "personal" ? "PersonalConversation" : "GroupConversation",         
        user_id: from,                      
        content,                         
        media,                              
        replyTo,          
      });

      await message.save();

      conversation.lastMessage = message._id;
      conversation.messageCount += 1;
      await conversation.save();

      return message;
    } catch (err) {
      console.error("Ошибка при создании сообщения:", err);
      throw err;
    }
  }
}

module.exports = new smService();
