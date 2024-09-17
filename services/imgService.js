const axios = require("axios");


class ImgService {
    async uploadImg (imageBlob) {
        try {

            const base64Data = imageBlob.startsWith('data:') ? imageBlob.split(',')[1] : imageBlob;

            const formData = new URLSearchParams();
            formData.append('key', process.env.IMGBB_API_KEY);
            formData.append('image', base64Data);

            const {data} = await axios.post('https://api.imgbb.com/1/upload', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });


            if (data.data.url){
                return data.data.url
            }else{
                return data.error
            }

        } catch (err) {
            console.error(err);
            throw err;
        }
    }
}

module.exports = new ImgService();