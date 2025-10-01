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
			connectionLimit: 10,
			waitForConnections: true,
			namedPlaceholders: true
		});
	}
	return pool;
}

module.exports = { getPool };


