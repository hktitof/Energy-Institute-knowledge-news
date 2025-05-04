import { executeQuery, connectDB } from "../../../utils/ds";
// Ensure the DB is connected when the API route is hit
connectDB();
export default async function handler(req, res) {
    // Extract linkId from the URL path - assumes the path is /api/links/[linkId]
    const { linkId } = req.query;
    console.log("API called with linkId:", linkId);
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }
    if (!linkId || isNaN(Number(linkId))) {
        return res.status(400).json({ error: "Invalid or missing link ID" });
    }
    try {
        console.log("About to execute query with linkId:", Number(linkId));
        // Use @param1 since our executeQuery binds parameters as @param1, @param2, etc.
        const query = `DELETE FROM Links WHERE LinkID = @param1`;
        await executeQuery(query, [Number(linkId)]);
        // Even if no rows are returned (DELETE returns an empty recordset),
        // if no error is thrown, assume deletion was successful.
        res.status(200).json({ message: "Link deleted successfully" });
    }
    catch (error) {
        console.error("Detailed error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
