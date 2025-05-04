import { executeQuery, connectDB } from "../../../utils/ds";
// Ensure the DB connection is ready
connectDB();
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }
    // Destructure required values from the request body
    const { categoryId, link, title } = req.body;
    if (!categoryId || !link || typeof link !== "string") {
        return res.status(400).json({ error: "Missing or invalid data. 'categoryId' and 'link' are required." });
    }
    try {
        await connectDB();
        // Use parameter placeholders as bound parameters (our ds.ts uses @param1, @param2, etc.)
        const query = `
      INSERT INTO Links (CategoryID, URL, Title)
      VALUES (@param1, @param2, @param3);
      SELECT SCOPE_IDENTITY() AS LinkID;
    `;
        // Execute the query passing categoryId as number, link, and title (or null if not provided)
        const result = await executeQuery(query, [Number(categoryId), link, title ? title : null]);
        // Get the new LinkID (if returned)
        const linkId = result?.[0]?.LinkID;
        res.status(201).json({ message: "Link added successfully", linkId });
    }
    catch (error) {
        console.error("Error adding link:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
