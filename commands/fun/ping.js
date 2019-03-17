const commando = require('discord.js-commando');

const responses = [
	'hi',
	'Hello!!',
	'Henlo!',
	'Hi there.',
	'aaaaaa',
	'I\'m listening.',
	'Yes?',
	'Hi, how are you?',
	'Hey there.',
	'yes hi its me',
	'yes hello this is Wilson',
	'Hi, I\'m Wilson.',
	'Greetings!!',
	'I am here!',
	'Ready to serve!',
	'Pong!',
	'Yes, I am here.',
	'Yes, that\'s me!',
	'What\'s good?',
	'Yeah?',
	'I read you.',
	'I hear you.',
	'Watching!',
	'You got me.',
	'I\'m not sleeping!!!',
	'\\*krrt* Wilson to Earth, are you reading?',
	'You called?',
	'I\'m alive!',
	'Hearing you, loud and clear!',
];

module.exports = class PingCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'ping',
			group: 'fun',
			memberName: 'ping',
			description: 'Checks the bot\'s ping to the Discord server, relative to yours.',
			aliases: ['pong', 'pyong'],
			throttling: {
				usages: 5,
				duration: 10,
			},
			args: [
				{
					key: 'detailed',
					prompt: 'hello how are you',
					type: 'string',
					default: '',
				},
			],
		});
	}

	async run(msg, {detailed}) {
		if (!detailed) return msg.say(responses[Math.floor(responses.length * Math.random())]);
		const placeholder = await msg.say('Pinging...');
		return placeholder.edit(`Pong! Wilson's ping is \`${placeholder.createdTimestamp - msg.createdTimestamp}ms\`. ${this.client.ping ? `The websocket ping is \`${Math.round(this.client.ping)}ms.\`` : ''}`);
	}
};
