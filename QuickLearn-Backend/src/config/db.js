const mysql = require('mysql2/promise');

let pool;

async function getPool() {
	if (!pool) {
		pool = mysql.createPool({
			host: process.env.MYSQL_HOST || '127.0.0.1',
			port: Number(process.env.MYSQL_PORT || 3306),
			user: process.env.MYSQL_USER || 'root',
			password: process.env.MYSQL_PASSWORD || '',
			database: process.env.MYSQL_DATABASE || 'quicklearn',
			connectionLimit: Number(process.env.MYSQL_POOL_LIMIT || 20),
			waitForConnections: true,
			queueLimit: 0,
			namedPlaceholders: true,
			enableKeepAlive: true,
			keepAliveInitialDelay: 0,
			maxIdle: 10,
			idleTimeout: 60_000
		});
	}
	return pool;
}

module.exports = { getPool };


