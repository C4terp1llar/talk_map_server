const formidable = require('formidable');
const MediaService = require('../services/mediaService');
const UserService = require('../services/userService');
const wsServer = require('../utils/wsServer')

const asyncTaskRunner = require('../utils/asyncTaskRunner')

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

async function emitPublishPost (requester, post){
    let {foundFriends} = await UserService.getFriends(requester)
    if (foundFriends && foundFriends.length > 0) {
        wsServer.emitToUser(foundFriends.map(i => i.toString()), 'publish_Post', {uid: requester, post});
    }
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
                wsServer.emitToUser(foundFriends.map(i => i.toString()), 'publish_Photo', {uid: requester, phId: createdPhotos[0]._id})
            }else if ([...createdPhotos].length > 1){
                let {foundFriends} = await UserService.getFriends(requester)
                wsServer.emitToUser(foundFriends.map(i => i.toString()), 'publish_many_Photo', {uid: requester})
            }

            return res.status(201).json({ photos: createdPhotos });
        } catch (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Ошибка при создании фото' });
        }
    }

    async getPhotos(req, res) {
        const { mode, searchUid, page = 1, limit = 10, sort } = req.query;

        if (mode !== 'external' && mode !== 'internal') {
            return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const uid = mode === 'internal' ? req.user.uid : searchUid;

            if (!uid) {
                return res.status(400).json({ error: 'Нехватает данных о пользователе.' });
            }

            const { photos, hasMore } = await MediaService.getPhotos(uid, +page, +limit, sort);

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
            const sender = req.user.uid;

            const wasLike = await MediaService.reactAction(entityType, entityId, sender);

            if (wasLike === null){
                return res.status(400).json({ error: 'Сущности не существует' });
            }

            asyncTaskRunner(async () => {
                if (entityType){
                    const publicationOwner = await MediaService.getMediaOwnerWsInfo(entityType, entityId)
                    wsServer.emitToUser(publicationOwner.user_id, `react_media`, {entity: entityType, reactor: sender, entity_id: entityId, wasLike})
                }
            })

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
                asyncTaskRunner(async () => await emitPublishPost(requester, post))
                asyncTaskRunner(async () => {
                    wsServer.emitToUser(null, `reload_posts`, {post_owner: requester}, requester)
                })
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

            asyncTaskRunner(async () => await emitPublishPost(requester, post))
            asyncTaskRunner(async () => {
                wsServer.emitToUser(null, `reload_posts`, {post_owner: requester}, requester)
            })

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

            asyncTaskRunner(async () => {
                wsServer.emitToUser(null, `reload_posts`, {post_id: id, post_owner: requester}, requester)
            })

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

    async getPost(req, res) {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const requesterUserUid = req.user.uid;
            const {posts, ownerInfo} = await MediaService.getPosts(undefined, requesterUserUid, 1, 1, id);
            res.status(200).json({ posts, ownerInfo });
        } catch (err) {
            console.error('Ошибка при получении поста');
            return res.status(500).json({ error: 'Ошибка при получении поста' });
        }
    }

    async getComments(req, res) {
        const { entityType, entityId, page, limit, parentCommentId} = req.query;

        if (!entityType || !entityId || !page || !limit) {
            return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const requesterUserUid = req.user.uid;
            const { comments, hasMore } = await MediaService.getComments(requesterUserUid, entityType, entityId, +page, +limit, parentCommentId);
            return res.status(200).json({ comments, hasMore });
        } catch (err) {
            console.error('Ошибка при получении комментариев');
            return res.status(500).json({ error: 'Ошибка при получении комментариев' });
        }
    }

    async createComment(req, res) {
        const { entityType, entityId, text, parentCommentId} = req.body;

        if (!entityType || !entityId || !text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const requesterUserUid = req.user.uid;
            const newComment = await MediaService.createComment(entityType, entityId, requesterUserUid, text, parentCommentId)

            asyncTaskRunner(async () => {
                const entityOwner = await MediaService.getMediaOwnerWsInfo(entityType, entityId)
                if(entityOwner && entityOwner.user_id.toString() !== requesterUserUid){
                    wsServer.emitToUser(
                        entityOwner.user_id.toString(), `publish_comment`, {text: newComment.text, entity_id: entityId, entity_type: entityType, commentator: requesterUserUid}
                    );
                }
                if(newComment && newComment.parentCommentId){
                    const parentComment = await MediaService.getCommentById(requesterUserUid, newComment.parentCommentId.toString());
                    if(parentComment && parentComment.user._id.toString() !== requesterUserUid){
                        wsServer.emitToUser(
                            parentComment.user._id.toString(), `publish_comment`,
                            {text: newComment.text, entity_id: entityId, entity_type: entityType, commentator: requesterUserUid, isReply: true}, entityOwner.user_id.toString()
                        );
                    }
                }
                wsServer.emitToUser(
                    null, `reload_comments`,
                    {entity_id: entityId, comment_id: newComment._id.toString(), act: 'inc', mode: parentCommentId ? 'replies' : 'comments', parentCommentId}, requesterUserUid
                );
            })

            res.status(201).json({ message: 'ok' });
        } catch (err) {
            console.error('Ошибка при создании комментария');
            return res.status(500).json({ error: 'Ошибка при создании комментария' });
        }
    }

    async deleteComment(req, res) {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const requesterUserUid = req.user.uid;
            const {success, act} = await MediaService.deleteComment(id, requesterUserUid);
            res.status(200).json({ success, act });
        } catch (err) {
            console.error('Ошибка при удалении комментария');
            return res.status(500).json({ error: 'Ошибка при удалении комментария' });
        }
    }

    async updateComment(req, res) {
        const { id } = req.params;
        const { newText } = req.body;

        if (!id || !newText || !newText.length) {
            return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const requesterUserUid = req.user.uid;
            const {updatedAt, text} = await MediaService.updateComment(newText, id, requesterUserUid);

            asyncTaskRunner(async () => {
                const comment = await MediaService.getCommentById(requesterUserUid, id)
                if(comment){
                    wsServer.emitToUser(
                        null, `reload_comments`,
                        {comment: comment, entity_id: comment.entityId, comment_id: id, act: 'change', mode: comment.parentCommentId ? 'replies' : 'comments', parentCommentId: comment.parentCommentId},
                        requesterUserUid
                    );
                }
            })

            res.status(200).json({ updatedAt, text });
        } catch (err) {
            console.error('Ошибка при обновлении комментария');
            return res.status(500).json({ error: 'Ошибка при обновлении комментария' });
        }
    }

}

module.exports = new MediaController();
