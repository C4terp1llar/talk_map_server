const User = require("../models/userModel");
const Address = require("../models/addressModel");
const Avatar = require("../models/avatarModel");
const Wallpaper = require("../models/wallpaperModel");
const originalWallpaper = require("../models/originalWallpaperModel");
const originalAvatar = require("../models/originalAvatarModel");
const Tag = require("../models/tagModel");
const friendRequest = require("../models/friendRequestModel");
const Friend = require("../models/friendModel");
const Token = require("../models/tokenModel");

const mongoose = require("mongoose");

const axios = require("axios");

const ImgService = require("../services/imgService");
const jwtService = require("./jwtService");

class UserService {
  async getUserInfo(uid, mode) {
    try {
      let excludeString;

      if (mode && mode === "external") {
        excludeString = "-email -password -__v";
      } else {
        excludeString = "-password -__v";
      }

      const mainData = await User.findById(uid).select(excludeString).lean();
      const [avatar, wallpaper, tags] = await Promise.all([this.getUserAvatar(uid), this.getUserWallpaper(uid), this.getUserTags(uid)]);

      return {
        ...mainData,
        avatar: avatar ? avatar.asset_url : null,
        wallpaper: wallpaper ? wallpaper.asset_url : null,
        tags: tags ? tags : null,
      };
    } catch (err) {
      console.error("Ошибка при получении информации о пользователе");
      throw err;
    }
  }

  async getUserAvatar(uid) {
    try {
      return await Avatar.findOne({ user_id: uid }).lean();
    } catch (err) {
      console.error("Ошибка при получении аватара пользователя");
      throw err;
    }
  }

  async getUserWallpaper(uid) {
    try {
      return await Wallpaper.findOne({ user_id: uid }).lean();
    } catch (err) {
      console.error("Ошибка при получении обоев пользователя");
      throw err;
    }
  }

  async getUserAddress(uid, mode) {
    try {
      let excludeString;

      if (mode && mode === "external") {
        excludeString = "city country country_code -_id";
      } else {
        excludeString = "-user_id -_id -__v";
      }

      return await Address.findOne({ user_id: uid }).select(excludeString).lean();
    } catch (err) {
      console.error("Ошибка при получении адреса пользователя");
      throw err;
    }
  }

  async changeAddress(uid, address) {
    try {
      await Address.findOneAndUpdate({ user_id: uid }, { $set: address });
    } catch (err) {
      console.error("Ошибка при изменении адреса пользователя");
      throw err;
    }
  }

  async createAvatar(uid, public_id, asset_id, asset_url, path, force) {
    try {
      const model = force === "uploadCrop" ? originalAvatar : Avatar;

      const existingAvatar = await model.findOne({ user_id: uid }).lean();

      if (existingAvatar) {
        await ImgService.deleteImg(existingAvatar.public_id);
      }

      await model.findOneAndUpdate(
        { user_id: uid },
        {
          $set: {
            public_id,
            asset_id,
            asset_url,
            path,
          },
          $setOnInsert: {
            user_id: uid,
          },
        },
        {
          upsert: true,
        }
      );
    } catch (err) {
      console.error("Ошибка при создании аватара");
      throw err;
    }
  }

  async createWallpaper(uid, public_id, asset_id, asset_url, path, force) {
    try {
      const model = force === "uploadCrop" ? originalWallpaper : Wallpaper;

      const existingWallpaper = await model.findOne({ user_id: uid }).lean();

      if (existingWallpaper) {
        await ImgService.deleteImg(existingWallpaper.public_id);
      }

      await model.findOneAndUpdate(
        { user_id: uid },
        {
          $set: {
            public_id, // если нашли - обновляем эти данные
            asset_id,
            asset_url,
            path,
          },
          $setOnInsert: {
            user_id: uid, // если не нашли то при создании помимо данных выше еще и создаем
          },
        },
        {
          upsert: true, // создаем если не нашли
        }
      );
    } catch (err) {
      console.error("Ошибка при создании обоев");
      throw err;
    }
  }

  async getOriginalWallpaper(uid) {
    try {
      return await originalWallpaper.findOne({ user_id: uid }).lean();
    } catch (err) {
      console.error("Ошибка при получении оригинальных обоев");
      throw err;
    }
  }

