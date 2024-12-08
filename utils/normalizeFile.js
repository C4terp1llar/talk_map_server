const { transliterate } = require('transliteration');

const normalizeFileName = (filename) => {
    let transliteratedName = transliterate(filename);
    return transliteratedName.replace(/[^a-zA-Z0-9.-]/g, '_');
};

module.exports = normalizeFileName
