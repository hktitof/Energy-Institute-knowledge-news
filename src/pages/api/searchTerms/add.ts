// pages/api/searchTerms/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { categoryId, searchTerm } = req.body;
  if (!categoryId || !searchTerm || typeof searchTerm !== "string") {
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    await connectDB();

    const query = `
      INSERT INTO SearchTerms (CategoryID, Term)
      VALUES (@param1, @param2);
      SELECT SCOPE_IDENTITY() AS SearchTermID;
    `;
    const result = await executeQuery(query, [categoryId, searchTerm]);
    const searchTermID = result?.[0]?.SearchTermID;

    res.status(201).json({ message: "Search term added successfully", searchTermID });
  } catch (err) {
    console.error("Error adding search term:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
