const axios = require("axios");

class GeoService {
    async getCitiesByTxt (query, filter) {
        try{

            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: query,
                    format: 'json',
                    addressdetails: 1,
                },
                headers: {
                    'User-Agent': 'TalkMap web application'
                }
            });

            if (!response.data.length) return this.notFound();

            let foundData = response.data;

            if (filter === 'buildings'){
                const filteredData = foundData.filter(address => ['building', 'residential', 'house', 'apartments'].includes(address.addresstype))
                return this.formatResponse(filteredData)
            }else{
                return this.formatResponse(foundData)
            }
        }catch(err){
            console.error(err);
            throw err;
        }
    }

    notFound () {
        return {message: 'По данному запросу ничего не найдено'};
    }

    formatResponse (foundAddressesArray) {
        if (!foundAddressesArray.length) return this.notFound();
        return foundAddressesArray.map((item) => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),

            type: item.type,
            address_type: item.addresstype,
            name: item.name,

            city: item.address.city || item.address.village || item.address.town || item.address.municipality,

            house_number: item.address.house_number ? parseFloat(item.address.house_number) : null,
            road: item.address.road,

            city_district: item.address.city_district,
            state: item.address.state,
            country: item.address.country,
            country_code: item.address.country_code,

            boundingbox: item.boundingbox,
        }))
    }
}

module.exports = new GeoService();