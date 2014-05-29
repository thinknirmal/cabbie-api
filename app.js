/**
 * @author 		Jeyanth Kumar
 * @email		jeyanth.kmr@gmail.com		
 *
 * Cab drivers signup REST API for Easy taxi. Developing for Easy Taxi. 
 *
 * This API will 5 endpoints as of now. Which helps the app to signup and login
 * and the end points will give states to the application.
 */

/**
 * Applications config. There are two types. Production and development. 
 * Production goes to live server and development goes to local development. 
 * staging configuration can be added later on. 
 * 
 * @type {object}
 */	
var allConfig = require('./config/config.js');
var config = allConfig[
		typeof(process.env.PORT) == 'undefined' ? 'development' : 'production'
	];

/**
 * instance of etaxi library. 
 */
var etaxiObj = require('./libs/etaxi.js');
etaxi = new etaxiObj(config);

/**
 * express app
 */
var express = require('express');
var app = express();

/**
 * redis instance
 */
var redis = require("redis");
/**
 * redis client is client connection to the redis server. 
 * The configuration are from the config files which have production
 * and development environment. 
 *
 * Option is a optional parameter. In the configuration its blank as of now. 
 * {@link https://github.com/mranney/node_redis#rediscreateclientport-host-options}
 */
redisClient = redis.createClient(
		config.redis.port,
		config.redis.host,
		config.redis.option
	);

/**
 * mysql instance
 */
var mysql = require('mysql');

/**
 * Mysql connection pools. This will have multiple connections to the database. 
 * the Configuration for mutliple environment is present. and can be changed.
 *
 * Also checkout the 
 * {@link https://github.com/felixge/node-mysql#pooling-connections Documentation}
 */
mysqlPool  = mysql.createPool({
	host : config.mysql.host,
	user : config.mysql.user,
	password : config.mysql.password,
	database : config.mysql.database,
	connectionLimit : config.mysql.connectionLimit
});

/**
 * Mongodb instance and MongoDb Server instance. 
 */
var mongodb = require('mongodb').Db;
var mongoServer = require('mongodb').Server;

/**
 * Mongodb connecton object.
 *
 * New connection is created with the configuration from the config file. 
 * Configuration for mutliple environment is present. and can be changed.
 *
 * Mostly Mongodb will be used to dump logs.
 * @type {object}
 */
mongoConn = new mongodb(
		config.mongo.db,
		new mongoServer(config.mongo.host, config.mongo.port)
	);

/**
 * Initializing the router object. cabbie will have the functions to process
 * the REST HTTP calls. 
 */
var cabbieObj = require('./routes/cabbie.js');
/**
 * cabbieObj should be initialized only after 
 *  * mongoConn
 *  * mysqlPool
 *  * redisClient
 *  * etaxi
 *
 * else app will throw expection and quit. 
 */
cabbie = new cabbieObj(config);

app.use(express.json());
app.use(express.urlencoded());
app.use(app.router);
app.set('json spaces', config.env.jsonSpace);

app.get('/:type', function(req, res){
	cabbie.route(req, res, req.params.type);
});

app.listen(config.port);
etaxi.log("Listening to port: " + config.port, true);
