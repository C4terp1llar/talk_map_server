const userService = require('../services/userService')
const ImgService = require('../services/imgService')
class UserController {
    async getMainUserInfo (req, res) {
        try{
            const uid = req.user.uid

            const [mainInfo, addressInfo] = await Promise.all([
                userService.getUserInfo(uid),
                userService.getUserAddress(uid)
            ]);

            res.status(200).json({main: mainInfo, address: addressInfo});
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка получении информации о пользователе'});
        }
    }

    async setUserWallpaper (req, res) {
        const { imgBlob } = req.body;

        if (!imgBlob) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const uid = req.user.uid

            const img = await ImgService.uploadImg(imgBlob, uid, 'wallpaper')
            await userService.createWallpaper(uid, ...img);

            res.status(200).json(img);
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при загрузке wallpaper'});
        }
    }
}

module.exports = new UserController()