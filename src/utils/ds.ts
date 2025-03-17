import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

if (
  !process.env.AZURE_SQL_USER ||
  !process.env.AZURE_SQL_PASSWORD ||
  !process.env.AZURE_SQL_SERVER ||
  !process.env.AZURE_SQL_DATABASE
) {
  throw new Error("Missing required database configuration");
}

const config = {
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  // Optionally add port if needed:
  // port: Number(process.env.AZURE_SQL_PORT) || 1433,
};

// Global pool variable for connection pooling
let pool: sql.ConnectionPool;

export const connectDB = async () => {
  try {
    pool = await sql.connect(config);
    console.log("Connected to Azure SQL Database");
  } catch (err) {
    console.error("Database connection failed", err);
  }
};

export const executeQuery = async (query: string, params: (string | number | boolean | Date | Buffer)[] = []) => {
  // Ensure connection is available before executing a query.
  if (!pool || !pool.connected) {
    console.log("No active connection, attempting to reconnect...");
    await connectDB();

    // Add this check - if connection still failed after attempting to connect
    if (!pool || !pool.connected) {
      throw new Error("Database connection unavailable - quota exceeded");
    }
  }

  try {
    const request = pool.request();
    params.forEach((param, index) => {
      request.input(`param${index + 1}`, param);
    });
    const result = await request.query(query);
    return result.recordset;
  } catch (err: unknown) {
    console.error("Database query error:", err);
    throw new Error(err instanceof Error ? err.message : "Internal Server Error");
  }
};
