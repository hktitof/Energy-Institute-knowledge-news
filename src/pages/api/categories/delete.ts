import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { categoryId } = req.body;
  if (!categoryId) {
    return res.status(400).json({ error: "Missing categoryId" });
  }

  try {
    await connectDB();
    // If you have ON DELETE CASCADE set up on dependent tables, deleting the category will also remove related records.
    const query = "DELETE FROM Categories WHERE CategoryID = @param1";
    await executeQuery(query, [categoryId]);
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
