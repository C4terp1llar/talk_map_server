const formidable = require('formidable');
const MediaService = require('../services/mediaService');

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

            const createdPhotos = await Promise.all(
                medias.map((media) => MediaService.createPhoto(requester, media._id, media.store_url))
            );

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

    async isPhotoExists(req, res) {
        const { photoId, userId } = req.query;

        if (!photoId || !userId) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const exist = await MediaService.isPhotoExists(photoId, userId);

            if (!exist) {
                res.status(400).json({ error: 'Фотография не найдена' });
            }

            res.status(200).json({ photo: exist });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при удалении фотографии' });
        }
    }

}

module.exports = new MediaController();
