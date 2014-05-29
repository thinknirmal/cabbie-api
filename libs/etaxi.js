/**
 * etaxi lib for node.js
 *
 * Contains functions which can be used for all node.js app developed inside
 * Easy Taxi. 
 *
 * This library will have functions which will be common for the node apps. 
 */
module.exports = function(config) {
	/**
	 * App's configuration object. This will have the node app's configuration
	 * either production or other environments configuration. This config is a 
	 * private variable 
	 * 
	 * @type {object}
	 */
	var config = config;

	/**
	 * Similar to console.log but logs only when the environment allows logging
	 * else this will not log. 
	 *
	 * Logging can be overriden by adding second paramenter as true.
	 * 
	 * @return {Boolean} [Returns true if logged else false]
	 */
	this.log = function() {
		if(config.env.log || arguments[1] === true) {
			console.log(arguments[0]);
			return true;
		} else
			return null;
	};

	/**
	 * Check if the user have given valid mobile number. here. 
	 * @todo Add the logic. Right now its always valid
	 * @return {Boolean} True if valid
	 */
	this.validateMobile = function(){
		return true;
	}
}