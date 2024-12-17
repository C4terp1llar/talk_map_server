const fs = require('fs');
const {PutObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const {v4: uuidv4} = require('uuid');
const s3Client = require('../utils/s3Client');
const mongoose = require("mongoose");
const normalizeFileName = require('../utils/normalizeFile');

const Photo = require('../models/photoModel');
const Media = require('../models/mediaModel');
const User = require('../models/userModel');
const Reaction = require('../models/reactionModel')

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
            try {
                await fs.promises.unlink(file.filepath);
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

    async getPhotos(user_id, page = 1, limit = 10) {
        try {
            const photos = await Photo.aggregate([
                {$match: {user_id: new mongoose.Types.ObjectId(user_id)}},
                {
                    $lookup: {
                        from: 'media',
                        localField: 'media_id',
                        foreignField: '_id',
                        as: 'media',
                    },
                },
                {$unwind: '$media'},
                {
                    $project: {
                        _id: 1,
                        user_id: 1,
                        media_id: 1,
                        url: 1,
                        'media.createdAt': 1,
                    },
                },
                {
                    $sort: {'media.createdAt': -1}
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
                Media.deleteOne({_id: media._id})
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
                        media_id: "$media_info._id",
                        createdAt: "$media_info.createdAt",
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

    async reactAction (entityType, entityId, userId){
        try{
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

}

module.exports = new MediaService();
