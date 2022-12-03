const hdbext = require("@sap/hdbext");
const service = require("./service.js");

class DbUtil {

	static execute(connection, sqlQuery, params) {
		var argLen = arguments.length;
		var sqlQuery, params = null;
		var connectionPromise = null;
		var optConnection = arguments[0];
		if (argLen === 3) {
			// connection, sqlQuery, params
			connectionPromise = optConnection ? Promise.resolve(optConnection) : DbUtil._createConnection(service.hana);
			sqlQuery = arguments[1];
			params = arguments[2];
		} else if (argLen === 2) {
			// connection|sqlQuery, params
			if (typeof optConnection !== "string" && !(optConnection instanceof String)) {
				// connection, sqlQuery
				connectionPromise = optConnection ? Promise.resolve(optConnection) : DbUtil._createConnection(service.hana);
				sqlQuery = arguments[1];
			} else {
				// sqlQuery, params
				connectionPromise = DbUtil._createConnection(service.hana);
				sqlQuery = optConnection;
				params = arguments[1];
			}
		} else if (argLen === 1) {
			if (typeof optConnection === "string" || optConnection instanceof String) {
				// sqlQuery
				connectionPromise = DbUtil._createConnection(service.hana);
				sqlQuery = optConnection;
			} else {
				throw new Error("Arguments error. 1 argument must be a String type");
			}
		} else {
			throw new Error("Arguments error. Unsupported condition");
		}

		return new Promise(function(resolve, reject) {
			connectionPromise
				.then(function(connection) {
					return DbUtil._prepareStatement(connection, sqlQuery);
				})
				.then(function(statement) {
					return DbUtil._executeStatement(statement, params);
				})
				.then(function(data) {
					resolve(data);
				})
				.catch(reject);
		});
	}

	static _createConnection(hdbClient) {
		return new Promise(function(resolve, reject) {
			hdbext.createConnection(hdbClient, function(err, hanaClient) {
				if (err) {
					reject(err);
				} else {
					resolve(hanaClient);
				}
			});
		});
	}

	static _prepareStatement(connection, query) {
		if (typeof query !== "string" && !(query instanceof String)) {
			throw new Error("'query' argument must be a String type");
		} else {
			if (!query.length) {
				throw new Error("'query' argument must not be an empty");
			}
		}
		return new Promise(function(resolve, reject) {
			connection.prepare(query, function(err, statement) {
				if (err) {
					reject(err);
				} else {
					resolve(statement);
				}
			});
		});
	}
	
	static _executeStatement(statement, params) {
		if (!(params instanceof Array)) {
			if (!params) {
				params = [];
			} else {
				params = [ params ];
			}
		}
		
		return new Promise(function(resolve, reject) {
			statement.execute(params, function(err, resultSet) {
				if (err) {
					reject(err);
				} else {
					resolve(resultSet);
				}
			});
		});
	}
}

module.exports = DbUtil;
