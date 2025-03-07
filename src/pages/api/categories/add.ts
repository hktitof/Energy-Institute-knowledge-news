// pages/api/categories/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { categoryName } = req.body;
  if (!categoryName || typeof categoryName !== "string") {
    return res.status(400).json({ error: "Invalid categoryName" });
  }

  try {
    await connectDB();

    const query = `
      INSERT INTO Categories (CategoryName)
      VALUES (@param1);
      SELECT SCOPE_IDENTITY() AS CategoryID;
    `;
    const result = await executeQuery(query, [categoryName]);
    const categoryID = result?.[0]?.CategoryID;

    res.status(201).json({ message: "Category added successfully", categoryID });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
