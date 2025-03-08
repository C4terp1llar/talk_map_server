const cmService = require("../services/cmService");
const formidable = require("formidable");
const userService = require("../services/userService");
const asyncTaskRunner = require('../utils/asyncTaskRunner')
const wsServer = require("../utils/wsServer");

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

            asyncTaskRunner(async () => {
                wsServer.emitToUser(await cmService.getConvMembersIds(req.user.uid, createdMessage?.conversation_id), `receive_msg`, {createdMessage})
            })

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

    async getGroupConvMe(req, res) {
        const {id} = req.params;

        if (!id) return res.status(400).json({error: "Нехватает данных или данные некорректны"});

        try {
            const result = await cmService.getGroupMemberInfo(req.user.uid, id);

            if (result.error) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({...result});
        } catch (err) {
            console.error(err);
            return res.status(500).json({error: "Ошибка при получении информации о себе в группе"});
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

    async leaveGroupConv(req, res) {
        const { id: convId } = req.params;

        if (!convId) return res.status(400).json({ error: "Нехватает данных или данные некорректны" });

        try {
            const result = await cmService.leaveGroup(req.user.uid, convId);

            if (result.error) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({ message: result.message });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Ошибка при исключении участника из группы" });
        }
    }

    async getConvMedia(req, res) {
        const { id: convId } = req.params;
        const { mode, page = 1, limit = 50 } = req.query;

        if (!convId || !['image', 'video', 'files'].includes(mode)) {
            return res.status(400).json({ error: "Нехватает данных или данные некорректны" });
        }

        try {
            const media = await cmService.getConversationMedia(req.user.uid, convId, mode, +page, +limit);

            if (media.error) {
                return res.status(400).json(media);
            }

            return res.status(200).json(media);
        } catch (err) {
            console.error("Ошибка при получении медиа из диалога:", err);
            return res.status(500).json({ error: "Ошибка при получении медиа из диалога" });
        }
    }

    async getGroupFriends(req, res) {
        const { id: convId } = req.params;
        const { q, page = 1, limit = 10 } = req.query;

        if (!convId) {
            return res.status(400).json({ error: "Нехватает данных или данные некорректны" });
        }

        try {
            const friendsSnap = await cmService.getFriendsForGroup(req.user.uid, convId, q, +page, +limit);

            if (friendsSnap.error) {
                return res.status(400).json(friendsSnap);
            }

            return res.status(200).json({...friendsSnap});
        } catch (err) {
            console.error("Ошибка при получении друзей для группы:", err);
            return res.status(500).json({ error: "Ошибка при получении друзей для группы" });
        }
    }

    async addNewGroupMembers(req, res) {
        const { id: convId } = req.params;
        const { members } = req.body;

        if (!members || !members.length) {
            return res.status(400).json({ error: "Нехватает данных или данные некорректны" });
        }

        try {
            const membersSnap = await cmService.addGroupMembers(req.user.uid, convId, members);

            if (membersSnap.error) {
                return res.status(400).json(membersSnap);
            }

            return res.status(200).json({message: membersSnap.message});
        } catch (err) {
            console.error("Ошибка при добавлении новых участников в группу:", err);
            return res.status(500).json({ error: "Ошибка при новых участников в группу" });
        }
    }

    async changeGroupTitle(req, res) {
        const { id: convId } = req.params;
        const { newTitle } = req.body;

        if (!newTitle || !newTitle.length || typeof newTitle !== 'string') {
            return res.status(400).json({ error: "Нехватает данных или данные некорректны" });
        }

        try {
            const result = await cmService.changeGroupTitle(req.user.uid, convId, newTitle);

            if (result.error) {
                return res.status(400).json({message: result.message});
            }

            return res.status(200).json({message: result.message});
        } catch (err) {
            console.error("Ошибка при изменении названия групы:", err);
            return res.status(500).json({ error: "Ошибка при изменении названия групы" });
        }
    }

    async changeGroupCover(req, res) {
        const { id: convId } = req.params;
        const { newCover } = req.body;

        if (!newCover || !newCover.match(/^data:(.+);base64,(.+)$/)) {
            return res.status(400).json({ error: "Нехватает данных или данные некорректны" });
        }

        try {
            const result = await cmService.changeGroupCover(req.user.uid, convId, newCover);

            if (result.error) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({message: "Аватар успешно обновлен", cover_url: result.cover_url, cover_id: result.cover_id});
        } catch (err) {
            console.error("Ошибка при изменении аватара групы:", err);
            return res.status(500).json({ error: "Ошибка при изменении аватара групы" });
        }
    }

    async deleteMessage(req, res) {
        const { msgId } = req.params;
        const { convId } = req.query;

        if (!msgId || !convId) {
            return res.status(400).json({ error: "Нехватает данных или данные некорректны" });
        }

        try {
            const result = await cmService.deleteMessage(req.user.uid, convId, msgId);

            if (result.error) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({ message: result.message });
        } catch (err) {
            console.error("Ошибка при удалении сообщения:", err);
            return res.status(500).json({ error: "Ошибка при удалении сообщения" });
        }
    }

    async changeMessage(req, res) {
        const { msgId } = req.params;

        if (!msgId) {
            return res.status(400).json({ error: "Нехватает данных или данные некорректны" });
        }

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
            const convId = fields.convId && fields.convId[0] ? fields.convId[0] : null;

            if ((!content && !files) || !convId || !msgId) {
                return res.status(400).json({error: "Нехватает данных или данные некорректны"});
            }

            const result = await cmService.changeMessage(req.user.uid, convId, content, msgId, files);

            if (result.error) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({message: result.data});
        } catch (err) {
            console.error("Ошибка при изменении сообщения:", err.message);
            return res.status(500).json({error: "Ошибка при изменении сообщения"});
        }
    }

}

module.exports = new cmController();
