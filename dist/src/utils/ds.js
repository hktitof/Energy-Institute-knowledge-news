import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();
// Global pool variable for connection pooling
let pool = null;
// Validate environment variables
if (!process.env.AZURE_SQL_USER ||
    !process.env.AZURE_SQL_PASSWORD ||
    !process.env.AZURE_SQL_SERVER ||
    !process.env.AZURE_SQL_DATABASE) {
    // Log the specific missing variables for easier debugging
    console.error("Missing required database configuration. Check .env file for:");
    if (!process.env.AZURE_SQL_USER)
        console.error("- AZURE_SQL_USER");
    if (!process.env.AZURE_SQL_PASSWORD)
        console.error("- AZURE_SQL_PASSWORD");
    if (!process.env.AZURE_SQL_SERVER)
        console.error("- AZURE_SQL_SERVER");
    if (!process.env.AZURE_SQL_DATABASE)
        console.error("- AZURE_SQL_DATABASE");
    throw new Error("Missing required database configuration");
}
const config = {
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    server: process.env.AZURE_SQL_SERVER, // Just IP\instance
    database: process.env.AZURE_SQL_DATABASE,
    port: Number(process.env.AZURE_SQL_PORT) || 1433, // Put port back
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    connectionTimeout: 60000 // Increase timeout to 60 seconds (60000 ms)
};
export const connectDB = async () => {
    try {
        // Check if pool exists and is connected
        if (pool && pool.connected) {
            // console.log("Already connected to SQL Database."); // Optional: Log if already connected
            return;
        }
        // If pool exists but isn't connected (e.g., timed out), close it first
        if (pool && !pool.connected) {
            console.log("Closing stale connection pool...");
            await pool.close();
            pool = null; // Reset pool variable
        }
        console.log("Attempting to connect to SQL Database with config:", {
            server: config.server,
            database: config.database,
            user: config.user ? "******" : undefined, // Don't log user directly
            password: config.password ? "******" : undefined, // NEVER log password
            port: config.port,
            options: config.options,
        });
        // Create and connect the pool
        pool = await new sql.ConnectionPool(config).connect();
        console.log("Connected to SQL Database.");
        // Optional: Handle pool errors
        pool.on("error", err => {
            console.error("SQL Pool Error:", err);
            // Consider trying to close and reconnect or log extensively
            pool = null; // Mark pool as unusable on error
        });
    }
    catch (err) {
        console.error("Database connection failed:", err);
        pool = null; // Ensure pool is null if connection fails
        // Rethrow the error so the caller knows the connection failed
        throw err;
    }
};
export const executeQuery = async (query, params = {}) => {
    // Ensure connection pool is established
    if (!pool) {
        console.log("Connection pool not initialized. Attempting to connect...");
        try {
            await connectDB(); // Attempt to establish the initial connection
        }
        catch (connectionError) {
            console.error("Failed to establish initial database connection:", connectionError);
            throw new Error("Database connection unavailable.");
        }
    }
    // Double-check pool status after connection attempt
    if (!pool || !pool.connected) {
        console.error("Database connection unavailable after attempting to connect.");
        // Optionally try one more time? Or just fail.
        try {
            console.log("Retrying connection...");
            await connectDB();
            if (!pool || !pool.connected) {
                throw new Error("Database reconnection failed.");
            }
        }
        catch {
            throw new Error("Database connection is persistently unavailable.");
        }
    }
    // Get a request object from the pool
    const request = pool.request();
    // Add input parameters
    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            request.input(key, params[key]);
        }
    }
    try {
        // Execute the query using named parameters (e.g., SELECT * FROM users WHERE id = @userId)
        const result = await request.query(query);
        return result.recordset;
    }
    catch (err) {
        console.error("Database query error:", err);
        console.error("Query:", query);
        console.error("Params:", params); // Log parameters used in the failed query
        // Throw a more specific error if possible, otherwise a generic one
        throw new Error(err instanceof Error ? `Query failed: ${err.message}` : "Database query failed");
    }
    // Note: The request object is automatically returned to the pool when done
};
// Optional: Function to gracefully close the connection pool on application shutdown
export const closeDB = async () => {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log("Database connection pool closed.");
        }
    }
    catch (err) {
        console.error("Error closing the database connection pool:", err);
    }
};
// --- Example Usage (keep this out of the file you import elsewhere) ---
/*
async function main() {
  try {
    await connectDB(); // Establish initial connection

    // Example query using named parameters
    const userId = 1;
    const users = await executeQuery('SELECT * FROM YourTable WHERE UserID = @userIdParam', { userIdParam: userId });
    console.log(users);

  } catch (error) {
    console.error("Application error:", error);
  } finally {
    await closeDB(); // Close pool when app exits
  }
}

// main(); // Call the example usage
*/
