// test-tedious-connection.ts
import { Connection, ConnectionConfiguration, Request } from 'tedious';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("--- Tedious Connection Test Script ---");

// Corrected validation block:
if (
  !process.env.AZURE_SQL_USER ||
  !process.env.AZURE_SQL_PASSWORD ||
  !process.env.AZURE_SQL_SERVER ||
  !process.env.AZURE_SQL_DATABASE ||
  !process.env.AZURE_SQL_PORT
) {
  console.error("❌ ERROR: Missing required database configuration in .env file.");
  console.error("Ensure these are set:");
  if (!process.env.AZURE_SQL_USER) console.error("- AZURE_SQL_USER");
  if (!process.env.AZURE_SQL_PASSWORD) console.error("- AZURE_SQL_PASSWORD");
  if (!process.env.AZURE_SQL_SERVER) console.error("- AZURE_SQL_SERVER");
  if (!process.env.AZURE_SQL_DATABASE) console.error("- AZURE_SQL_DATABASE");
  if (!process.env.AZURE_SQL_PORT) console.error("- AZURE_SQL_PORT");
  process.exit(1); // Exit if config is missing
}


// Tedious config needs server and instanceName separated
// Use non-null assertion operator (!) since we validated above
const serverName = process.env.AZURE_SQL_SERVER!.split('\\')[0];


const config: ConnectionConfiguration = {
  server: serverName, // Just the IP or hostname
   authentication: {
     type: 'default',
     options: {
       userName: process.env.AZURE_SQL_USER!,
       password: process.env.AZURE_SQL_PASSWORD!,
     }
   },
   options: {
     database: process.env.AZURE_SQL_DATABASE!,
     port: Number(process.env.AZURE_SQL_PORT!), // Specify the port
     // instanceName: instanceName, // DELETE OR COMMENT OUT THIS LINE
     encrypt: true,
     trustServerCertificate: true,
     connectTimeout: 60000,
     requestTimeout: 60000,
   }
};

console.log("Using Tedious connection config:");
console.log({
  server: config.server,
  instanceName: config.options?.instanceName,
  database: config.options?.database,
  port: config.options?.port,
  userName: config.authentication?.options?.userName ? "******" : undefined,
  password: config.authentication?.options?.password ? "******" : undefined,
  options: config.options,
});

const connection = new Connection(config);

// Setup listeners
connection.on("connect", err => {
  if (err) {
    console.error("\n❌ ERROR: Connection failed!");
    console.error(err);
    process.exit(1); // Exit on connection error
  } else {
    console.log("\n✅ SUCCESS: Connection established!");
    executeStatement(); // Execute query after connection
  }
});

connection.on("end", () => {
  console.log("\nConnection closed.");
  console.log("--- Test Script Finished ---");
});

connection.on("error", err => {
  // This catches errors that might occur after connection (e.g., network drop)
  console.error("\n❌ Connection Error Event:", err);
});

// Function to execute query
function executeStatement() {
  console.log("Attempting simple query...");
  const request = new Request("SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DBName;", (err, rowCount, rows) => {
    if (err) {
      console.error("\n❌ ERROR: Query failed!");
      console.error(err);
    } else {
      console.log(`✅ SUCCESS: Query executed (${rowCount} row(s) returned).`);
      console.log("Query Result:", rows);
    }
    // Close connection after query
    connection.close();
  });
  connection.execSql(request);
}

// Attempt to connect
console.log("\nAttempting to connect (Tedious)...");
connection.connect();
