const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true // Cần thiết khi dùng SQL Server ở Localhost
    }
};

if (process.env.DB_INSTANCE) {
    config.options.instanceName = process.env.DB_INSTANCE;
} else if (process.env.DB_PORT) {
    config.port = parseInt(process.env.DB_PORT || 1433);
}

let poolPromise;

async function connectToDatabase() {
    try {
        if (!poolPromise) {
            console.log('Đang kết nối tới SQL Server...');
            poolPromise = sql.connect(config);
        }
        const pool = await poolPromise;
        if (!pool.connected) {
            console.log('✅ Đã kết nối thành công tới SQL Server');
        }
        return pool;
    } catch (err) {
        console.error('❌ Lỗi kết nối Database:', err);
        poolPromise = null;
        throw err;
    }
}

module.exports = {
    connectToDatabase,
    sql
};
