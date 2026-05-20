const { connectToDatabase } = require('./dbConfig');

async function checkDb() {
    try {
        const pool = await connectToDatabase();
        const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
        console.log("Tables in database:");
        console.table(tables.recordset);

        const columns = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Bookings'");
        console.log("\nColumns in Bookings:");
        console.table(columns.recordset);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkDb();
