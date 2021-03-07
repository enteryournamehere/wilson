const Sequelize = require('sequelize');
const Database = require('../../utils/database.js');

const db = Database.db;

const updates = db.define('updates', {
	type: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
	postid: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
	time: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
}, {timestamps: false, charset: 'utf8mb4'});

db.sync();

module.exports = {
	addUpdate: async function(type, postid, time) {
		return updates.upsert({
			type: type,
			postid: postid,
			time: time,
		}).catch((n) => {
			console.log(n);
		});
	},

	getLatestUpdate: async function(type) {
		return updates.findAll({
			where: {
				type: type,
			},
		}).then(found => {
			found = found.map(f => f.dataValues);
			found = found.sort((a, b) => {
				return parseInt(b.time) - parseInt(a.time);
			});
			return found[0] || {type: type, postid: undefined, time: 0};
		});
	},
};
