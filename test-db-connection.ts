// test-db-connection.ts

// Use namespace imports
import * as sql from "mssql";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from the .env file in the project root
// Make sure your .env file is in the same directory you run this script from,
// or adjust the path.resolve() accordingly.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("--- Database Connection Test Script ---");

// Validate environment variables
if (
  !process.env.AZURE_SQL_USER ||
  !process.env.AZURE_SQL_PASSWORD ||
  !process.env.AZURE_SQL_SERVER ||
  !process.env.AZURE_SQL_DATABASE ||
  !process.env.AZURE_SQL_PORT
) {
  console.error("❌ ERROR: Missing required database configuration in .env file.");
  console.error("Ensure these are set:");
  console.error("- AZURE_SQL_USER");
  console.error("- AZURE_SQL_PASSWORD");
  console.error("- AZURE_SQL_SERVER (e.g., 10.0.2.244\\knowledgeinstanc)");
  console.error("- AZURE_SQL_DATABASE (e.g., Knowledge-Note)");
  console.error("- AZURE_SQL_PORT (e.g., 1433)");
  process.exit(1); // Exit if config is missing
}

// Define the connection config using non-null assertions (!)
// Assumes validation above passed.
const config: sql.config = {
  user: process.env.AZURE_SQL_USER!,
  password: process.env.AZURE_SQL_PASSWORD!,
  server: process.env.AZURE_SQL_SERVER!, // Should be 10.0.2.244\knowledgeinstanc
  database: process.env.AZURE_SQL_DATABASE!, // Should be Knowledge-Note
  port: Number(process.env.AZURE_SQL_PORT!),
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: true, // Trust local self-signed certificate
  },
  pool: {
    max: 1, // Minimal pool for testing
    min: 0,
    idleTimeoutMillis: 5000,
  },
  connectionTimeout: 60000, // 60 second connection timeout
  requestTimeout: 60000, // 60 second request timeout
};

console.log("Using connection config:");
console.log({
  server: config.server,
  database: config.database,
  user: config.user ? "******" : undefined,
  password: config.password ? "******" : undefined,
  port: config.port,
  options: config.options,
  connectionTimeout: config.connectionTimeout,
  requestTimeout: config.requestTimeout,
});

// Async function to perform the connection test
async function testConnection() {
  let pool: sql.ConnectionPool | null = null;
  try {
    console.log("\nAttempting to connect...");
    // Use the imported 'sql' namespace
    pool = await sql.connect(config);

    console.log("✅ SUCCESS: Connection established!");

    // Optional: Run a simple query
    console.log("Attempting simple query...");
    const result = await pool.request().query("SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DBName;");
    console.log("✅ SUCCESS: Query executed.");
    console.log("Query Result:", result.recordset);
  } catch (err) {
    console.error("\n❌ ERROR: Connection or query failed!");
    // Log the full error object for details
    console.error(err);
  } finally {
    // Ensure the pool is closed
    if (pool && pool.connected) {
      // Check if pool exists and is connected before closing
      try {
        await pool.close();
        console.log("\nConnection pool closed.");
      } catch (closeErr) {
        console.error("Error closing connection pool:", closeErr);
      }
    } else if (pool && !pool.connected) {
      console.log("\nPool was created but not connected, no need to close explicitly.");
    } else {
      console.log("\nPool was not created.");
    }
    console.log("--- Test Script Finished ---");
  }
}

// Execute the test function
testConnection();
