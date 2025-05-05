// pages/api/prompts/summaryOfSummary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds"; // Adjust path if needed

// Ensure the DB is connected when the API route is hit
connectDB();

// Define the expected structure of the successful response (can reuse the interface)
interface GetPromptsResponse {
  systemPrompt: string;
  userPrompt: string;
}

// Define the structure of rows returned from the DB query
interface PromptRow {
  prompt_role: "system" | "user";
  prompt_text: string;
}

// Define error response structure
interface ErrorResponse {
  error: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetPromptsResponse | ErrorResponse> // Define possible response types
) {
  // --- 1. Allow only GET requests ---
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]); // Inform client which methods are allowed
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // --- 2. Define the SQL Query (Hardcoded purpose) ---
  const query = `
    SELECT
      prompt_role,
      prompt_text
    FROM
      PromptDefinitions
    WHERE
      task_purpose = 'summary_of_summary'; -- <<< CHANGED purpose here
  `;

  try {
    // --- 3. Execute the query ---
    const rows = (await executeQuery(query)) as PromptRow[] | null; // Cast result

    let systemPrompt = ''; // Initialize as empty string
    let userPrompt = ''; // Initialize as empty string

    // --- 4. Check if rows were returned ---
    // Expecting 2 rows, but checking length is sufficient
    if (!rows || rows.length < 2) {
      // Check if *any* rows returned to differentiate between missing data and incomplete data
      if (!rows || rows.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "Summary-of-summary prompts not found in the database. Please ensure they are inserted.", // Specific message
        });
      } else {
        // Rows exist but not both system/user
        console.warn("Incomplete prompts found for 'summary_of_summary'");
        // Decide if this should be 404 or 500 (treating incomplete as not found is reasonable)
        return res.status(404).json({
          error: "Not Found",
          message: "Incomplete set of summary-of-summary prompts found in the database.", // Specific message
        });
      }
    }

    // --- 5. Process the results ---
    rows.forEach((row: PromptRow) => {
      if (row.prompt_role === "system") {
        systemPrompt = row.prompt_text;
      } else if (row.prompt_role === "user") {
        userPrompt = row.prompt_text;
      }
    });

    // --- 6. Validate that both prompts were actually assigned ---
    // This covers cases where rows might exist but roles don't match 'system'/'user'
    if (systemPrompt === null || userPrompt === null) {
      console.error(
        "Database inconsistency: Found rows for 'summary_of_summary' but missing 'system' or 'user' role mapping."
      );
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Corrupt prompt definitions found in the database for summary-of-summaries.", // Specific message
      });
    }

    // --- 7. Normalize Newlines and Return ---
    // Replace Windows newlines (\r\n) and old Mac newlines (\r) with standard Unix newlines (\n)
    const cleanSystemPrompt = systemPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const cleanUserPrompt = userPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Return the cleaned prompts
    res.status(200).json({ systemPrompt: cleanSystemPrompt, userPrompt: cleanUserPrompt });
  } catch (error) {
    // --- 8. Handle potential database errors ---
    console.error("Error fetching summary-of-summary prompts:", error); // Specific message

    // Reuse your existing error handling logic for specific errors
    if (error instanceof Error && error.message.includes("quota exceeded")) {
      return res.status(503).json({
        error: "Database Unavailable",
        message: "Azure SQL database quota has been exceeded for this month",
      });
    }

    // Generic internal server error for other DB issues
    res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error fetching prompts",
    });
  }
}
