const {v2: cloudinary} = require('cloudinary');

class ImgService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.IMG_CLOUD_NAME,
            api_key: process.env.IMG_API_KEY,
            api_secret: process.env.IMG_API_SECRET,
        });
    }

    async uploadImg(imageBlob, uid, targetFolder) {
        try {
            let imageBlobsArray = [];

            if (Array.isArray(imageBlob)) {
                imageBlobsArray = imageBlob;
            } else if (typeof imageBlob === 'string') {
                imageBlobsArray = [imageBlob];
            }

            if (imageBlobsArray.length > 1) {
                const uploadPromises = imageBlobsArray.map(blob => this.uploadSingleImage(blob, uid, targetFolder));
                return await Promise.all(uploadPromises);
            } else {
                return await this.uploadSingleImage(imageBlobsArray[0], uid, targetFolder);
            }
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async uploadSingleImage(blob, uid, targetFolder) {
        try {
            const response = await cloudinary.uploader.upload(blob, {
                resource_type: 'image',
                folder: `${uid}/${targetFolder}`,
            });

            const url = cloudinary.url(response.public_id, {
                transformation: [
                    {
                        quality: 'auto',
                        fetch_format: 'auto'
                    }
                ]
            })

            return {
                public_id: response.public_id,
                asset_id: response.asset_id,
                asset_url: url,
                path: `${uid}/${targetFolder}/${response.display_name}`
            };
        } catch (err) {
            console.error('Ошибка при загрузке изображения на хостинг');
            throw err;
        }
    }

    async deleteImg(publicIdArray) {
        try {
            const publicIds = Array.isArray(publicIdArray) ? publicIdArray : [publicIdArray];

            await Promise.all(publicIds.map(id => this.deleteSingleImage(id)));
        } catch (err) {
            console.error('Ошибка при удалении изображений');
            throw err;
        }
    }

    async deleteSingleImage(public_id) {
        try {
            await cloudinary.uploader.destroy(public_id);
        } catch (err) {
            console.error(`Ошибка при удалении изображения с public_id: ${public_id}`);
            throw err;
        }
    }
}

module.exports = new ImgService();
