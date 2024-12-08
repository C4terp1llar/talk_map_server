const fs = require('fs');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const s3Client = require('../utils/s3Client');
const normalizeFileName = require('../utils/normalizeFile');

class MediaService {
    async uploadToS3(file, uuid) {
        const fileType = file.mimetype || 'application/octet-stream';
        const uniqueFileName = `${uuidv4()}-${normalizeFileName(file.originalFilename)}`;
        const objectKey = `${uuid}/${uniqueFileName}`;

        let contentDisposition = "attachment";
        if (fileType.startsWith("image/") || fileType === "application/pdf" || fileType.startsWith("video/") || fileType.startsWith("audio/")) {
            contentDisposition = "inline";
        }

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
            return { filename: uniqueFileName, url: fileUrl };
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
}

module.exports = new MediaService();
