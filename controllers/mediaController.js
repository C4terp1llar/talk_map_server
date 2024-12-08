const formidable = require('formidable');
const MediaService = require('../services/mediaService');

class MediaController {
    async uploadMedia(req, res) {
        const form = new formidable.IncomingForm({
            multiples: true,
            uploadDir: './uploads',
            keepExtensions: true,
        });

        const uuid = req.user.uid;

        await form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(500).json({message: "Ошибка при обработке формы", error: err});
            }

            try {
                const uploadPromises = Object.values(files).flat().map((file) => {
                    return MediaService.uploadToS3(file, uuid);
                });

                const uploadResults = await Promise.all(uploadPromises);
                const successfulUploads = uploadResults.filter(result => result !== null);

                if (successfulUploads.length === 0) {
                    return res.status(500).json({message: "Не удалось загрузить файлы."});
                }

                res.status(200).json({files: successfulUploads});
            } catch (err) {
                console.error(err);
                res.status(500).json({error: 'Ошибка при загрузке файлов на S3'});
            }
        });
    }
}

module.exports = new MediaController();
