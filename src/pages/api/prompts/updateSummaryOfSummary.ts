// pages/api/prompts/updateSummaryOfSummary.ts
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
    const { systemPrompt, userPrompt } = req.body;

    // --- 3. Input Validation ---
    if (typeof systemPrompt !== "string" || typeof userPrompt !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Request body must include 'systemPrompt' and 'userPrompt' as strings.",
      });
    }

    // --- 4. Prepare for Database Update ---
    // IMPORTANT: Use Parameterized Queries if possible!
    const escapedSystemPrompt = systemPrompt.replace(/'/g, "''"); // Escape single quotes
    const escapedUserPrompt = userPrompt.replace(/'/g, "''"); // Escape single quotes

    // --- 5. Construct UPDATE Queries ---
    const updateSystemQuery = `
      UPDATE PromptDefinitions
      SET prompt_text = N'${escapedSystemPrompt}'
      WHERE task_purpose = 'summary_of_summary' AND prompt_role = 'system'; -- <<< CHANGED purpose
    `;
    const updateUserQuery = `
      UPDATE PromptDefinitions
      SET prompt_text = N'${escapedUserPrompt}'
      WHERE task_purpose = 'summary_of_summary' AND prompt_role = 'user'; -- <<< CHANGED purpose
    `;

    // --- 6. Execute Queries (Consider Transaction) ---
    await executeQuery(updateSystemQuery);
    await executeQuery(updateUserQuery);

    // --- 7. Send Success Response ---
    return res.status(200).json({ message: "Summary-of-summary prompts updated successfully." }); // Specific message
  } catch (error) {
    // --- 8. Handle Errors ---
    console.error("Error updating summary-of-summary prompts:", error); // Specific message

    // Specific DB errors
    if (error instanceof Error && error.message.includes("quota exceeded")) {
      return res.status(503).json({
        error: "Database Unavailable",
        message: "Azure SQL database quota has been exceeded for this month",
      });
    }

    // Generic internal server error
    return res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error updating prompts",
    });
  }
}
