const Sequelize = require('sequelize');
const secure = require('./secure.json');

class AeiouDatabase {
	constructor() {
		this.db = new Sequelize(secure.dbName, secure.dbUser, secure.dbPassword, {
			dialect: 'mysql',
			port: 3306,
			host: 'localhost',
			provider: 'mysql',
			logging: false,
		});
	}

	async start() {
		await this.db.authenticate();
		this.db.sync()
			.then(() => console.log(`{green}Connected to database!`))
			.catch((err) => console.log('{red}Database connection error!{reset}', err));
	}
}

module.exports = new AeiouDatabase();
