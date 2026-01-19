// pages/api/prompts/updateSingleArticle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds"; // Adjust path if needed

// Ensure the DB is connected when the API route is hit
connectDB();

// Define the structure of the successful PUT response
interface UpdateSuccessResponse {
  message: string;
}

// Define the structure for error responses
interface ErrorResponse {
  error: string;
  message?: string;
}

// Union type for all possible responses from this handler
type HandlerResponse = UpdateSuccessResponse | ErrorResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<HandlerResponse>) {
  // --- 1. Allow only PUT requests ---
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]); // Inform client only PUT is allowed
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // --- 2. Process PUT Request ---
  try {
    const { systemPrompt, userPrompt, maxWords } = req.body;

    // --- 3. Input Validation ---
    if (
      typeof systemPrompt !== "string" ||
      typeof userPrompt !== "string" ||
      (maxWords !== undefined && typeof maxWords !== "number") // maxWords is optional but must be number if present
    ) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Request body must include 'systemPrompt' and 'userPrompt' as strings.",
      });
    }
    // Add any other validation needed (e.g., checking for empty strings if required)
    // if (systemPrompt.trim() === '' || userPrompt.trim() === '') {
    //    return res.status(400).json({ error: "Bad Request", message: "Prompts cannot be empty." });
    // }

    const finalMaxWords = maxWords ?? 150; // Default if not provided

    // --- 4. Prepare for Database Update ---
    // IMPORTANT: Use Parameterized Queries if your executeQuery supports them!
    // This example uses string escaping as a fallback, which is less secure.
    const escapedSystemPrompt = systemPrompt.replace(/'/g, "''"); // Escape single quotes for SQL Server
    const escapedUserPrompt = userPrompt.replace(/'/g, "''"); // Escape single quotes for SQL Server

    // --- 5. Construct UPDATE Queries ---
    // Note: The text being saved (systemPrompt, userPrompt) contains '\n' newlines
    // because it originates from the textarea state, and the GET API already normalized it.
    const updateSystemQuery = `
      UPDATE PromptDefinitions
      SET
        prompt_text = N'${escapedSystemPrompt}',
        max_words = ${finalMaxWords} -- Update max_words here
      WHERE task_purpose = 'article_summary' AND prompt_role = 'system';
    `;
    const updateUserQuery = `
      UPDATE PromptDefinitions
      SET prompt_text = N'${escapedUserPrompt}'
      -- max_words is typically not updated on the 'user' role row if associated with 'system'
      WHERE task_purpose = 'article_summary' AND prompt_role = 'user';
    `;

    // --- 6. Execute Queries (Consider Transaction) ---
    // Ideally, run these two updates within a single database transaction
    // to ensure atomicity (both succeed or both fail). How to do this
    // depends on your `executeQuery` implementation.
    // Executing sequentially here for simplicity:
    await executeQuery(updateSystemQuery);
    await executeQuery(updateUserQuery);

    return res.status(200).json({ message: "Article summary prompts updated successfully." });
  } catch (error) {
    // --- 8. Handle Errors ---
    console.error("Error updating article summary prompts:", error);

    // Specific DB errors
    if (error instanceof Error && error.message.includes("quota exceeded")) {
      return res.status(503).json({
        error: "Database Unavailable",
        message: "Azure SQL database quota has been exceeded for this month",
      });
    }
    // Other potential constraint errors or connection issues

    // Generic internal server error
    return res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error updating prompts",
    });
  }
}
