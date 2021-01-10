const Sequelize = require('sequelize');
const Database = require('../../database.js');
const Op = Sequelize.Op;

const db = Database.db;

const crosspostconf = db.define('crosspostconf', {
	channel: {
		type: Sequelize.STRING(25),
	},
	crosspostActive: {
		type: Sequelize.BOOLEAN,
	},
}, { timestamps: false, charset: 'utf8mb4' });

db.sync();

module.exports = {
	enableCrosspost: async function(chanId) {
		const exsisting = crosspostconf.findOne({where:{channel:chanId}});
		if(exsisting){
			exsisting.update({crosspostActive:true}) // this shouldn't be needed based on disableCrosspost() removing entrys. But it's anice safetyd
		}else{
			crosspostconf.create({channel:chanId,crosspostActive:true})
		}
	},

	disableCrosspost: async function(chanId) {
		const exsisting = crosspostconf.findOne({where:{channel:chanId}});
		if(exsisting){
			exsisting.destroy();
		}
	},


	getCrosspostStatus: async function(chanId) {
		const exsisting = crosspostconf.findOne({where:{channel:chanId}});
		if(exsisting){
			return exsisting.crosspostActive;
		}else{
			return false;
		}
	}
};
