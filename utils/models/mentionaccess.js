const Sequelize = require('sequelize');
const Database = require('../../database.js');
const Op = Sequelize.Op;

const db = Database.db;

const mentionaccess = db.define('mentionaccess', {
	fromrole: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
	torole: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
}, { timestamps: false, charset: 'utf8mb4' });

db.sync();

module.exports = {
	givePermission: async function(fromrole, torole) {
		return mentionaccess.upsert({
			fromrole: fromrole,
			torole: torole,
		}).catch((n) => {
			console.log(n);
		});
	},

	takePermission: async function(fromrole, torole) {
		return mentionaccess.destroy({
			where: {
				fromrole: fromrole,
				torole: torole,
			},
		}).catch((n) => {
			console.log(n);
		});
	},

	checkPermission: async function(fromrole, torole) {
		return mentionaccess.findOne({
			where: {
				fromrole: fromrole,
				torole: torole,
			},
		}).then(found => {
			if (found) return true;
			return false;
		});
	},

	getPermissions: async function(fromrole) {
		return mentionaccess.findAll({
			where: {
				fromrole: fromrole,
			},
		}).then(found => {
			found = found.map(x => x.dataValues);
			return found;
		});
	}
	/*
		getmentionaccess: async function() {
			return mentionaccess.findAll({
				where: {
					sub: true,
				},
			}).then(x => {
				return x.map(f => f.dataValues.role);
			});
		},*/
};