  async getOriginalAvatar(uid) {
    try {
      return await originalAvatar.findOne({ user_id: uid }).lean();
    } catch (err) {
      console.error("Ошибка при получении оригинального аватара");
      throw err;
    }
  }

  async convertUrlToBase64(url) {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });

      const mimeType = response.headers["content-type"];

      const base64Image = Buffer.from(response.data).toString("base64");

      return `data:${mimeType};base64,${base64Image}`;
    } catch (err) {
      console.error("Ошибка при конвертации url в base 64");
      throw err;
    }
  }

  async deleteAllWallpaper(uid) {
    try {
      await Promise.all([Wallpaper.findOneAndDelete({ user_id: uid }), originalWallpaper.findOneAndDelete({ user_id: uid })]);
    } catch (err) {
      console.error("Ошибка при удалении обоев");
      throw err;
    }
  }

  async changeNickname(uid, nick) {
    try {
      await User.findByIdAndUpdate(uid, { nickname: nick });
    } catch (err) {
      console.error("Ошибка при изменении никнейма");
      throw err;
    }
  }

  async changeNicknameColor(uid, color) {
    try {
      const newColor = color === "default" ? null : color;
      await User.findByIdAndUpdate(uid, { nickname_color: newColor });
    } catch (err) {
      console.error("Ошибка при изменении цвета никнейма");
      throw err;
    }
  }

  async setUserTag(uid, emoji, text) {
    try {
      const tag = new Tag({ user_id: uid, emoji, text });
      await tag.save();
    } catch (err) {
      console.error("Ошибка при добавлении тега");
      throw err;
    }
  }

  async getUserTags(uid) {
    try {
      return await Tag.find({ user_id: uid }).select("-_id -__v -user_id").lean();
    } catch (err) {
      console.error("Ошибка при получении тега");
      throw err;
    }
  }

  async deleteUserTag(uid, tagText) {
    try {
      await Tag.findOneAndDelete({ user_id: uid, text: tagText });
    } catch (err) {
      console.error("Ошибка при удалении тега");
      throw err;
    }
  }

  async findUsers(
    globalSearch,
    cityFilter,
    minAgeFilter,
    maxAgeFilter,
    genderFilter,
    nicknameFilter,
    requesterUid,
    page,
    limit,
    needMutual,
    sortBy = ""
  ) {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();

      const filter = {};

      // исключить пользователя который запрашивает
      if (requesterUid) {
        filter._id = { $ne: new mongoose.Types.ObjectId(requesterUid) };
      }

      if (globalSearch) {
        const { foundFriends } = await this.getFriends(requesterUid);

        foundFriends.push(new mongoose.Types.ObjectId(requesterUid));

        if (foundFriends.length > 0) {
          filter._id = { $nin: foundFriends };
        }
      } else {
        const { foundFriends } = await this.getFriends(requesterUid);

        needMutual = false;

        if (foundFriends.length > 0) {
          filter._id = { $in: foundFriends };
        } else {
          return {
            users: [],
            hasMore: false,
          };
        }
      }

      // если передан пол
      if (genderFilter && genderFilter !== "any") {
        filter.gender = genderFilter;
      }

      // если передан возраст
      if (minAgeFilter !== 14 || maxAgeFilter !== 100) {
        const minBirthDate = new Date(currentYear - maxAgeFilter, 0, 1);
        const maxBirthDate = new Date(currentYear - minAgeFilter, 11, 31);

        filter.b_date = {
          $gte: minBirthDate,
          $lte: maxBirthDate,
        };
      }

      // если передан никнейм
      if (nicknameFilter) {
        filter.nickname = new RegExp(nicknameFilter, "i");
      }

      // сортировка
      let sort = {};
      if (sortBy.length) {
        if (sortBy.includes("age_asc")) {
          sort.b_date = -1;
        } else if (sortBy.includes("age_desc")) {
          sort.b_date = 1;
        }
      }

      let users = await User.aggregate([
        {
          $lookup: {
            from: "addresses",
            localField: "_id",
            foreignField: "user_id",
            as: "address",
          },
        },
        {
          $unwind: {
            path: "$address",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "avatars",
            localField: "_id",
            foreignField: "user_id",
            as: "avatar",
          },
        },
        {
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: cityFilter ? { "address.city": cityFilter } : {},
        },
        {
          $match: filter,
        },
        {
          $project: {
            nickname: 1,
            nickname_color: 1,
            gender: 1,
            b_date: 1,
            "address.city": 1,
            "address.country": 1,
            "address.country_code": 1,
            "avatar.asset_url": 1,
          },
        },
        ...(sortBy.length ? [{ $sort: sort }] : []),
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit + 1,
        },
      ]);

      const hasMore = users.length > limit;

      if (hasMore) users.pop();

      if (needMutual) {
        users = await Promise.all(
          users.map(async (user) => {
            const mutualSnap = await this.getMutualFriendsDetailed(requesterUid, user._id, false, "short");
            const isIncoming = await this.isIncomingFriendReq(requesterUid, user._id, requesterUid);
            const isOutgoing = await this.isOutgoingFriendReq(requesterUid, requesterUid, user._id);

            return { ...user, mutual: mutualSnap, isIncoming, isOutgoing };
          })
        );

        if (!sortBy.includes("age_")) {
          users.sort((a, b) => b.mutual.amount - a.mutual.amount);
        }
      }

      return {
        users,
        hasMore,
      };
    } catch (err) {
      console.error("Ошибка при поиске пользователей");
      throw err;
    }
  }

  async isUserExists(uid) {
    try {
      if (!mongoose.Types.ObjectId.isValid(uid)) return false;

      const userExists = await User.exists({ _id: uid });
      return !!userExists;
    } catch (err) {
      console.error("Ошибка при проверке существования пользователя");
      throw err;
    }
  }

  async createFriendReq(initiator, sender, recipient) {
    try {
      const newFriendReq = new friendRequest({ initiator_id: initiator, sender_id: sender, recipient_id: recipient });
      await newFriendReq.save();
    } catch (err) {
      console.error("Ошибка при создании заявки");
      throw err;
    }
  }

  async isIncomingFriendReq(currentUserId, sender, recipient) {
    try {
      const requestExists = await friendRequest.exists({ sender_id: sender, recipient_id: recipient });
      return requestExists && recipient.toString() === currentUserId.toString();
    } catch (err) {
      console.error("Ошибка при проверке входящей заявки");
      throw err;
    }
  }

  async isOutgoingFriendReq(currentUserId, sender, recipient) {
    try {
      const requestExists = await friendRequest.exists({ sender_id: sender, recipient_id: recipient });
      return requestExists && sender.toString() === currentUserId.toString();
    } catch (err) {
      console.error("Ошибка при проверке исходящей заявки");
      throw err;
    }
  }

  async isFriendReqExist(initiator, sender, recipient) {
    try {
      const requestExists = await friendRequest.exists({ initiator_id: initiator, sender_id: sender, recipient_id: recipient });
      return !!requestExists;
    } catch (err) {
      console.error("Ошибка при проверке существования заявки");
      throw err;
    }
  }

  async deleteFriendReq(initiator, sender, recipient) {
    try {
      await friendRequest.findOneAndDelete({ initiator_id: initiator, sender_id: sender, recipient_id: recipient });
    } catch (err) {
      console.error("Ошибка при удалении заявки");
      throw err;
    }
  }

  async createFriendship(sender, recipient) {
    try {
      const newFriendship = new Friend({
        user1_id: sender,
        user2_id: recipient,
      });

      await newFriendship.save();
    } catch (err) {
      console.error("Ошибка при создании дружбы");
      throw err;
    }
  }

  async isFriendshipExists(userId1, userId2) {
    try {
      const friendship = await Friend.findOne({
        $or: [
          { user1_id: userId1, user2_id: userId2 },
          { user1_id: userId2, user2_id: userId1 },
        ],
      });

      return !!friendship;
    } catch (err) {
      console.error("Ошибка при проверке существования дружбы");
      throw err;
    }
  }

  async deleteFriendship(sender, recipient) {
    try {
      await Friend.findOneAndDelete({
        $or: [
          { user1_id: sender, user2_id: recipient },
          { user1_id: recipient, user2_id: sender },
        ],
      });
    } catch (err) {
      console.error("Ошибка при удалении дружбы");
      throw err;
    }
  }

  async getFriendReqsDetailed(needMutual, uid, mode, page = 1, limit = 10) {
    try {
      const matchFilter = {};

      if (mode === "incoming") {
        matchFilter.recipient_id = new mongoose.Types.ObjectId(uid);
      } else if (mode === "outgoing") {
        matchFilter.initiator_id = new mongoose.Types.ObjectId(uid);
      } else {
        new Error("Некорректный mode");
      }

      let friendRequests = await friendRequest.aggregate([
        {
          $match: matchFilter,
        },
        {
          $lookup: {
            from: "users",
            localField: mode === "incoming" ? "initiator_id" : "recipient_id",
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
            from: "addresses",
            localField: mode === "incoming" ? "initiator_id" : "recipient_id",
            foreignField: "user_id",
            as: "address",
          },
        },
        {
          $unwind: {
            path: "$address",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "avatars",
            localField: mode === "incoming" ? "initiator_id" : "recipient_id",
            foreignField: "user_id",
            as: "avatar",
          },
        },
        {
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            initiator_id: 1,
            sender_id: 1,
            recipient_id: 1,
            send_time: 1,
            "userInfo.nickname": 1,
            "userInfo.nickname_color": 1,
            "userInfo.gender": 1,
            "userInfo.b_date": 1,
            "address.city": 1,
            "address.country": 1,
            "address.country_code": 1,
            "avatar.asset_url": 1,
          },
        },
        {
          $sort: { send_time: -1 },
        },
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit + 1,
        },
      ]);

      const hasMore = friendRequests.length > limit;

      if (hasMore) {
        friendRequests.pop();
      }

      if (needMutual) {
        friendRequests = await Promise.all(
          friendRequests.map(async (req) => {
            const mutualSnap = await this.getMutualFriendsDetailed(
              mode === "incoming" ? req.recipient_id : req.sender_id,
              mode === "incoming" ? req.sender_id : req.recipient_id,
              false,
              "short"
            );

            return { ...req, mutual: mutualSnap };
          })
        );
      }

      return {
        friendRequests,
        hasMore,
      };
    } catch (err) {
      console.error("Ошибка при получении заявок дружбы и информации о них");
      throw err;
    }
  }

  async getOneFriendReqDetailed(needMutual, initiatorId, senderId, recipientId) {
    try {
      if (!initiatorId || !senderId || !recipientId) {
        new Error("Отсутствуют обязательные параметры");
      }

      const matchFilter = {
        initiator_id: new mongoose.Types.ObjectId(initiatorId),
        sender_id: new mongoose.Types.ObjectId(senderId),
        recipient_id: new mongoose.Types.ObjectId(recipientId),
      };

      let foundRequest = await friendRequest.aggregate([
        {
          $match: matchFilter,
        },
        {
          $lookup: {
            from: "users",
            localField: "initiator_id",
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
            from: "addresses",
            localField: "initiator_id",
            foreignField: "user_id",
            as: "address",
          },
        },
        {
          $unwind: {
            path: "$address",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "avatars",
            localField: "initiator_id",
            foreignField: "user_id",
            as: "avatar",
          },
        },
        {
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            initiator_id: 1,
            sender_id: 1,
            recipient_id: 1,
            send_time: 1,
            "userInfo.nickname": 1,
            "userInfo.nickname_color": 1,
            "userInfo.gender": 1,
            "userInfo.b_date": 1,
            "address.city": 1,
            "address.country": 1,
            "address.country_code": 1,
            "avatar.asset_url": 1,
          },
        },
      ]);

      if (needMutual) {
        foundRequest = await Promise.all(
          foundRequest.map(async (req) => {
            const mutualSnap = await this.getMutualFriendsDetailed(senderId, recipientId, false, "short");

            return { ...req, mutual: mutualSnap };
          })
        );
      }

      return foundRequest.length > 0 ? foundRequest[0] : null;
    } catch (err) {
      console.error("Ошибка при получении одной заявки О дружбе и информации о ней");
      throw err;
    }
  }

  async getMutualFriendsDetailed(mutualCallerUid, searchingUid, needPagination = false, mode = "short", page, limit) {
    try {
      if (mode !== "short" && mode !== "expand") {
        new Error("Отсутствуют обязательные параметры");
      }

      const { foundFriends } = await this.getFriends(searchingUid);

      const { mutualFriends, hasMore } = await this.getFriendsMutual(foundFriends, mutualCallerUid, needPagination, page, limit);

      const limitedMutualFriends = mode === "short" ? mutualFriends.slice(0, 3) : mutualFriends;

      const detailedMutual = await User.aggregate([
        {
          $match: {
            _id: { $in: limitedMutualFriends },
          },
        },
        {
          $lookup: {
            from: "avatars",
            localField: "_id",
            foreignField: "user_id",
            as: "avatar",
          },
        },
        { $unwind: { path: "$avatar", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            nickname: 1,
            nickname_color: 1,
            "avatar.asset_url": 1,
          },
        },
      ]);

      return {
        mFriends: detailedMutual,
        amount: mutualFriends.length,
        hasMore: needPagination ? hasMore : null,
      };
    } catch (err) {
      console.error("Ошибка при получении общих друзей c информацией о них");
      throw err;
    }
  }
  async getFriends(searchingUid) {
    try {
      const friendsOfSearchingUser = await Friend.aggregate([
        {
          $match: {
            $or: [{ user1_id: new mongoose.Types.ObjectId(searchingUid) }, { user2_id: new mongoose.Types.ObjectId(searchingUid) }],
          },
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $project: {
            friendId: {
              $cond: {
                if: { $eq: ["$user1_id", new mongoose.Types.ObjectId(searchingUid)] },
                then: "$user2_id",
                else: "$user1_id",
              },
            },
            _id: 0,
          },
        },
      ]);

      const foundFriends = friendsOfSearchingUser.map((f) => f.friendId);

      return {
        foundFriends,
      };
    } catch (err) {
      console.error("Ошибка при получении друзей");
      throw err;
    }
  }

  async getFriendsWithPagination(searchingUid, q, page = 1, limit = 10) {
    try {
      const friends = await Friend.aggregate([
        {
          $match: {
            $or: [{ user1_id: new mongoose.Types.ObjectId(searchingUid) }, { user2_id: new mongoose.Types.ObjectId(searchingUid) }],
          },
        },
        {
          $project: {
            friendId: {
              $cond: {
                if: { $eq: ["$user1_id", new mongoose.Types.ObjectId(searchingUid)] },
                then: "$user2_id",
                else: "$user1_id",
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "friendId",
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
            localField: "friendId",
            foreignField: "user_id",
            as: "avatar",
          },
        },
        {
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit + 1,
        },
        {
          $project: {
            _id: 0,
            user_id: "$userInfo._id",
            nickname: "$userInfo.nickname",
            nickname_color: "$userInfo.nickname_color",
            avatar: "$avatar.asset_url",
          },
        },
      ]);

      const hasMore = friends.length > limit;

      if (hasMore) {
        friends.pop();
      }

      return {
        friends,
        hasMore,
      };
    } catch (err) {
      console.error("Ошибка при получении друзей с пагинацией", err);
      throw err;
    }
  }

  async getFriendsMutual(friendIds, mutualCallerUid, needPagination, page, limit) {
    try {
      let pagination;

      if (needPagination) {
        pagination = [{ $skip: (page - 1) * limit }, { $limit: limit + 1 }];
      } else {
        pagination = [];
      }

      let mutualFriends = await Friend.aggregate([
        {
          $match: {
            $or: [
              { user1_id: { $in: friendIds }, user2_id: new mongoose.Types.ObjectId(mutualCallerUid) },
              { user2_id: { $in: friendIds }, user1_id: new mongoose.Types.ObjectId(mutualCallerUid) },
            ],
          },
        },
        ...pagination,
      ]);

      mutualFriends = mutualFriends.map((friend) => (friend.user1_id.equals(mutualCallerUid) ? friend.user2_id : friend.user1_id));

      const hasMore = needPagination && mutualFriends.length > limit;

      if (hasMore) {
        mutualFriends.pop();
      }

      return {
        mutualFriends,
        hasMore,
      };
    } catch (err) {
      console.error("Ошибка при получении общих друзей");
      throw err;
    }
  }

  async getOneFriendById(requesterUid, targetUid, needMutual = false) {
    try {
      const filter = { _id: new mongoose.Types.ObjectId(targetUid) };

      let user = await User.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "addresses",
            localField: "_id",
            foreignField: "user_id",
            as: "address",
          },
        },
        {
          $unwind: {
            path: "$address",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "avatars",
            localField: "_id",
            foreignField: "user_id",
            as: "avatar",
          },
        },
        {
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            nickname: 1,
            nickname_color: 1,
            gender: 1,
            b_date: 1,
            "address.city": 1,
            "address.country": 1,
            "address.country_code": 1,
            "avatar.asset_url": 1,
          },
        },
      ]);

      if (user.length === 0) {
        return null;
      }

      if (needMutual) {
        user.mutual = await this.getMutualFriendsDetailed(requesterUid, targetUid, false, "short");
        user.isIncoming = await this.isIncomingFriendReq(requesterUid, targetUid, requesterUid);
        user.isOutgoing = await this.isOutgoingFriendReq(requesterUid, requesterUid, targetUid);
      }

      return user;
    } catch (err) {
      console.error("Ошибка при поиске пользователя по ID");
      throw err;
    }
  }

  async getReqsAmount(uid) {
    if (!mongoose.Types.ObjectId.isValid(uid)) throw new Error("Не передан uid");

    try {
      const count = await friendRequest.countDocuments({ recipient_id: uid });
      return count > 0 ? count : null;
    } catch (err) {
      console.error("Ошибка получении общего кол-ва заявко в друзья для пользователя");
      throw err;
    }
  }

  //сессии

  async getUserPassword(uid) {
    if (!mongoose.Types.ObjectId.isValid(uid)) throw new Error("Не передан uid");

    try {
      const { password } = await User.findById(uid).select("password -_id").lean();
      return password.toString();
    } catch (err) {
      console.error("Ошибка получении пароля пользователя");
      throw err;
    }
  }

  async changeUserPassword(uid, newPassword) {
    if (!mongoose.Types.ObjectId.isValid(uid)) throw new Error("Не передан uid");

    try {
      await User.findByIdAndUpdate(uid, { password: newPassword });
    } catch (err) {
      console.error("Ошибка изменении пароля пользователя");
      throw err;
    }
  }

  async getActiveSessions(uid, refreshToken, limit, page) {
    if (!mongoose.Types.ObjectId.isValid(uid)) throw new Error("Не передан корректный uid");

    try {
      const decodedRefreshToken = jwtService.verifyRefreshToken(refreshToken);

      const [sessions, activeSession] = await Promise.all([
        Token.aggregate([
          {
            $match: {
              user_id: new mongoose.Types.ObjectId(uid),
              device: { $ne: decodedRefreshToken.device_info },
            },
          },
          {
            $project: {
              _id: 1,
              user_id: 1,
              device: 1,
              created: 1,
            },
          },
          {
            $sort: { created: -1 },
          },
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: limit + 1,
          },
        ]),
        Token.findOne({ user_id: new mongoose.Types.ObjectId(uid), device: decodedRefreshToken.device_info })
          .select("_id user_id device created")
          .lean(),
      ]);

      if (!activeSession) throw new Error("Активная сесссия не найдена");

      const hasMore = sessions.length > limit;

      if (hasMore) {
        sessions.pop();
      }

      return { active: activeSession, sessions, hasMore };
    } catch (err) {
      console.error("Ошибка при получении активных сессий пользователя:", err);
      throw err;
    }
  }

  async deleteSession(id, uid) {
    if (!mongoose.Types.ObjectId.isValid(uid) || !mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Некорректный id пользователя или id сессии");
    }

    try {
      const token = await Token.findById(id);

      if (!token) {
        throw new Error("Сессия не найдена");
      }

      if (token.user_id.toString() !== uid) {
        throw new Error("Нет прав для удаления этой сессии");
      }

      await Token.findByIdAndDelete(id);
      return token;
    } catch (err) {
      console.error("Ошибка при удалении сессии пользователя:", err);
      throw err;
    }
  }

  async getSession(id, uid, refreshToken) {
    if (!mongoose.Types.ObjectId.isValid(uid)) throw new Error("Не передан корректный uid");

    try {
      console.log(id, uid, refreshToken);

      const decodedRefreshToken = jwtService.verifyRefreshToken(refreshToken);
      const token = await Token.findById(id);

      let match = false;
      if ((uid === decodedRefreshToken.uid) === token.user_id.toString() && decodedRefreshToken.device_info === token.device) {
        match = true;
      }

      return { token: { _id: token._id, device: token.device }, match };
    } catch (err) {
      console.error("Ошибка при получении сессии пользователя:", err);
      throw err;
    }
  }
}

module.exports = new UserService();
