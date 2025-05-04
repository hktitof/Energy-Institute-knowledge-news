"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// test-tedious-connection.ts
const tedious_1 = require("tedious");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
console.log("--- Tedious Connection Test Script ---");
// Corrected validation block:
if (!process.env.AZURE_SQL_USER ||
    !process.env.AZURE_SQL_PASSWORD ||
    !process.env.AZURE_SQL_SERVER ||
    !process.env.AZURE_SQL_DATABASE ||
    !process.env.AZURE_SQL_PORT) {
    console.error("❌ ERROR: Missing required database configuration in .env file.");
    console.error("Ensure these are set:");
    if (!process.env.AZURE_SQL_USER)
        console.error("- AZURE_SQL_USER");
    if (!process.env.AZURE_SQL_PASSWORD)
        console.error("- AZURE_SQL_PASSWORD");
    if (!process.env.AZURE_SQL_SERVER)
        console.error("- AZURE_SQL_SERVER");
    if (!process.env.AZURE_SQL_DATABASE)
        console.error("- AZURE_SQL_DATABASE");
    if (!process.env.AZURE_SQL_PORT)
        console.error("- AZURE_SQL_PORT");
    process.exit(1); // Exit if config is missing
}
// Tedious config needs server and instanceName separated
// Use non-null assertion operator (!) since we validated above
const serverName = process.env.AZURE_SQL_SERVER.split('\\')[0];
const config = {
    server: serverName, // Just the IP or hostname
    authentication: {
        type: 'default',
        options: {
            userName: process.env.AZURE_SQL_USER,
            password: process.env.AZURE_SQL_PASSWORD,
        }
    },
    options: {
        database: process.env.AZURE_SQL_DATABASE,
        port: Number(process.env.AZURE_SQL_PORT), // Specify the port
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
const connection = new tedious_1.Connection(config);
// Setup listeners
connection.on("connect", err => {
    if (err) {
        console.error("\n❌ ERROR: Connection failed!");
        console.error(err);
        process.exit(1); // Exit on connection error
    }
    else {
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
    const request = new tedious_1.Request("SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DBName;", (err, rowCount, rows) => {
        if (err) {
            console.error("\n❌ ERROR: Query failed!");
            console.error(err);
        }
        else {
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
