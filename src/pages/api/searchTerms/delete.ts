import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { searchTerm } = req.body;
  // print searchTerm
  console.log("from server : ", searchTerm);
  if (!searchTerm) {
    return res.status(400).json({ error: "Missing searchTermId" });
  }

  try {
    await connectDB();
    const query = "DELETE FROM SearchTerms WHERE Term = @param1";
    await executeQuery(query, [searchTerm]);
    res.status(200).json({ message: "Search term deleted successfully" });
  } catch (error) {
    console.error("Error deleting search term:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
