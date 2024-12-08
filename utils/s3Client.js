const {S3Client} = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: 'ru-central1',
    endpoint: 'https://storage.yandexcloud.net',
    credentials: {
        accessKeyId: 'YCAJEEa2HmjRVuc8dA4Yvfk_Q',
        secretAccessKey: 'YCNSMELg_Dblp9uyFZVtIW48VumZBxCyxcXXb_69'
    },
});

module.exports = s3Client;
