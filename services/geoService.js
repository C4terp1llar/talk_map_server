const axios = require("axios");

class GeoService {
    async getCitiesByTxt (query) {
        try{
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: query,
                    format: 'json'
                },
                headers: {
                    'User-Agent': 'TalkMap/1.0 (m0skvitin@mail.ru)'
                }
            });

            if (!response.data.length){
                return {message: 'По данному запросу ничего не найдено'};
            }

            return response.data.map((item) => ({
                name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
            }))

        }catch(err){
            console.error(err);
            throw err;
        }
    }
}

module.exports = new GeoService();