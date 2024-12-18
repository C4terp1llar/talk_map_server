const formidable = require('formidable');
const MediaService = require('../services/mediaService');
const UserService = require('../services/userService');
const wsServer = require('../utils/wsServer')

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

            const uploads = await Promise.all(
                Object.values(files).flat().map((file) => MediaService.uploadToS3(file, requester))
            );

            const medias = await Promise.all(
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

}

module.exports = new MediaController();
