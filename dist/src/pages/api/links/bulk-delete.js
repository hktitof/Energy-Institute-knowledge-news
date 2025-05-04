import { executeQuery, connectDB } from "../../../utils/ds";
// Ensure the DB is connected when the API route is hit
connectDB();
export default async function handler(req, res) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }
    // Extract linkIds from the request body
    const { linkIds } = req.body;
    console.log("API called with linkIds:", linkIds);
    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
        return res.status(400).json({ error: "Invalid or missing link IDs" });
    }
    try {
        console.log("About to execute bulk delete with linkIds:", linkIds);
        // Convert all IDs to numbers and validate
        const numericLinkIds = linkIds.map(id => Number(id));
        if (numericLinkIds.some(id => isNaN(id))) {
            return res.status(400).json({ error: "One or more invalid link IDs" });
        }
        // Use a parameterized query with IN clause
        // Create parameter placeholders (@param1, @param2, etc.)
        const paramPlaceholders = numericLinkIds.map((_, index) => `@param${index + 1}`).join(', ');
        const query = `DELETE FROM Links WHERE LinkID IN (${paramPlaceholders})`;
        await executeQuery(query, numericLinkIds);
        res.status(200).json({
            message: `${numericLinkIds.length} link(s) deleted successfully`,
            deletedIds: linkIds
        });
    }
    catch (error) {
        console.error("Detailed error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
