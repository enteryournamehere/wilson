const countriesList = require('countries-list');
const ISO6391 = require('iso-639-1');
const { Translate } = require('@google-cloud/translate').v2;
const translate = new Translate({ projectId: 'wintergatanbot' });
const Country = require('db-country');

module.exports = {
    detectLanguage: async (text) => {
        return new Promise(async (resolve, reject) => {
            let [detections] = await translate.detect(text);
            detections = Array.isArray(detections) ? detections : [detections];
            console.log('Detections:');
            detections.forEach(detection => {
                console.log(`${detection.input} => ${detection.language}`);
            });
            resolve(detections.map(detection => {
                return [
                    detection.language,
                    // Google Translate detects single emoji as 'und' (undefined)
                    detection.language == 'und' ? 'Unknown' : ISO6391.getName(detection.language.split('-')[0]),
                ]
            }));
        });
    },

    translateText: async (text) => {
        return new Promise(async (resolve, reject) => {
            // does not support arrays of strings to translate
            const target = 'en';
            let to_replace = /<[@#]&?!?\d+>/;
            let revert_replacements = /REPLACEMENT\d+/;
            let replaced_items = text.match(new RegExp(to_replace, 'g'));
            let i = 0;
            while (to_replace.test(text)) {
                text = text.replace(to_replace, 'REPLACEMENT' + i++);
            }
            let [translations] = await translate.translate(text, target);
            translations = Array.isArray(translations) ? translations : [translations];
            console.log('Translations:');
            translations.forEach((translation, i) => {
                console.log(`${text[i]} => (${target}) ${translation}`);
            });
            i = 0;
            while (revert_replacements.test(translations[0])) {
                translations[0] = translations[0].replace(revert_replacements, replaced_items[i++])
            }
            resolve(translations);
        });
    },

    emoji: (language) => {
        const hardcoded = {
            'en': '🇬🇧',
            'fr': '🇫🇷',
            'es': '🇪🇸',
            'pt': '🇵🇹',
        }
        if (hardcoded[language]) return hardcoded[language];
        let countries = Object.entries(countriesList.countries)
            .filter(
                country => {
                    return country[1].languages.includes(language)
                }
            )
            .map(country => [...country, Country.findBy('code', country[0])[0]])
            .filter(country => {
                return (country[2] && country[2].population && country[2].name_en)
            })
            .map(country => {
                return {
                    // name: country[2].name_en,
                    pop: parseInt(country[2].population),
                    emoji: country[1].emoji
                }
            })
            .sort((a, b) => b.pop - a.pop);

        return countries[0] ? countries[0].emoji : '🏳️‍🌈';

    },
}
