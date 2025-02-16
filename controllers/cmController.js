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
            const {fields, files} = await new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) return reject(err);
                    resolve({fields, files});
                });
            });

            const content = fields.content && fields.content[0] ? fields.content[0] : null;
            const recipient = fields.recipient && fields.recipient[0] ? fields.recipient[0] : null;
            const chatType = fields.chatType && fields.chatType[0] ? fields.chatType[0] : null;
            const replyTo = fields.replyTo && fields.replyTo[0] ? fields.replyTo[0] : null;
            const convId = fields.convId && fields.convId[0] ? fields.convId[0] : null;

            if ((!content && !files) || !chatType || (chatType !== "personal" && chatType !== "group") || (chatType === "group" && !convId)) {
                return res.status(400).json({error: "Нехватает данных или данные некорректны"});
            }

            const createdMessage = await cmService.createMessage(requester, recipient, content, files, convId, replyTo, chatType);

            return res.status(201).json({message: createdMessage});
        } catch (err) {
            console.error("Ошибка при создании сообщения:", err.message);
            return res.status(500).json({error: "Ошибка при создании сообщения"});
        }
    }

    async checkGroup(req, res) {
        const {title} = req.query;

        if (!title) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {
            const uid = req.user.uid;
            const titleNormal = await cmService.isGroupExist(uid, title);
            return res.status(200).json({match: !titleNormal});
        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при проверке существования группы"});
        }
    }

    async createGroup(req, res) {
        const {title, description, members, cover} = req.body;

        if (!title || !members) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {
            const uid = req.user.uid;
            await cmService.createGroup(uid, members, title, description, cover)
            return res.status(201).json({msg: 'ok'});
        } catch (err) {
            console.error("Ошибка при создании группы:", err.message);
            return res.status(500).json({error: "Ошибка при создании группы"});
        }
    }

    async getConversations(req, res) {
        const {q, page = 1, limit = 30} = req.query;

        try {
            const uid = req.user.uid;

            const {
                conversations,
                withoutConversations,
                hasMore
            } = await cmService.getConversations(uid, q, +page, +limit);

            res.status(200).json({conversations, withoutConversations, hasMore});
        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при получении диалогов"});
        }
    }

    async getConversationMessages(req, res) {
        const {convId, page = 1, limit = 200} = req.query;

        if (!convId) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {
            const uid = req.user.uid;

            const messageSnap = await cmService.getMessages(uid, convId, +page, +limit);

            if (messageSnap.error && messageSnap.error === '400') {
                return res.status(400).json({error: "Данные о диологе некорректны"});
            }

            res.status(200).json({messages: messageSnap.messages, hasMore: messageSnap.hasMore});
        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при получении сообщений"});
        }
    }

    async getConversationInfo(req, res) {
        const {id} = req.params;

        if (!id) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {
            const uid = req.user.uid;

            const dialogSnap = await cmService.getUserDialog(uid, id);

            if (dialogSnap.error && dialogSnap.error === '400') {
                return res.status(400).json({error: "Данные о запрашиваемом диологе некорректны"});
            }

            res.status(200).json({dialog: dialogSnap.dialog});
        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при получении диалога"});
        }
    }

    async getNewConvOpponent(req, res) {
        const {uid} = req.params;

        if (!uid) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {
            const requester = req.user.uid;

            const user = await cmService.getNewUserWithoutDialog(requester, uid);

            if (user.error && user.error === '400') {
                return res.status(400).json({error: "Данные о запрашиваемом оппоненте некорректны"});
            }

            res.status(200).json({user});
        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при пользователя для нового диалога"});
        }
    }

    async getGroupConvMembers(req, res) {
        const {id} = req.params;
        const {page, limit} = req.query;

        if (!id) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {
            const membersSnap = await cmService.getConvMembers(req.user.uid, id, +page, +limit);

            if (membersSnap.error) {
                return res.status(membersSnap.status).json({message: membersSnap.message});
            }

            res.status(200).json({...membersSnap});
        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при получении участников группы"});
        }
    }

    async updateMemberGroupRole(req, res) {
        const { id: convId } = req.params;
        const { targetMember, role } = req.body;

        if (!convId || !targetMember || !role || !["admin", "owner", "member"].includes(role)) return res.status(400).json({ error: "Нехватает данных или данные некорректны" });

        try {
            const result = await cmService.changeConvMemberRole(req.user.uid, targetMember, convId, role);

            if (result.error) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({ message: result.message, newRole: result.newRole });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Ошибка при изменении роли участника группы" });
        }
    }

    async kickGroupMember(req, res) {
        const { id: convId, targetUid } = req.params;

        if (!convId || !targetUid) return res.status(400).json({ error: "Нехватает данных или данные некорректны" });

        try {
            const result = await cmService.kickGroupMember(req.user.uid, targetUid, convId);

            if (result.error) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({ message: result.message });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Ошибка при исключении участника из группы" });
        }
    }

    async getConvImages(req, res) {
        const {convId, page = 1, limit = 50} = req.query;

        if (!convId) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {

        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при получении всех фото из диалога"});
        }
    }

    async getConvVideos(req, res) {
        const {convId} = req.params;

        if (!convId) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {

        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при получении всех видео из диалога"});
        }
    }

    async getConvFiles(req, res) {
        const {convId} = req.params;

        if (!convId) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {

        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при получении всех файлов из диалога"});
        }
    }

}

module.exports = new cmController();
