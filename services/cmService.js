const personalConv = require("../models/personalConvModel");
const groupConv = require("../models/groupConvModel");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Friend = require("../models/friendModel");

const MediaService = require("./mediaService");
const generateBase64Cover = require("../utils/generateCover");
const mongoose = require("mongoose");
const uploadMedia = require('../utils/uploadMedia');

class smService {

    async getPersonalConversations(requester, q = "", page = 1, limit = 30, byId, withoutMInfo = false) {
        if (!mongoose.Types.ObjectId.isValid(requester)) {
            throw new Error("Некорректный uid");
        }
        try {

            let matchCase = {
                $or: [
                    {user1_id: new mongoose.Types.ObjectId(requester)},
                    {user2_id: new mongoose.Types.ObjectId(requester)},
                ],
            };

            if (byId) {
                matchCase = {
                    _id: new mongoose.Types.ObjectId(byId),
                };
            }

            const personal = await personalConv.aggregate([
                {
                    $match: matchCase
                },
                {
                    $project: {
                        opponentId: {
                            $cond: {
                                if: {$eq: ["$user1_id", new mongoose.Types.ObjectId(requester)]},
                                then: "$user2_id",
                                else: "$user1_id",
                            },
                        },
                        lastMessage: 1,
                        messageCount: 1,
                        updatedAt: 1
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "opponentId",
                        foreignField: "_id",
                        as: "userInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$userInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                ...(q
                    ? [
                        {
                            $match: {
                                "userInfo.nickname": {
                                    $regex: q,
                                    $options: "i",
                                },
                            },
                        },
                    ]
                    : []),
                {
                    $lookup: {
                        from: "avatars",
                        localField: "opponentId",
                        foreignField: "user_id",
                        as: "avatarInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$avatarInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "messages",
                        let: {convId: "$_id"},
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {$eq: ["$conversation_id", "$$convId"]},
                                            {$eq: ["$conversationType", "PersonalConversation"]},
                                            {
                                                $not: {
                                                    $anyElementTrue: {
                                                        $map: {
                                                            input: "$isRead",
                                                            as: "readInfo",
                                                            in: {
                                                                $and: [
                                                                    {$eq: ["$$readInfo.user_id", new mongoose.Types.ObjectId(requester)]},
                                                                    {$eq: ["$$readInfo.read", true]},
                                                                ],
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                            {$count: "unreadCount"},
                        ],
                        as: "unreadMessages",
                    },
                },
                {
                    $lookup: {
                        from: "messages",
                        localField: "lastMessage",
                        foreignField: "_id",
                        as: "lastMessageInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$lastMessageInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "media",
                        localField: "lastMessageInfo.media",
                        foreignField: "_id",
                        as: "lastMessageMedia",
                    },
                },
                {
                    $addFields: {
                        opponent: {
                            _id: "$userInfo._id",
                            nickname: "$userInfo.nickname",
                            nickname_color: "$userInfo.nickname_color",
                            avatar: "$avatarInfo.asset_url",
                        },
                        lastMessage: {
                            _id: "$lastMessageInfo._id",
                            sender: "$lastMessageInfo.user_id",
                            sender_nickname: "$userInfo.nickname",
                            content: "$lastMessageInfo.content",
                            sendTime: "$lastMessageInfo.updatedAt",
                            messageType: "$lastMessageInfo.messageType",
                            additionalInfo: "$lastMessageInfo.additionalInfo",
                            mode: {
                                $cond: {
                                    if: {$eq: ['$lastMessageInfo.user_id', new mongoose.Types.ObjectId(requester)]},
                                    then: 'internal',
                                    else: 'external',
                                },
                            },
                            media: {
                                $map: {
                                    input: "$lastMessageMedia",
                                    as: "mediaItem",
                                    in: {
                                        _id: "$$mediaItem._id",
                                        name: "$$mediaItem.client_filename",
                                        type: "$$mediaItem.client_file_type",
                                        size: "$$mediaItem.client_file_size",
                                        url: "$$mediaItem.store_url",
                                    },
                                },
                            },
                            isRead: {
                                $cond: {
                                    if: {
                                        $anyElementTrue: {
                                            $map: {
                                                input: "$lastMessageInfo.isRead",
                                                as: "readInfo",
                                                in: {
                                                    $and: [
                                                        {$eq: ["$$readInfo.user_id", "$opponentId"]},
                                                        {$eq: ["$$readInfo.read", true]},
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                        unreadMessagesCount: {
                            $ifNull: [{$arrayElemAt: ["$unreadMessages.unreadCount", 0]}, 0],
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        messageCount: 1,
                        updatedAt: 1,
                        opponent: 1,
                        lastMessage: 1,
                        unreadMessagesCount: 1
                    },
                },
                {$sort: {updatedAt: -1}},
                {$skip: (page - 1) * limit},
                {$limit: limit + 1},
            ]);


            let hasMore = false;
            if (personal && personal.length) {
                hasMore = personal.length > limit;
                if (hasMore) {
                    personal.pop();
                }
            }

            return {personal, hasMore}
        } catch (err) {
            console.error("Ошибка при получении личных диалогов:", err);
            throw err;
        }
    }

    async getGroupConversations(requester, q = "", page = 1, limit = 30, byId) {
        if (!mongoose.Types.ObjectId.isValid(requester)) {
            throw new Error("Некорректный uid");
        }
        try {
            let matchCase = {
                "members.user_id": new mongoose.Types.ObjectId(requester),
            };

            if (byId) {
                matchCase = {
                    _id: new mongoose.Types.ObjectId(byId),
                };
            }

            const groups = await groupConv.aggregate([
                {
                    $match: matchCase
                },
                ...(q
                    ? [
                        {
                            $match: {
                                title: {
                                    $regex: q,
                                    $options: "i",
                                },
                            },
                        },
                    ]
                    : []),
                {
                    $lookup: {
                        from: "messages",
                        let: {convId: "$_id"},
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$conversation_id", "$$convId"],
                                    },
                                },
                            },
                            {
                                $unwind: "$isRead"
                            },
                            {
                                $match: {
                                    "isRead.read": false,
                                    "isRead.user_id": new mongoose.Types.ObjectId(requester),
                                },
                            },
                            {
                                $count: "totalUnread",
                            },
                        ],
                        as: "unreadMessages",
                    },
                },
                {
                    $lookup: {
                        from: "messages",
                        localField: "lastMessage",
                        foreignField: "_id",
                        as: "lastMessageInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$lastMessageInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "lastMessageInfo.user_id",
                        foreignField: "_id",
                        as: "userInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$userInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "media",
                        localField: "lastMessageInfo.media",
                        foreignField: "_id",
                        as: "lastMessageMedia",
                    },
                },
                {
                    $addFields: {
                        lastMessageDetail: {
                            _id: "$lastMessageInfo._id",
                            sender: "$lastMessageInfo.user_id",
                            sender_nickname: "$userInfo.nickname",
                            content: "$lastMessageInfo.content",
                            sendTime: "$lastMessageInfo.updatedAt",
                            messageType: "$lastMessageInfo.messageType",
                            additionalInfo: "$lastMessageInfo.additionalInfo",
                            mode: {
                                $cond: {
                                    if: {$eq: ['$lastMessageInfo.user_id', new mongoose.Types.ObjectId(requester)]},
                                    then: 'internal',
                                    else: 'external',
                                },
                            },
                            media: {
                                $map: {
                                    input: "$lastMessageMedia",
                                    as: "mediaItem",
                                    in: {
                                        _id: "$$mediaItem._id",
                                        name: "$$mediaItem.client_filename",
                                        type: "$$mediaItem.client_file_type",
                                        size: "$$mediaItem.client_file_size",
                                        url: "$$mediaItem.store_url",
                                    },
                                },
                            },
                            isRead: {
                                $cond: {
                                    if: {
                                        $anyElementTrue: {
                                            $map: {
                                                input: "$lastMessageInfo.isRead",
                                                as: "readInfo",
                                                in: {
                                                    $and: [
                                                        {$eq: ["$$readInfo.read", true]},
                                                        {
                                                            $in: [
                                                                "$$readInfo.user_id",
                                                                {
                                                                    $map: {
                                                                        input: "$members",
                                                                        as: "member",
                                                                        in: "$$member.user_id",
                                                                    },
                                                                },
                                                            ],
                                                        },
                                                        {$ne: ["$$readInfo.user_id", "$lastMessageInfo.user_id"]},
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                        unreadMessagesCount: {
                            $cond: {
                                if: {$gt: [{$size: "$unreadMessages"}, 0]},
                                then: {$arrayElemAt: ["$unreadMessages.totalUnread", 0]},
                                else: 0
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        owner_id: 1,
                        title: 1,
                        cover_url: 1,
                        messageCount: 1,
                        updatedAt: 1,
                        unreadMessagesCount: 1,
                        lastMessage: '$lastMessageDetail'
                    },
                },
                {$sort: {updatedAt: -1}},
                {$skip: (page - 1) * limit},
                {$limit: limit + 1},
            ]);

            let hasMore = false;
            if (groups && groups.length) {
                hasMore = groups.length > limit;
                if (hasMore) {
                    groups.pop();
                }
            }

            return {groups, hasMore}
        } catch (err) {
            console.error("Ошибка при получении групповых чатов:", err);
            throw err;
        }
    }

    async getConversations(requester, q = "", page = 1, limit = 30) {
        if (!mongoose.Types.ObjectId.isValid(requester)) {
            throw new Error("Некорректный uid");
        }

        try {
            const dialogLimit = limit / 2;

            const [personalConversations, groupConversations] = await Promise.all([
                this.getPersonalConversations(requester, q, page, dialogLimit),
                this.getGroupConversations(requester, q, page, dialogLimit)
            ]);

            let withoutConversations = null;
            if (q && !groupConversations.hasMore && !personalConversations.hasMore) {
                withoutConversations = await this.getFriendsWithoutConversation(requester, q, page, limit);
            }

            const combinedConversations = [
                ...personalConversations.personal,
                ...groupConversations.groups
            ];

            combinedConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            return {
                conversations: combinedConversations,
                withoutConversations: withoutConversations ? [...withoutConversations.friends] : null,
                hasMore: groupConversations.hasMore || personalConversations.hasMore || (withoutConversations ? withoutConversations.hasMore : false),
            };

        } catch (err) {
            console.error("Ошибка при получении диалогов:", err);
            throw err;
        }
    }

    async getFriendsWithoutConversation(requester, q = "", page = 1, limit = 15) {
        if (!mongoose.Types.ObjectId.isValid(requester)) {
            throw new Error("Некорректный uid");
        }

        try {

            const friendsWithoutDialogs = await Friend.aggregate([
                {
                    $match: {
                        $or: [
                            {user1_id: new mongoose.Types.ObjectId(requester)},
                            {user2_id: new mongoose.Types.ObjectId(requester)}
                        ]
                    }
                },
                {
                    $addFields: {
                        friendId: {
                            $cond: {
                                if: {$eq: ["$user1_id", new mongoose.Types.ObjectId(requester)]},
                                then: "$user2_id",
                                else: "$user1_id"
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "friendId",
                        foreignField: "_id",
                        as: "friendInfo"
                    }
                },
                {$unwind: "$friendInfo"},
                {
                    $lookup: {
                        from: "PersonalConversations",
                        let: {friendId: "$friendInfo._id"},
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $or: [
                                            {$and: [{$eq: ["$user1_id", new mongoose.Types.ObjectId(requester)]}, {$eq: ["$user2_id", "$$friendId"]}]},
                                            {$and: [{$eq: ["$user2_id", new mongoose.Types.ObjectId(requester)]}, {$eq: ["$user1_id", "$$friendId"]}]}
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "existingDialog"
                    }
                },
                {
                    $match: {
                        "existingDialog.0": {$exists: false} // Проверяем, что нет существующего диалога
                    }
                },
                {
                    $lookup: {
                        from: "avatars",
                        localField: "friendInfo._id",
                        foreignField: "user_id",
                        as: "avatar"
                    }
                },
                {
                    $addFields: {
                        avatar: {$arrayElemAt: ["$avatar.asset_url", 0]}
                    }
                },
                {
                    $match: {
                        "friendInfo.nickname": {$regex: new RegExp(q, "i")}
                    }
                },
                {$sort: {createdAt: -1}},
                {$skip: (page - 1) * limit},
                {$limit: limit + 1},
                {
                    $project: {
                        _id: "$friendInfo._id",
                        nickname: "$friendInfo.nickname",
                        nickname_color: "$friendInfo.nickname_color",
                        avatar: 1
                    }
                }
            ]);


            const hasMore = friendsWithoutDialogs.length > limit;
            if (hasMore) friendsWithoutDialogs.pop();

            return {
                friends: friendsWithoutDialogs,
                hasMore
            };

        } catch (err) {
            console.error("Ошибка при пользователей без диалога:", err);
            throw err;
        }
    }

    async createMessage(from, to, content, files, conversationId = null, replyTo = null, chatType, msgType = "default", addInfo = null) {
        if (!content && !files) {
            throw new Error("Сообщение не может быть пустым");
        }

        if (msgType && msgType !== "default" && msgType !== "system") {
            throw new Error("Неверный тип сообщения");
        }

        try {
            let conversation;
            let isRead = [];

            if (chatType === "personal") {
                // личный чат
                if (conversationId) {
                    conversation = await personalConv.findById(conversationId);
                    if (!conversation) {
                        throw new Error("Личный диалог не найден");
                    }
                } else {
                    conversation = await personalConv.findOne({
                        $or: [
                            {user1_id: from, user2_id: to},
                            {user1_id: to, user2_id: from},
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

                isRead = [
                    {user_id: from, read: true},
                    {user_id: to, read: false},
                ];
            } else if (chatType === "group" && conversationId) {
                // групповой чат
                conversation = await groupConv.findById(conversationId);
                if (!conversation) {
                    throw new Error("Групповой чат не найден");
                }

                const userExists = conversation.members.some((i) => i.user_id.toString() === from.toString());
                if (!userExists) {
                    throw new Error("Пользователь не может писать в этот групповой чат");
                }

                isRead = conversation.members.map((member) => ({
                    user_id: member.user_id,
                    read: member.user_id.toString() === from.toString(),
                }));
            } else {
                throw new Error("Неверное указание чата");
            }

            let media = [];
            if (files) {
                try {
                    media = await uploadMedia(from, files, conversation._id, chatType === "personal" ? "PersonalConversation" : "GroupConversation");
                } catch (uploadError) {
                    throw uploadError;
                }
            }

            const message = new Message({
                conversation_id: conversation._id,
                conversationType: chatType === "personal" ? "PersonalConversation" : "GroupConversation",
                user_id: from,
                content,
                media,
                replyTo,
                messageType: msgType,
                additionalInfo: addInfo,
                isRead,
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

    async isGroupExist(requester, title) {
        try {
            if (!title || !title.trim() || !mongoose.Types.ObjectId.isValid(requester)) {
                throw new Error("Обязательных данных нехватает или они не корректны");
            }

            const existingGroup = await groupConv.findOne({owner_id: requester, title: title.trim()});
            return !!existingGroup;
        } catch (err) {
            console.error("Ошибка при проверке существования группы:", err.message);
            throw new Error("Ошибка при проверке существования группы");
        }
    }

    async createGroup(requester, members, title, description = "", cover = "") {
        try {
            if (!title || !title.trim() || members.length < 2 || !mongoose.Types.ObjectId.isValid(requester)) {
                throw new Error("Обязательных данных нехватает или они не корректны");
            }

            for (let i of members) {
                if (!mongoose.Types.ObjectId.isValid(i)) {
                    throw new Error("Массив участников некорректный");
                }
            }

            const existingGroup = await groupConv.findOne({owner_id: requester, title: title.trim()});
            if (existingGroup) {
                throw new Error("Группа с таким названием у пользователя уже существует");
            }

            const membersList = [
                {
                    user_id: requester,
                    role: "owner",
                },
            ];

            members.forEach((member) => {
                membersList.push({
                    user_id: member,
                    role: "member",
                });
            });

            let currentCover;
            if (cover && cover.match(/^data:(.+);base64,(.+)$/)) {
                currentCover = await MediaService.uploadBase64ToS3(cover, requester);
            } else {
                const generateCover = generateBase64Cover(title.trim().charAt(0));
                currentCover = await MediaService.uploadBase64ToS3(generateCover, requester);
            }

            const currentMediaCover = await MediaService.createMedia(
                requester,
                currentCover.client_filename,
                currentCover.client_file_type,
                currentCover.client_file_size,
                currentCover.store_filename,
                currentCover.store_url
            );

            const newGroup = new groupConv({
                owner_id: requester,
                members: membersList,
                title: title.trim(),
                description: description.trim(),
                messageCount: 0,
                cover_id: currentMediaCover._id,
                cover_url: currentMediaCover.store_url
            });

            await newGroup.save();

            await this.createMessage(
                requester, undefined, "create_group", undefined, newGroup._id, undefined, "group",
                "system", `group_title:${title}`,
            );

            return newGroup;
        } catch (err) {
            console.error("Ошибка при создании группы:", err.message);
            throw new Error("Ошибка при создании группы");
        }
    }

    async checkDialog(requester, convId) {
        try {
            const [p, g] = await Promise.all([
                personalConv.findById(convId),
                groupConv.findById(convId),
            ]);

            if (!p && !g) {
                return {error: '400', message: 'Диалог с таким id несуществует'};
            }

            let isParticipant = false;

            if (p) {
                isParticipant = String(p.user1_id) === requester || String(p.user2_id) === requester;
            } else if (g) {
                isParticipant = g.members.some(member => String(member.user_id) === requester);
            }

            if (!isParticipant) {
                return {error: '400', message: 'Пользователь не является участником запрашиваемого диалога'};
            }

            return p ? "PersonalConversation" : "GroupConversation"
        } catch (err) {
            console.error("Ошибка при проверке запрашиваемого диалога пользователя:", err.message);
            throw new Error("Ошибка при проверке запрашиваемого диалога пользователя");
        }
    }

    async getMessages(requester, convId, page = 1, limit = 200) {
        if (!mongoose.Types.ObjectId.isValid(requester) || !mongoose.Types.ObjectId.isValid(convId)) {
            return {error: '400', message: 'Некорректный id диалога'};
        }

        try {
            const checkSnap = await this.checkDialog(requester, convId);
            if (checkSnap.error) return {...checkSnap};

            const messages = await Message.aggregate([
                {
                    $match: {
                        conversation_id: new mongoose.Types.ObjectId(convId),
                        conversationType: checkSnap,
                        isDeleted: false,
                    }
                },
                {
                    $addFields: {
                        isRead: {
                            $gt: [
                                {
                                    $size: {
                                        $filter: {
                                            input: "$isRead",
                                            as: "readEntry",
                                            cond: {$eq: ["$$readEntry.read", true]}
                                        }
                                    }
                                },
                                1
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "senderInfo",
                    }
                },
                {
                    $lookup: {
                        from: "avatars",
                        localField: "user_id",
                        foreignField: "user_id",
                        as: "senderAvatarInfo",
                    }
                },
                {
                    $lookup: {
                        from: "media",
                        localField: "media",
                        foreignField: "_id",
                        as: "messageMedia",
                    }
                },
                {
                    $addFields: {
                        sender: {
                            _id: "$user_id",
                            nickname: {$arrayElemAt: ["$senderInfo.nickname", 0]},
                            nickname_color: {$arrayElemAt: ["$senderInfo.nickname_color", 0]},
                            avatar: {$arrayElemAt: ["$senderAvatarInfo.asset_url", 0]},
                        },
                        mode: {
                            $cond: {
                                if: {$eq: ["$user_id", new mongoose.Types.ObjectId(requester)]},
                                then: "internal",
                                else: "external",
                            },
                        },
                        mediaInfo: {
                            $map: {
                                input: "$messageMedia",
                                as: "mediaItem",
                                in: {
                                    _id: "$$mediaItem._id",
                                    name: "$$mediaItem.client_filename",
                                    type: "$$mediaItem.client_file_type",
                                    size: "$$mediaItem.client_file_size",
                                    url: "$$mediaItem.store_url",
                                }
                            }
                        },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        conversation_id: 1,
                        conversationType: 1,
                        content: 1,
                        replyTo: 1,
                        messageType: 1,
                        additionalInfo: 1,
                        isEdited: 1,
                        isDeleted: 1,
                        isForwarded: 1,
                        updatedAt: 1,
                        createdAt: 1,
                        sender: 1,
                        mode: 1,
                        mediaInfo: 1,
                        isRead: 1
                    }
                },
                {$sort: {createdAt: 1}},
                {$skip: (page - 1) * limit},
                {$limit: limit}
            ]);

            const hasMore = messages.length === limit;

            return {messages, hasMore};
        } catch (err) {
            console.error("Ошибка при получении сообщений из диалога:", err.message);
            throw new Error("Ошибка при получении сообщений из диалога");
        }
    }


    async getUserDialog(requester, convId) {
        if (!mongoose.Types.ObjectId.isValid(requester) || !mongoose.Types.ObjectId.isValid(convId)) {
            return {error: '400', message: 'Некорректный id диалога'};
        }

        try {
            const checkSnap = await this.checkDialog(requester, convId);

            if (checkSnap.error) return {...checkSnap}

            let dialog

            if (checkSnap === 'PersonalConversation') {
                const temp = await this.getPersonalConversations(requester, undefined, 1, 1, convId)
                dialog = temp.personal[0] || {}
            } else if (checkSnap === 'GroupConversation') {
                const temp = await this.getGroupConversations(requester, undefined, 1, 1, convId)
                dialog = temp.groups[0] || {}
            }

            return {dialog}

        } catch (err) {
            console.error("Ошибка при получении диалога пользователя:", err.message);
            throw new Error("Ошибка при получении диалога пользователя");
        }
    }

    async getNewUserWithoutDialog(requester, targetUid) {
        if (!mongoose.Types.ObjectId.isValid(requester) || !mongoose.Types.ObjectId.isValid(targetUid)) {
            return {error: '400', message: 'Некорректные id'};
        }

        try {

            const friend = await Friend.aggregate([
                {
                    $match: {
                        $or: [
                            {
                                user1_id: new mongoose.Types.ObjectId(requester),
                                user2_id: new mongoose.Types.ObjectId(targetUid)
                            },
                            {
                                user1_id: new mongoose.Types.ObjectId(targetUid),
                                user2_id: new mongoose.Types.ObjectId(requester)
                            }
                        ]
                    }
                },
                {
                    $addFields: {
                        friendId: {
                            $cond: {
                                if: {$eq: ["$user1_id", new mongoose.Types.ObjectId(requester)]},
                                then: "$user2_id",
                                else: "$user1_id"
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "PersonalConversations",
                        let: {requesterId: new mongoose.Types.ObjectId(requester), friendId: "$friendId"},
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $or: [
                                            {$and: [{$eq: ["$user1_id", "$$requesterId"]}, {$eq: ["$user2_id", "$$friendId"]}]},
                                            {$and: [{$eq: ["$user1_id", "$$friendId"]}, {$eq: ["$user2_id", "$$requesterId"]}]}
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "existingDialog"
                    }
                },
                {
                    $match: {
                        existingDialog: {$size: 0}
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "friendId",
                        foreignField: "_id",
                        as: "friendInfo"
                    }
                },
                {$unwind: "$friendInfo"},
                {
                    $lookup: {
                        from: "avatars",
                        localField: "friendId",
                        foreignField: "user_id",
                        as: "avatar"
                    }
                },
                {
                    $addFields: {
                        avatar: {$arrayElemAt: ["$avatar.asset_url", 0]}
                    }
                },
                {
                    $project: {
                        _id: "$friendInfo._id",
                        nickname: "$friendInfo.nickname",
                        nickname_color: "$friendInfo.nickname_color",
                        avatar: 1
                    }
                }
            ]);

            if (!friend.length) {
                return {error: "400", message: "Пользователь не найден или уже есть диалог"};
            }

            return friend[0];

        } catch (err) {
            console.error("Ошибка при получении пользователя для нового диалога:", err.message);
            throw new Error("Ошибка при получении пользователя для нового диалога");
        }
    }

    async getConvMembers(requester, convId, page, limit) {
        if (!mongoose.Types.ObjectId.isValid(requester) || !mongoose.Types.ObjectId.isValid(convId)) {
            return {error: '400', status: 400, message: 'Некорректные id'};
        }

        try {

            const isMember = await groupConv.exists({ _id: convId, "members.user_id": new mongoose.Types.ObjectId(requester) });
            if (!isMember) {
                return { error: '400', status: 400, message: 'Запрашивающий не состоите в группе' };
            }

            const [senderData, members] = await Promise.all([
                groupConv.aggregate([
                    { $match: { _id: new mongoose.Types.ObjectId(convId) } },
                    { $unwind: "$members" },
                    { $match: { "members.user_id": new mongoose.Types.ObjectId(requester) } },
                    { $lookup: { from: "users", localField: "members.user_id", foreignField: "_id", as: "userInfo" } },
                    { $unwind: "$userInfo" },
                    { $lookup: { from: "avatars", localField: "members.user_id", foreignField: "user_id", as: "avatarInfo" } },
                    { $unwind: { path: "$avatarInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: "$userInfo._id",
                            nickname: "$userInfo.nickname",
                            nickname_color: "$userInfo.nickname_color",
                            avatar: "$avatarInfo.asset_url",
                            role: "$members.role"
                        }
                    }
                ]),
                groupConv.aggregate([
                    { $match: { _id: new mongoose.Types.ObjectId(convId) } },
                    { $unwind: "$members" },
                    { $match: { "members.user_id": { $ne: new mongoose.Types.ObjectId(requester) } } },
                    { $lookup: { from: "users", localField: "members.user_id", foreignField: "_id", as: "userInfo" } },
                    { $unwind: "$userInfo" },
                    { $lookup: { from: "avatars", localField: "members.user_id", foreignField: "user_id", as: "avatarInfo" } },
                    { $unwind: { path: "$avatarInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: "$userInfo._id",
                            nickname: "$userInfo.nickname",
                            nickname_color: "$userInfo.nickname_color",
                            avatar: "$avatarInfo.asset_url",
                            role: "$members.role"
                        }
                    },
                    {
                        $addFields: {
                            sortOrder: {
                                $switch: {
                                    branches: [
                                        { case: { $eq: ["$members.role", "owner"] }, then: 1 },
                                        { case: { $eq: ["$members.role", "admin"] }, then: 2 },
                                        { case: { $eq: ["$members.role", "member"] }, then: 3 }
                                    ],
                                    default: 4
                                }
                            }
                        }
                    },
                    { $sort: { sortOrder: 1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit + 1 },
                    {$project: {sortOrder: 0}}
                ])
            ])

            const sender = senderData[0] ?? null;

            const hasMore = members.length > limit;
            if (hasMore) members.pop();

            return { members, hasMore, sender };
        } catch (err) {
            console.error("Ошибка при получении участников диалога:", err.message);
            throw new Error("Ошибка при получении получении участников диалога");
        }
    }

}

module.exports = new smService();
