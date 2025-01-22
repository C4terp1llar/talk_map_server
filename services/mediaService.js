const fs = require('fs');
const path = require('path');
const {PutObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const {v4: uuidv4} = require('uuid');
const s3Client = require('../utils/s3Client');
const mongoose = require("mongoose");
const normalizeFileName = require('../utils/normalizeFile');

const Photo = require('../models/photoModel');
const Media = require('../models/mediaModel');
const User = require('../models/userModel');
const Reaction = require('../models/reactionModel');
const Post = require('../models/postModel');
const Comment = require('../models/commentModel');

const UserService = require('../services/userService')
const wsServer = require("../utils/wsServer");

const asyncTaskRunner = require("../utils/asyncTaskRunner");

class MediaService {
    async uploadToS3(file, uuid) {
        const fileType = file.mimetype || 'application/octet-stream';
        const uniqueFileName = `${uuidv4()}-${normalizeFileName(file.originalFilename)}`;
        const objectKey = `${uuid}/${uniqueFileName}`;

        const contentDisposition = fileType.startsWith("image/") ? "inline" : "attachment";
        const fileStream = fs.createReadStream(file.filepath);

        const uploadParams = {
            Bucket: 'talkmap-multimedia-storage',
            Key: objectKey,
            Body: fileStream,
            ContentType: fileType,
            ContentDisposition: contentDisposition,
        };

        try {
            await s3Client.send(new PutObjectCommand(uploadParams));
            const fileUrl = `https://storage.yandexcloud.net/talkmap-multimedia-storage/${objectKey}`;
            return {
                client_filename: file.originalFilename,
                client_file_type: file.mimetype,
                client_file_size: file.size,
                store_filename: uniqueFileName,
                store_url: fileUrl,
            };
        } catch (err) {
            console.error("Ошибка при загрузке файлов на S3", err);
            throw err;
        } finally {
            fileStream.destroy();
            try {
                if (fs.existsSync(file.filepath)) {
                    await fs.promises.unlink(file.filepath);
                }
            } catch (unlinkError) {
                console.error("Ошибка при удалении временного файла:", unlinkError);
            }
        }
    }

    async uploadBase64ToS3(base64Data, uuid) {
        const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error("Неверный формат Base64 данных");
        }

        const mimeType = matches[1]; 
        const base64Content = matches[2]; 

        const tempFileName = `${uuidv4()}.${mimeType.split('/')[1]}`; 
        const tempFilePath = path.join('./uploads', tempFileName);

        try {
            const buffer = Buffer.from(base64Content, 'base64');
            await fs.promises.writeFile(tempFilePath, buffer);

            const file = {
                filepath: tempFilePath,
                mimetype: mimeType,
                originalFilename: tempFileName,
                size: buffer.length,
            };

            return await this.uploadToS3(file, uuid);
        } catch (err) {
            console.error("Ошибка при обработке Base64 и загрузке на S3:", err);
            throw err;
        } finally {
            try {
                if (fs.existsSync(tempFilePath)) {
                    await fs.promises.unlink(tempFilePath);
                }
            } catch (unlinkError) {
                console.error("Ошибка при удалении временного файла:", unlinkError);
            }
        }
    }

    async createMedia(user_id, client_filename, client_file_type, client_file_size, store_filename, store_url) {
        try {
            const media = new Media({
                user_id,
                client_filename,
                client_file_type,
                client_file_size,
                store_filename,
                store_url
            });
            return await media.save();
        } catch (err) {
            console.error("Ошибка при создании медиа");
            throw err;
        }
    }

    async createPhoto(user_id, media_id, url) {
        try {
            const photo = new Photo({user_id, media_id, url});
            return await photo.save();
        } catch (err) {
            console.error("Ошибка при создании фото");
            throw err;
        }
    }

    async getPhotos(user_id, page = 1, limit = 10, sort) {
        try {
            let sortOptions = {createdAt: -1}

            if (sort && sort === 'publish_asc') {
                sortOptions = {createdAt: 1}
            }

            const photos = await Photo.aggregate([
                {$match: {user_id: new mongoose.Types.ObjectId(user_id)}},
                {
                    $project: {
                        _id: 1,
                        user_id: 1,
                        media_id: 1,
                        url: 1,
                        createdAt: 1,
                    },
                },
                {
                    $sort: sortOptions
                },
                {
                    $skip: (page - 1) * limit,
                },
                {
                    $limit: limit + 1,
                }
            ]);

            const hasMore = photos.length > limit;

            if (hasMore) {
                photos.pop();
            }

            return {photos, hasMore}

        } catch (err) {
            console.error("Ошибка при получении всех фотографий");
            throw err;
        }
    }

    async deletePhoto(photoId) {
        try {
            const photo = await Photo.findById(photoId);
            const media = await Media.findById(photo.media_id);

            await s3Client.send(new DeleteObjectCommand({
                Bucket: 'talkmap-multimedia-storage',
                Key: `${media.user_id}/${media.store_filename}`,
            }));

            await Promise.all([
                Photo.deleteOne({_id: photoId}),
                Media.deleteOne({_id: media._id}),
                Reaction.deleteMany({entityType: 'Photo', entityId: photoId})
            ])

        } catch (err) {
            console.error("Ошибка при удалении фото:", err);
            throw err;
        }
    }

    async getPhotoById(photoId, uid) {
        if (!mongoose.Types.ObjectId.isValid(uid) || !mongoose.Types.ObjectId.isValid(photoId)) return null;

        try {
            const photo = await Photo.aggregate([
                {
                    $match: { _id: new mongoose.Types.ObjectId(photoId) }
                },
                {
                    $lookup: {
                        from: 'media',
                        localField: 'media_id',
                        foreignField: '_id',
                        as: 'media_info',
                    }
                },
                {
                    $unwind: { path: '$media_info', preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user_info',
                    }
                },
                {
                    $unwind: { path: '$user_info', preserveNullAndEmptyArrays: true }
                },
                {
                    $addFields: {
                        mode: {
                            $cond: {
                                if: { $eq: ["$user_id", new mongoose.Types.ObjectId(uid)] },
                                then: "internal",
                                else: "external"
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        url: 1,
                        user_id: 1,
                        createdAt: 1,
                        media_id: "$media_info._id",
                        nickname: "$user_info.nickname",
                        nickname_color: "$user_info.nickname_color",
                        mode: 1
                    }
                }
            ]);

            if (!photo[0]) return null;

            const [likesCount, userReaction] = await Promise.all([
                Reaction.countDocuments({ entityType: "Photo", entityId: photoId }),
                Reaction.findOne({ entityType: "Photo", entityId: photoId, userId: uid }).lean()
            ]);

            return {
                ...photo[0],
                likesCount,
                liked: !!userReaction
            };
        } catch (err) {
            console.error(`Ошибка при получении фото с ID ${photoId}:`, err);
            throw err;
        }
    }

    async getPhotoGuessList(photoId){
        try {
            const photo = await Photo.findById(photoId);

            if (!photo) {
                return []
            }

            const photos = await Photo.aggregate([
                { $match: { user_id: new mongoose.Types.ObjectId(photo.user_id) } },
                { $sort: { createdAt: -1 } }
            ]);

            return photos.map(photo => photo._id);

        } catch (err) {
            console.error(`Ошибка при получении списка фотографий пользователя`);
            throw err;
        }
    }

    async reactAction (entityType, entityId, userId){
        try{

            let entityModel;

            switch (entityType) {
                case 'Post':
                    entityModel = Post;
                    break;
                case 'Comment':
                    entityModel = Comment;
                    break;
                case 'Photo':
                    entityModel = Photo;
                    break;
                default:
                    throw new Error('Неподдерживаемый тип сущности');
            }

            const entity = await entityModel.findById(entityId);
            if (!entity) {
                return null
            }

            const exist = await Reaction.exists({ entityType, entityId, userId });

            if (exist) {
                await Reaction.deleteOne({ entityType, entityId, userId });
            } else {
                await Reaction.create({ entityType, entityId, userId });
            }

            return !!exist
        }catch (err) {
            console.error('Ошибка при действии с реакцией');
            throw err;
        }
    }

    async createPost (user_id, text, media){
        try{
            return await Post.create({ user_id, text, media: media || [] });

        }catch (err) {
            console.error('Ошибка при создании поста');
            throw err;
        }
    }

    async getPosts(postOwnerUid, requesterUserUid, page = 1, limit = 15, postId) {
        try {
            let currentOwner = postOwnerUid
            let matchCase = { user_id: new mongoose.Types.ObjectId(postOwnerUid) }

            if (postId) {
                if (!mongoose.Types.ObjectId.isValid(postId)) return {posts: [], ownerInfo: null};
                const post = await Post.findById(postId).lean();
                if (!post) return {posts: [], ownerInfo: null};

                currentOwner = post.user_id.toString();
                matchCase = { _id: new mongoose.Types.ObjectId(postId) };
            }


            const [posts, postOwnerInfo, postOwnerAvatar] = await Promise.all([
                await Post.aggregate([
                    {
                        $match: matchCase
                    },
                    {
                        $lookup: {
                            from: 'media',
                            localField: 'media',
                            foreignField: '_id',
                            as: 'media_info',
                        },
                    },
                    {
                        $addFields: {
                            media_info: {
                                $map: {
                                    input: '$media_info',
                                    as: 'media',
                                    in: {
                                        id: '$$media._id',
                                        url: '$$media.store_url',
                                        type: '$$media.client_file_type',
                                    },
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'reactions',
                            let: { postId: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$entityId', '$$postId'] },
                                        entityType: 'Post',
                                    },
                                },
                                {
                                    $group: {
                                        _id: null,
                                        count: { $sum: 1 }
                                    },
                                },
                            ],
                            as: 'reactions_info',
                        },
                    },
                    {
                        $lookup: {
                            from: 'reactions',
                            let: { postId: '$_id', requesterId: new mongoose.Types.ObjectId(requesterUserUid) },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ['$entityId', '$$postId'] },
                                                { $eq: ['$userId', '$$requesterId'] },
                                                { $eq: ['$entityType', 'Post'] },
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: 'liked_info',
                        },
                    },
                    {
                        $lookup: {
                            from: 'comments',
                            let: { postId: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ['$entityId', '$$postId'] },
                                                { $eq: ['$entityType', 'Post'] },
                                            ],
                                        },
                                    },
                                },
                                {
                                    $count: 'count',
                                },
                            ],
                            as: 'comments_info',
                        },
                    },
                    {
                        $addFields: {
                            likes_count: {
                                $ifNull: [{ $arrayElemAt: ['$reactions_info.count', 0] }, 0]
                            },
                            liked: {
                                $gt: [{ $size: '$liked_info' }, 0]
                            },
                            comments_count: {
                                $ifNull: [{ $arrayElemAt: ['$comments_info.count', 0] }, 0],
                            },
                            mode: {
                                $cond: {
                                    if: { $eq: [currentOwner, requesterUserUid] },
                                    then: 'internal',
                                    else: 'external',
                                },
                            },
                        },
                    },
                    {
                        $sort: { createdAt: -1 },
                    },
                    {
                        $skip: (page - 1) * limit,
                    },
                    {
                        $limit: limit + 1,
                    },
                    {
                        $project: {
                            _id: 1,
                            user_id: 1,
                            text: 1,
                            createdAt: 1,
                            media: '$media_info',
                            likes_count: 1,
                            comments_count: 1,
                            liked: 1,
                            mode: 1
                        }
                    }
                ]),
                await User.findById(currentOwner).select('_id nickname nickname_color').lean(),
                await UserService.getUserAvatar(currentOwner)
            ])


            const ownerInfo = {
                _id: postOwnerInfo._id,
                nickname: postOwnerInfo.nickname,
                nickname_color: postOwnerInfo.nickname_color,
                avatar: postOwnerAvatar.asset_url,
                match: currentOwner === requesterUserUid
            }

            const hasMore = posts.length > limit;
            if (hasMore) {
                posts.pop();
            }

            return { posts, hasMore, ownerInfo };

        } catch (err) {
            console.error('Ошибка при получении постов:', err);
            throw err;
        }
    }

    async deletePost(postId, uid) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const post = await Post.findById(postId).session(session);
            if (!post) {
                throw new Error('Пост не найден');
            }

            if (post.user_id.toString() !== uid) {
                throw new Error('Нет доступа для удаления этого поста');
            }

            const mediaList = await Media.find({ _id: { $in: post.media } }).session(session);

            if (mediaList.length > 0) {
                await Promise.all(
                    mediaList.map(media =>
                        s3Client.send(new DeleteObjectCommand({
                            Bucket: 'talkmap-multimedia-storage',
                            Key: `${media.user_id}/${media.store_filename}`,
                        }))
                    )
                );
            }

            await Promise.all([
                Post.findByIdAndDelete(postId).session(session),
                Media.deleteMany({ _id: { $in: post.media } }).session(session),
                Reaction.deleteMany({ entityType: 'Post', entityId: postId }).session(session),
                Comment.deleteMany({entityType: 'Post', entityId: postId}).session(session)
            ]);

            await session.commitTransaction();
            await session.endSession();
        } catch (err) {
            await session.abortTransaction();
            await session.endSession();
            console.error('Ошибка при удалении поста:', err);
            throw err;
        }
    }

    //requesterUserUid, entityType, entityId, +page, +limit, parentCommentId
    async getComments(requester, entityType, entityId, page = 1, limit = 15, parentCommentId = null) {
        try{

            const matchStage = {
                entityType: entityType,
                entityId: new mongoose.Types.ObjectId(entityId),
                parentCommentId: parentCommentId ? new mongoose.Types.ObjectId(parentCommentId) : null,
            };

            const pipeline = [
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'userInfo',
                    },
                },
                {
                    $addFields: {
                        userInfo: { $arrayElemAt: ['$userInfo', 0] },
                    },
                },
                {
                    $lookup: {
                        from: 'avatars',
                        localField: 'userInfo._id',
                        foreignField: 'user_id',
                        as: 'avatarInfo',
                    },
                },
                {
                    $addFields: {
                        avatarInfo: { $arrayElemAt: ['$avatarInfo', 0] },
                    },
                },
                {
                    $addFields: {
                        mode: {
                            $cond: {
                                if: { $eq: ['$user_id', new mongoose.Types.ObjectId(requester)] },
                                then: 'internal',
                                else: 'external',
                            },
                        },
                        user: {
                            _id: '$userInfo._id',
                            nickname: '$userInfo.nickname',
                            nickname_color: '$userInfo.nickname_color',
                            avatar: '$avatarInfo.asset_url',
                        },
                    },
                },
                { $sort: { createdAt: 1 } },
                {
                    $project: {
                        entityId: 1,
                        entityType: 1,
                        parentCommentId: 1,
                        text: 1,
                        isEdited: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        isDeleted: 1,
                        mode: 1,
                        user: 1
                    }
                },
                { $skip: (page - 1) * limit },
                { $limit: limit + 1 },
            ];

            if (!parentCommentId) {
                pipeline.push({
                    $lookup: {
                        from: 'comments',
                        localField: '_id',
                        foreignField: 'parentCommentId',
                        as: 'replies',
                    },
                });

                pipeline.push({
                    $addFields: {
                        repliesCount: { $size: '$replies' },
                    },
                });

                pipeline.push({
                    $project: {
                        replies: 0,
                    },
                });
            }

            const comments = await Comment.aggregate([...pipeline]);

            const hasMore = comments.length > limit;
            if (hasMore) {
                comments.pop();
            }

            return {
                comments,
                hasMore,
            };
        }catch (err){
            console.error('Ошибка при получении комментариев:', err);
            throw err;
        }
    }

    async getCommentById(requester, commentId) {
        try {
            const pipeline = [
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(commentId),
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'userInfo',
                    },
                },
                {
                    $addFields: {
                        userInfo: { $arrayElemAt: ['$userInfo', 0] },
                    },
                },
                {
                    $lookup: {
                        from: 'avatars',
                        localField: 'userInfo._id',
                        foreignField: 'user_id',
                        as: 'avatarInfo',
                    },
                },
                {
                    $addFields: {
                        avatarInfo: { $arrayElemAt: ['$avatarInfo', 0] },
                    },
                },
                {
                    $addFields: {
                        mode: {
                            $cond: {
                                if: { $eq: ['$user_id', new mongoose.Types.ObjectId(requester)] },
                                then: 'internal',
                                else: 'external',
                            },
                        },
                        user: {
                            _id: '$userInfo._id',
                            nickname: '$userInfo.nickname',
                            nickname_color: '$userInfo.nickname_color',
                            avatar: '$avatarInfo.asset_url',
                        },
                    },
                },
                {
                    $lookup: {
                        from: 'comments',
                        localField: '_id',
                        foreignField: 'parentCommentId',
                        as: 'replies',
                    },
                },
                {
                    $addFields: {
                        repliesCount: { $size: '$replies' },
                    },
                },
                {
                    $project: {
                        entityId: 1,
                        entityType: 1,
                        parentCommentId: 1,
                        text: 1,
                        isEdited: 1,
                        isDeleted: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        mode: 1,
                        user: 1,
                        repliesCount: 1,
                    },
                },
            ];

            const comment = await Comment.aggregate(pipeline);

            if (!comment || comment.length === 0) {
                return null
            }

            return comment[0];
        } catch (err) {
            console.error('Ошибка при получении комментария по ID:', err);
            throw err;
        }
    }

    async createComment(entityType, entityId, userId, text, parentCommentId = null){
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('Пользователь не найден');
            }

            let entityModel;

            switch (entityType) {
                case 'Post':
                    entityModel = Post;
                    break;
                case 'Comment':
                    entityModel = Comment;
                    break;
                // case 'Publication':
                //     entityModel = Publication;
                //     break;
                default:
                    throw new Error('Неподдерживаемый тип сущности');
            }

            const parentEntity = await entityModel.findById(entityId);

            if (!parentEntity) {
                throw new Error('Родительская сущность не найдена');
            }

            if (parentCommentId) {
                const parentComment = await Comment.findById(parentCommentId);

                if (!parentComment) {
                    throw new Error('Родительский комментарий не найден');
                }

                if (parentComment.entityType !== entityType || parentComment.entityId.toString() !== entityId.toString()) {
                    throw new Error('Родительский комментарий не относится к данной сущности');
                }
            }

            const newComment = new Comment({
                entityType,
                entityId,
                parentCommentId,
                user_id: userId,
                text,
            });

            await newComment.save();
            return newComment;
        } catch (err) {
            console.error('Ошибка при создании комментария:', err);
            throw err;
        }
    }

    async getMediaOwnerWsInfo(entityType, entityId){
        try{
            let entityModel;
            switch (entityType) {
                case 'Post':
                    entityModel = Post;
                    break;
                case 'Photo':
                    entityModel = Photo;
                    break;
                case 'Comment':
                    entityModel = Comment;
                    break;
                default:
                    throw new Error('Неподдерживаемый тип сущности');
            }

            return await entityModel.findById(entityId);
        }catch(err){
            console.error('Ошибка при поиске инфы о юзере при ws уведомлении:', err);
            throw err;
        }
    }

    async deleteComment(commentId, requester){
        try{
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Комментарий не найден')
            }
            if (comment.user_id.toString() !== requester){
                throw new Error('Нет прав на удаление комментария')
            }

            const hasReplies = await Comment.exists({ parentCommentId: commentId });

            if (hasReplies) {
                await Comment.findByIdAndUpdate(commentId, { isDeleted: true, text: '[Комментарий удален]' });

                asyncTaskRunner(async () => {
                    const comment = await this.getCommentById(requester, commentId)
                    if(comment){
                        wsServer.emitToUser(
                            null, `reload_comments`,
                            {comment: comment, entity_id: comment.entityId, comment_id: commentId, act: 'change', mode: comment.parentCommentId ? 'replies' : 'comments', parentCommentId: comment.parentCommentId},
                            requester
                        );
                    }
                })

                return { success: true, act: 'markDeleted' };
            } else {
                asyncTaskRunner(async () => {
                    wsServer.emitToUser(null, `reload_comments`, {entity_id: comment.entityId, comment_id: comment._id, act: 'dec', mode: comment.parentCommentId ? 'replies' : 'comments', parentCommentId: comment.parentCommentId}, requester);
                })

                await Comment.findByIdAndDelete(commentId);

                if (comment.parentCommentId) {
                    const parentId = comment.parentCommentId;

                    const remainingReplies = await Comment.countDocuments({ parentCommentId: parentId });

                    if (remainingReplies === 0) {
                        const parentComment = await Comment.findById(parentId);

                        if (parentComment && parentComment.isDeleted) {
                            asyncTaskRunner(async () => {
                                wsServer.emitToUser(null, `reload_comments`, {entity_id: parentComment.entityId, comment_id: parentComment._id, act: 'dec', mode: parentComment.parentCommentId ? 'replies' : 'comments', parentCommentId: parentComment.parentCommentId}, requester);
                            })
                            await Comment.findByIdAndDelete(parentId);
                            return { success: true, act: 'deletedParent' };
                        }
                    }
                }

                return { success: true, act: 'deleted' };
            }
        }catch(err){
            console.error('Ошибка при удалении комментария', err);
            throw err;
        }
    }

    async updateComment(newText, commentId, requester){
        try{
            const comment = await Comment.findById(commentId);

            if (!comment) {
                throw new Error('Комментарий не найден');
            }
            if (comment.user_id.toString() !== requester) {
                throw new Error('Нет прав на редактирование комментария');
            }
            if (comment.isDeleted) {
                throw new Error('Нельзя редактировать удалённый комментарий');
            }

            return await Comment.findByIdAndUpdate(
                commentId,
                {text: newText, isEdited: true},
                {new: true, runValidators: true}
            );
        }catch(err){
            console.error('Ошибка при изменении комментария', err);
            throw err;
        }
    }
}

module.exports = new MediaService();
