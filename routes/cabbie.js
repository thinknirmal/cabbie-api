/**
 * API router for cabbie
 */

module.exports = function(config) {
	/**
	 * local configuration for the cabbie router module.
	 * @type {object}
	 */
	var config = config;

	/**
	 * endPoints are the actual api endpoints for each functionality
	 * @type {Array}
	 */
	var endPoints = [
			"verifymobile",
			"validatemobilecode",
			"signup",
			"login",
			"setvehicle"
		];
	
	/**
	 * check the dependancies. If all any dependancy is missing then throw an 
	 * error and quit the process. 
	 */
	try {
		if(typeof(mysqlPool) == 'undefined')
			throw "MySQL Pool not initiallized";
		
		if(typeof(mongoConn) == 'undefined')
			throw "Mongo Connection not initiallzed initiallized";

		if(typeof(redisClient) == 'undefined')
			throw "Redis Client not initiallzed initiallized";

		if(typeof(etaxi) == 'undefined')
			throw "Redis Client not initiallzed initiallized";
	} catch(err) {
		console.log("Exception: " + err);
		process.exit(1);
	}

	/**
	 * Responder function which calls the express responder. This is a private
	 * function cannot be called outside. 
	 *
	 * Change this function if the respond format should be changed. 
	 * 
	 * @param  {object} res    Response Object of express framework
	 * @param  {string} status Status string.
	 * @param  {object} error  Contains error code and message
	 * @param  {object} data   Response data. Can be any information
	 * @return {integer}        Seconds from epoch. 
	 */
	var respond = function(res, status, error, data) {
		d = {};
		d.status = status;
		if(error != null) 
			d.error = error;
		if(data != null)
			d.data = data;
		d.timestamp = Math.floor(new Date().getTime()/1000);

		res.json(d);

		return true;
	};

	/**
	 * Route will decide what to do for differnt API endpoint. Some type of 
	 * request can be ignored by route. Or new routes can be added later if needed
	 * 
	 * @param  {object} req  Request object of express framework
	 * @param  {object} res  Respose object of express framework
	 * @param  {String} type API Endpoints
	 */
	this.route = function(req, res, type) {
		/**
		 * validate the request by type of endpoints which are acceptable 
		 * by the api. If the type is not present error response will be sent.
		 */
		if(!~endPoints.indexOf(type)) {
			//endpoint is not valid
			respond( 
				res, 
				'failed',
				{ code: 404, message: 'Invalid API Endpoint' },
				null
			);
		} else {
			//valid endpoint. Route the API request. 
			switch(type){
				case 'verifymobile':
					verifyMobile(req, res);
					break;
				case 'validatemobilecode':
					validateMobile(req, res);
					break;
				case 'signup':
					signupHandler(req, res);
					break;
				case 'login':
					loginHandler(req, res);
					break;


			}
		}
	};

	/**
	 * Gets just phone number. Creates a verification code and verification id. 
	 * Sends verification id to user. Verification code to be texted through 
	 * sms gateway. If number is not valid then an error message will be sent. 
	 * 
	 * @param {object} req Express request object
	 * @param {object} res Express response object
	 */
	var verifyMobile = function(req, res) {

		if(req.query.mno === undefined || !etaxi.validateMobile(req.query.mno))
			return respond(res, 'failed',
					{code:501, message:'Request Parameters' }, null);
		
		/**
		 * Mobile Number Including country code
		 * @type {string}
		 */
		var mobile = req.query.mno;

		/**
		 * Verification id - Randomly generated string
		 * @type {string}
		 */
		var v_id = Math.random().toString(36).substr(2);
		
		/**
		 * Verification code - Randomly generated number
		 * @type {number}
		 */
		var v_code = Math.ceil(
			Math.random() * Math.pow(10, config.app.verficationCodeLength)
		);

		// create a database connection from the connection pool.
		mysqlPool.getConnection(function(err, conn){
			if(!err){
				var q = "INSERT INTO verify_step (mobile, v_id, v_code, create_ts) "
					+ "VALUES (?, ?, ?, NOW())";
				conn.query(q, [mobile, v_id, v_code]);
				conn.release();
				
				/**
				 * @todo SEND SMS with to mobile number withverification code.
				 */
				
				//responding okay with verification id. 
				return respond(res,'OK',null,{verification_id: v_id});
			
			} else {
				//log if there is an error here. 
				etaxi.log("MySQL Connection Error " + err, true);
				return respond(res, 'failed', 
						{ code: 601, message: 'MySQL connection error' }, null);
			}
		});
	};

	/**
	 * validate the mobile's verification code with verfication id. 
	 * When valid verification is succesfull create a confirmation code and
	 * send it in the response. This confirmation code will be used in 
	 * signup
	 *
	 * @param {object} req Express request object
	 * @param {object} res Express response object
	 */

	var validateMobile = function(req, res) {
		/**
		 * Verification Id
		 * @type {string}
		 */
		var v_id = req.query.v_id;
		/**
		 * Verification Code
		 * @type {string}
		 */
		var v_code = req.query.v_code;

		if(v_id === undefined || v_code === undefined)
			return respond(res, 'failed',
					{code:501, message:'Request Parameters' }, null);

		mysqlPool.getConnection(function(err, conn){
			if(!err){
				/**
				 * Confirmation Id - Randomly generated
				 * @type {string}
				 */
				var c_id = Math.random().toString(36).substr(2);
				q = "UPDATE verify_step SET used_flag = 1, c_id = ? "
					+ "WHERE v_id = ? AND v_code = ? AND used_flag = 0 AND "
					+ "TIMESTAMPDIFF(MINUTE, create_ts, NOW()) < ?";

				conn.query(q,
						[c_id, v_id, v_code, config.app.verficationCodeValidity],
						function(e, result) {
					if(e){
						/** SQL ERROR **/
						etaxi.log("Error " + e, true);
						return respond(res, 'failed', 
							{ code: 201, message: 'Fucked up' }, null);;
					}
					if(result.affectedRows > 0) {
						conn.release();
						return respond(res, 'OK', null, {
							confirmation_id: c_id
						});
					} else {
						conn.release();
						return respond(res, 'failed', 
							{ code: 201, message: 'Invalid Code' }, null);
					}
				});
			
			} else {
				//log if there is an error here. 
				etaxi.log("MySQL Connection Error " + err, true);
				return respond(res, 'failed', 
						{ code: 601, message: 'MySQL connection error' }, null);
			}
		});
	}

	/**
	 * Signup an user account. This function needs confirmation_id, full_name, 
	 * date_of birth, installation_id. 
	 * Confirmation id is already generated in server side. 
	 * Full name is provided by the user.
	 * dob is provide by the user. 
	 * Installation id is the unique id generated in the device. 
	 *
	 * This function generates a one time driver key which will be used to 
	 * generate authtoken to access the API.
	 * 
	 * @param {object} req Express request object
	 * @param {object} res Express response object
	 */
	var signupHandler = function(req, res) {
		/**
		 * Full name of the user
		 * @type {string}
		 */
		var name = req.query.name;
		/**
		 * Date of Birth of the user. THis is in String
		 * @type {string}
		 */
		var dob = req.query.dob;
		/**
		 * Confirmation ID which is generated on mobile validation. 
		 * @type {string}
		 */
		var c_id = req.query.c_id;
		/**
		 * Instaltion ID which is generated in the Device and this is unquie for 
		 * all the app installation. 
		 * @type {string}
		 */
		var in_id = req.query.in_id;


		if(name === undefined || c_id === undefined || in_id === undefined
				|| dob === undefined) {
			return respond(res, 'failed',
					{code:501, message:'Request Parameters' }, null);
		}

		mysqlPool.getConnection(function(err, conn){
			if(!err){
				q = "SELECT mobile FROM verify_step WHERE c_id = ?";
				conn.query(q, [c_id], function(e, rows){
					//for easy code redability
					_addUser(e,rows, conn, c_id, in_id, name, dob, res);
				});
				conn.release();
			} else {
				//log if there is an error here. 
				etaxi.log("MySQL Connection Error " + err, true);
				respond(res, 'failed', 
						{ code: 601, message: 'MySQL connection error' }, null);
			}
		});

	}

	/**
	 * Login handler will create an AuthToken which will be used by other easy 
	 * taxi API's. AuthToken Can identify the user and will expire in a short time.
	 * 
	 * @param {object} req Express request object
	 * @param {object} res Express response object
	 */
	var loginHandler = function(req, res) {
		/**
		 * Instaltion ID which is generated in the Device at this point this is
		 * being saved in the server as well.
		 * 
		 * @type {string}
		 */
		var in_id = req.query.in_id;

		/**
		 * Driver key is the key generated during signup and unique for the 
		 * cab driver.
		 * @type {string}
		 */
		var d_key = req.query.d_key;
		
		if(d_key === undefined || in_id === undefined) {
			console.log(d_key);
			console.log("HELLO");
			console.log(in_id);
			return respond(res, 'failed',
					{code:501, message:'Request Parameters' }, null);
		}

		mysqlPool.getConnection(function(err, conn){
			if(!err){
				/**
				 * Confirmation Id - Randomly generated
				 * @type {string}
				 */
				var a_token = Math.random().toString(36).substr(2);
				q = "UPDATE user SET a_token = ?, update_ts = NOW() "
					+ "WHERE in_id = ? AND d_key = ? ";

				conn.query(q, [a_token, in_id, d_key], function(e, result) {
					if(e){
						/** SQL ERROR **/
						etaxi.log("SQL Error: " + e, true);
						return respond(res, 'failed', 
							{ code: 201, message: 'Unknown Error' }, null);;
					}
					if(result.affectedRows > 0) {
						conn.release();
						return respond(res, 'OK', null, { authtoken: a_token });
					} else {
						conn.release();
						return respond(res, 'failed', 
							{ code: 201, message: 'Invalid Code' }, null);
					}
				});
			
			} else {
				//log if there is an error here. 
				etaxi.log("MySQL Connection Error " + err, true);
				return respond(res, 'failed', 
						{ code: 601, message: 'MySQL connection error' }, null);
			}
		});
	}



	/**
	 * callback of signup. Add's the user if the data is valid.
	 *
	 * If the user is already exist. Authtoken is invalidated. New driver key 
	 * generated for the user. Also device instalation id is updated just in case
	 * the user signup from a differnt device 
	 * 
	 * @param {string} e     Query Errors
	 * @param {array}  rows  Array of results returned by the query
	 * @param {object} conn  MySQL connection object
	 * @param {string} c_id  confirmation Id
	 * @param {string} in_id Instaltion ID
	 * @param {string} name  Full name of the user
	 * @param {string} dob   Date of the user in String
	 * @param {object} res   Express response object
	 */
	var _addUser = function(e, rows, conn, c_id, in_id, name, dob, res) {
		var mobile = rows[0].mobile;
		if(mobile === undefined || mobile == null)
			return respond(res, 'failed',
					{code:201, message:'Invalid Confirmation ID' }, null);

		/**
		 * Driver Key being generated randomly on signup. This will be used to 
		 * get AuthToken during login.
		 * 
		 * @type {string}
		 */
		var d_key = Math.random().toString(36).substr(2);
		q = "INSERT INTO user (name, dob, c_id, mobile, in_id, d_key, create_ts)" +
			"VALUES(?, ?, ?, ?, ?, ?, NOW()) " +
			"ON DUPLICATE KEY UPDATE in_id = ?, d_key = ?, update_ts = NOW()," +
			"a_token = NULL";

		conn.query(q, [name, dob, c_id, mobile, in_id, d_key, in_id, d_key]);

		return respond(res, 'OK', null, { driver_key: d_key });
	}
}