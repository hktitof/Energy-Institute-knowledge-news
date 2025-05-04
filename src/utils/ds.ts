// src/utils/db.ts (or ds.ts)

// Use namespace imports
import * as sql from "mssql";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from the .env file in the project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Global pool variable for connection pooling
let pool: sql.ConnectionPool | null = null;

// Validate environment variables
if (
  !process.env.AZURE_SQL_USER ||
  !process.env.AZURE_SQL_PASSWORD ||
  !process.env.AZURE_SQL_SERVER || // Now expects just the IP/hostname
  !process.env.AZURE_SQL_DATABASE ||
  !process.env.AZURE_SQL_PORT
) {
  console.error("❌ ERROR: Missing required database configuration in .env file.");
  // Log specific missing variables
  if (!process.env.AZURE_SQL_USER) console.error("- AZURE_SQL_USER");
  if (!process.env.AZURE_SQL_PASSWORD) console.error("- AZURE_SQL_PASSWORD");
  if (!process.env.AZURE_SQL_SERVER) console.error("- AZURE_SQL_SERVER (should be IP address only)");
  if (!process.env.AZURE_SQL_DATABASE) console.error("- AZURE_SQL_DATABASE");
  if (!process.env.AZURE_SQL_PORT) console.error("- AZURE_SQL_PORT");
  throw new Error("Missing required database configuration");
}

// Define the connection config using non-null assertions (!)
// Assumes validation passed. Server should now just be the IP.
const config: sql.config = {
  user: process.env.AZURE_SQL_USER!,
  password: process.env.AZURE_SQL_PASSWORD!,
  server: process.env.AZURE_SQL_SERVER!, // Reads the IP address from .env
  database: process.env.AZURE_SQL_DATABASE!,
  port: Number(process.env.AZURE_SQL_PORT!), // Reads 1433 from .env
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 60000, // Keep increased timeout
  requestTimeout: 60000, // Keep increased timeout
};

export const connectDB = async (): Promise<void> => {
  try {
    if (pool && pool.connected) {
      return;
    }
    if (pool && !pool.connected) {
      console.log("Closing stale connection pool...");
      await pool.close();
      pool = null;
    }

    console.log("Attempting to connect to SQL Database with config (mssql):", {
      server: config.server, // Should show IP only
      database: config.database,
      user: config.user ? "******" : undefined,
      password: config.password ? "******" : undefined,
      port: config.port, // Should show 1433
      options: config.options,
      connectionTimeout: config.connectionTimeout,
    });

    pool = await new sql.ConnectionPool(config).connect();
    console.log("✅ Connected to SQL Database (mssql).");

    pool.on("error", err => {
      console.error("SQL Pool Error:", err);
      pool = null;
    });
  } catch (err) {
    console.error("❌ Database connection failed (mssql):", err);
    pool = null;
    throw err; // Re-throw error
  }
};

// --- executeQuery and closeDB functions remain the same as your last version ---

// --- Replace the current executeQuery with this one ---
export const executeQuery = async (
  query: string,
  // Expect an array again
  params: (string | number | boolean | Date | Buffer | null)[] = [] // Allow null in type
) => {
  // Ensure connection pool is established (using your current connection logic)
  if (!pool) {
    console.log("Connection pool not initialized. Attempting to connect...");
    try {
      await connectDB();
    } catch (connectionError) {
      console.error("Failed to establish initial database connection:", connectionError);
      throw new Error("Database connection unavailable.");
    }
  }
  if (!pool || !pool.connected) {
    console.error("Database connection unavailable after attempting to connect.");
    try {
      console.log("Retrying connection...");
      await connectDB();
      if (!pool || !pool.connected) {
        throw new Error("Database reconnection failed.");
      }
    } catch {
      throw new Error("Database connection is persistently unavailable.");
    }
  }

  // Use the OLD parameter handling logic
  try {
    const request = pool.request();
    // Loop through the array and create @param1, @param2, etc.
    params.forEach((param, index) => {
      // Determine the SQL type if possible, or let mssql infer
      // For basic types, inference is often okay. For specific types (like Geography, TVP), you'd need sql.Geography etc.
      request.input(`param${index + 1}`, param);
    });
    const result = await request.query(query);
    return result.recordset;
  } catch (err: unknown) {
    console.error("Database query error:", err);
    console.error("Query:", query);
    console.error("Params Array:", params); // Log the array
    throw new Error(err instanceof Error ? `Query failed: ${err.message}` : "Database query failed");
  }
};
// --- End of replaced executeQuery function ---
