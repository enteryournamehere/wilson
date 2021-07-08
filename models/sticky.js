const Sequelize = require('sequelize');
const Database = require('../utils/database.js');

const db = Database.db;

const sticky = db.define('sticky', {
	channel: {
		type: Sequelize.STRING(25),
		primaryKey: true,
	},
	current_post: Sequelize.STRING(25),
	text: Sequelize.STRING(2000),
}, {
	timestamps: false, charset: 'utf8mb4'
});

db.sync();

module.exports = {
	setPost: async function (channel, post) {
		return sticky.update({
			current_post: post,
		}, {
			where: {
				channel,
			}
		}).catch(e => console.log(e));
	},

	getPost: async function (channel) {
		return sticky.findOne({
			where: {
				channel,
			}
		}).catch(e => console.log(e));
	},

	setSticky: async function (channel, text) {
		return sticky.upsert({
			channel,
			text,
		}).catch(e => console.log(e));
	},

	deleteSticky: async function (channel) {
		return sticky.destroy({
			where: {
				channel,
			}
		}).catch(e => console.log(e));
	},
};
