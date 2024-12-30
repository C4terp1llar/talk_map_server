const formidable = require('formidable');
const MediaService = require('../services/mediaService');
const UserService = require('../services/userService');
const wsServer = require('../utils/wsServer')

async function uploadMedia(requester, files) {
    const uploads = await Promise.all(
        Object.values(files).flat().map((file) => MediaService.uploadToS3(file, requester))
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

class MediaController {

    async createPhoto(req, res) {
        const requester = req.user.uid;

        const form = new formidable.IncomingForm({
            multiples: true,
            uploadDir: './uploads',
            keepExtensions: true,
        });

        try {
            const { fields, files } = await new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) return reject(err);
                    resolve({ fields, files });
                });
            });

            const { sender } = fields;
            if (!sender.length || sender[0] !== 'photo' || !Object.keys(files).length) {
                return res.status(400).json({ error: 'Некорректные данные или отсутствуют файлы.' });
            }

            let medias = [];
            try {
                medias = await uploadMedia(requester, files);
            } catch (uploadError) {
                console.error("Ошибка загрузки медиа при создании фото:", uploadError);
                return res.status(500).json({ error: 'Ошибка загрузки медиа при создании фото' });
            }

            // задержка 1мс перед сохранением чтобы сортировка по дате норм была
            const createdPhotos = await Promise.all(
                medias.map(
                    (media) =>
                        new Promise((resolve) => setTimeout(() => resolve(MediaService.createPhoto(requester, media._id, media.store_url)), 1))
                )
            );

            if([...createdPhotos].length === 1){
                let {foundFriends} = await UserService.getFriends(requester)
                wsServer.emitToUser(foundFriends.map(i => i.toString()), 'publish_photo', {uid: requester, phId: createdPhotos[0]._id})
            }else if ([...createdPhotos].length > 1){
                let {foundFriends} = await UserService.getFriends(requester)
                wsServer.emitToUser(foundFriends.map(i => i.toString()), 'publish_many_photo', {uid: requester})
            }

            return res.status(201).json({ photos: createdPhotos });
        } catch (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Ошибка при создании фото' });
        }
    }

    async getPhotos(req, res) {
        const { mode, searchUid, page = 1, limit = 10 } = req.query;

        if (mode !== 'external' && mode !== 'internal') {
            return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const uid = mode === 'internal' ? req.user.uid : searchUid;

            if (!uid) {
                return res.status(400).json({ error: 'Нехватает данных о пользователе.' });
            }

            const { photos, hasMore } = await MediaService.getPhotos(uid, +page, +limit);

            res.status(200).json({ photos, hasMore });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при получении фотографий' });
        }
    }

    async deletePhoto(req, res) {
        const { photoId } = req.query;

        if (!photoId) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            await MediaService.deletePhoto(photoId);
            res.status(204).json({ status: 'ok' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при удалении фотографии' });
        }
    }

    async getPhoto(req, res) {
        const { id } = req.params;

        if (!id) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const uid = req.user.uid
            const ph = await MediaService.getPhotoById(id, uid);

             res.status(200).json({ photo: ph })

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при получении фотографии' });
        }
    }

    async getPhotoGList(req, res) {
        const { id } = req.query;

        if (!id) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const list = await MediaService.getPhotoGuessList(id);
            res.status(200).json({ gList: list })
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при получении списка фотографий пользователя' });
        }
    }

    async reactionAction(req, res) {
        const { entityType, entityId, userId } = req.body;

        if (!entityType || !entityId || !userId) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const wasLike = await MediaService.reactAction(entityType, entityId, userId);

            if (entityType === 'Photo'){
                const {user_id} = await MediaService.getPhotoById(entityId, userId);
                wsServer.emitToUser(user_id, 'react_photo', {uid: userId, phId: entityId, wasLike})
            }

            res.status(200).json({ status: 'ok' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при действии с реакцией' });
        }
    }

    async createPost(req, res) {
        const requester = req.user.uid;

        const form = new formidable.IncomingForm({
            multiples: true,
            uploadDir: './uploads',
            keepExtensions: true,
        });

        try {
            const { fields, files } = await new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) return reject(err);
                    resolve({ fields, files });
                });
            });

            const { sender, text } = fields;
            if (!text.length || !text[0]?.length || !sender.length || sender[0] !== 'post') {
                return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
            }

            if (!files || Object.keys(files).length === 0) {
                const post = await MediaService.createPost(requester, text[0])
                return res.status(201).json({ post });
            }

            let medias = [];
            try {
                medias = await uploadMedia(requester, files);
            } catch (uploadError) {
                console.error("Ошибка загрузки медиа при создании поста:", uploadError);
                return res.status(500).json({ error: 'Ошибка при создании поста, загрузка медиа' });
            }
            const mediaIds = medias.map(media => media.id);

            const post = await MediaService.createPost(requester, text[0], mediaIds)

            let {foundFriends} = await UserService.getFriends(requester)
            if (foundFriends && foundFriends.length > 0) {
                wsServer.emitToUser(foundFriends.map(i => i.toString()), 'publish_post', { uid: requester, post });
            }

            return res.status(201).json({ post });
        } catch (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Ошибка при создании поста' });
        }
    }

    async deletePost(req, res) {
        const { id } = req.params;

        if (!id) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const requester = req.user.uid;
            await MediaService.deletePost(id, requester);
            res.status(204).json({ status: 'ok' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при удалении поста' });
        }
    }

    async getPosts(req, res) {
        const { mode, searchUid, page = 1, limit = 10 } = req.query;

        if (mode !== 'external' && mode !== 'internal') {
            return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const requesterUserUid = req.user.uid;
            const postOwnerUid = mode === 'internal' ? requesterUserUid : searchUid;

            if (!postOwnerUid) {
                return res.status(400).json({ error: 'Нехватает данных о пользователе' });
            }

            const { posts, hasMore, ownerInfo } = await MediaService.getPosts(postOwnerUid, requesterUserUid, +page, +limit);

            res.status(200).json({ posts, hasMore, ownerInfo });
        } catch (err) {
            console.error('Ошибка при получении постов');
            return res.status(500).json({ error: 'Ошибка при получении постов' });
        }
    }


}

module.exports = new MediaController();
