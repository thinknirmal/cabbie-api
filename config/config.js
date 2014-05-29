module.exports = {
	production: {
		port: process.env.PORT,

		mongo: {
			db: 'etcabbie',
			host: 'localhost',
			port: 27017,
		},

		mysql: {
			username: 'etcabbie',
			password: 'dirtyPassword',
			host: 'localhost',
			port: 3306,
			database: 'etcabbie',
			connectionLimit: 100
		},

		redis: {
			host: 'localhost',
			port: 6379,
			option: {}
		},

		env: {
			log: false,
			jsonSpace: 0
		},

		app: {
			verficationCodeValidity: 30,
			verficationCodeLength: 6
		}
	},
	development: {
		port: 8888,

		mysql: {
			user: 'root',
			password: 'gone123#',
			host: 'localhost',
			port: 3306,
			database: 'easy_taxi',
			connectionLimit: 100
		},

		redis: {
			host: 'localhost',
			port: 6379,
			option: {}
		},

		mongo: {
			db: 'etcabbie',
			host: 'localhost',
			port: 27017,
		},

		env: {
			log: true,
			jsonSpace: 4
		},

		app: {
			verficationCodeValidity: 30,
			verficationCodeLength: 6
		}
	}	
};
