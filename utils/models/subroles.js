const Sequelize = require('sequelize');
const Database = require('../../database.js');
const Op = Sequelize.Op;

const db = Database.db;

const subroles = db.define('subroles', {
	role: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
	sub: {
		type: Sequelize.BOOLEAN,
	},
}, {timestamps: false, charset: 'utf8mb4'});

module.exports = {
	setSub: async function(role) {
		return subroles.upsert({
			role: role,
			sub: true,
		});
	},

	setNotSub: async function(role) {
		return subroles.destroy({
			where: {
				role: role,
			}
		});
	},

	getSubRoles: async function() {
		return subroles.findAll({
			where: {
				sub: true,
			},
		}).then(x => {
			return x.map(f => f.dataValues.role);
		});
	},
};
