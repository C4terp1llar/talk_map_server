const MediaService = require("../services/mediaService");

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

module.exports = uploadMedia;