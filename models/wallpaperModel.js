const mongoose = require("mongoose");

const WallpaperSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    public_id: {
        type: String,
        required: true,
        default: 'default_resources/vnvmaag6dhzygdpfbehs'
    },
    asset_id: {
        type: String,
        required: true,
        default: 'fc3cfdf819860c118dc1912050da9400'
    },
    asset_url: {
        type: String,
        required: true,
        default: 'https://res.cloudinary.com/dgtij3vgm/image/upload/v1727551671/default_resources/vnvmaag6dhzygdpfbehs.jpg'
    },
    path: {
        type: String,
        required: true,
        default: '/default_resources/vnvmaag6dhzygdpfbehs.jpg'
    }
});

const Wallpaper= mongoose.model('Wallpaper', WallpaperSchema, 'wallpapers');

module.exports = Wallpaper;