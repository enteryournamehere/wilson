const commando = require('discord.js-commando');
const translation = require('../../utils/translation.js');

module.exports = class TranslateCommand extends commando.Command {
    constructor(client) {
        super(client, {
            name: 'translate',
            group: 'mod',
            memberName: 'translate',
            description: 'translates a message',
            aliases: ['t'],
            guildOnly: true,
            args: [
                {
                    key: 'text',
                    prompt: 'what do i have to translate',
                    type: 'string',
                },
            ],
            userPermissions: ['MANAGE_MESSAGES'],
        });
    }

    async run(msg, { text }) {
        const languages = await translation.detectLanguage(text);
        const translations = await translation.translateText(text);

        translations.forEach((translated, i) => {
            msg.say(`${translation.emoji(languages[i][0].split('-')[0])} (${languages[i][1]}) | ${translated}`);
        });
        return null;
    }
};
