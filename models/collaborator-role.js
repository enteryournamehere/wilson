/* eslint-disable new-cap */
const Sequelize = require('sequelize');
const { db } = require('../utils/database.js');

/**
 * Main Idea table
 * @type {Sequelize.Model}
 */
const collaboratorRole = db.define('collaborator_roles', {
	id: {
		type: Sequelize.STRING(25),
		primaryKey: true,
	},
}, { timestamps: false, charset: 'utf8mb4' });

db.sync();

let _collaboratorRoles = null;

/**
 * Get an inserted Idea by its message ID
 */
async function getCollaboratorRoles() {
	if (!_collaboratorRoles) {
		_collaboratorRoles = (await collaboratorRole.findAll()).map(({ id }) => id);
	}

	return _collaboratorRoles;
}

async function trackCollaborators(id) {
	if (_collaboratorRoles) _collaboratorRoles.push(id);
	return collaboratorRole.upsert({
		id,
	});
};

async function untrackCollaborators(id) {
	if (_collaboratorRoles) _collaboratorRoles = _collaboratorRoles.filter((c) => c !== id);
	return collaboratorRole.destroy({
		where: {
			id,
		},
	});
};

module.exports = {
	collaboratorRole,
	getCollaboratorRoles,
	trackCollaborators,
	untrackCollaborators,
};
