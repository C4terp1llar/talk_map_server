const cmService = require("../services/cmService");
const formidable = require("formidable");

class cmController {
  async createMessage(req, res) {
    const requester = req.user.uid;

    const form = new formidable.IncomingForm({
      multiples: true,
      uploadDir: "./uploads",
      keepExtensions: true,
    });

    try {
      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      const content = fields.content && fields.content[0] ? fields.content[0] : null;
      const recipient = fields.recipient && fields.recipient[0] ? fields.recipient[0] : null;
      const chatType = fields.chatType && fields.chatType[0] ? fields.chatType[0] : null;
      const replyTo = fields.replyTo && fields.replyTo[0] ? fields.replyTo[0] : null;
      const convId = fields.convId && fields.convId[0] ? fields.convId[0] : null;

      if (!content || !chatType || (chatType !== "personal" && chatType !== "group") || (chatType === "group" && !convId)) {
        return res.status(400).json({ error: "Нехватает данных или данные некорректны" });
      }

      const createdMessage = await cmService.createMessage(requester, recipient, content, files, convId, replyTo, chatType);

      return res.status(201).json({ message: createdMessage });
    } catch (err) {
      console.error("Ошибка при создании сообщения:", err.message);
      return res.status(500).json({ error: "Ошибка при создании сообщения" });
    }
  }

  async checkGroup(req, res) {
    const { title } = req.query;

    if (!title) return res.status(400).json({ error: "Нехватает данных или данные некорректны" });

    try {
      const uid = req.user.uid;
      const titleNormal = await cmService.isGroupExist(uid, title);
      return res.status(200).json({ match: !titleNormal });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Ошибка при проверке существования группы" });
    }
  }

  async createGroup(req, res) {
    const { title, description, members, cover } = req.body;

    if (!title || !members) return res.status(400).json({ error: "Нехватает данных или данные некорректны" });

    try {
      const uid = req.user.uid;
      await cmService.createGroup(uid, members, title, description, cover)
      return res.status(201).json({ msg: 'ok' });
    } catch (err) {
      console.error("Ошибка при создании группы:", err.message);
      return res.status(500).json({ error: "Ошибка при создании группы" });
    }
  }

  async getConversations(req, res) {
    const { q, page = 1, limit = 30 } = req.query;

    try {
      const uid = req.user.uid;

      const {conversations, hasMore} = await cmService.getConversations(uid, q, +page, +limit);

      res.status(200).json({ conversations, hasMore });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Ошибка при получении диалогов" });
    }
  }
}

module.exports = new cmController();
