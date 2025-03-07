import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../../utils/ds";

// Ensure the DB is connected when the API route is hit
connectDB();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Make sure this query string contains only SQL!
  const query = `
    SELECT 
      c.CategoryID, c.CategoryName, 
      s.SearchTermID, s.Term
    FROM Categories c
    LEFT JOIN SearchTerms s ON c.CategoryID = s.CategoryID
    ORDER BY c.CategoryID;
  `;

  try {
    const rows = await executeQuery(query) || [];
    console.log("Fetched rows:", rows);

    interface SearchTerm {
      SearchTermID: number;
      Term: string;
    }

    interface Category {
      CategoryID: number;
      CategoryName: string;
      searchTerms: SearchTerm[];
    }

    // Group rows into categories with search terms
    const categoriesMap: { [key: number]: Category } = {};
    rows.forEach((row: { CategoryID: number; CategoryName: string; SearchTermID: number | null; Term: string | null }) => {
      if (!categoriesMap[row.CategoryID]) {
        categoriesMap[row.CategoryID] = {
          CategoryID: row.CategoryID,
          CategoryName: row.CategoryName,
          searchTerms: [],
        };
      }
      if (row.SearchTermID !== null) {
        categoriesMap[row.CategoryID].searchTerms.push({
          SearchTermID: row.SearchTermID,
          Term: row.Term ?? '',
        });
      }
    });
    const categories = Object.values(categoriesMap);
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
