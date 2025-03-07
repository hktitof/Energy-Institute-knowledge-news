import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  // Remove trailing slash if present
  const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, '');
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  console.log('Using deployment:', deploymentName);
  console.log('Endpoint:', endpoint);

  try {
    // Update API version to a more recent one
    const response = await fetch(
      `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey as string,
        },
        body: JSON.stringify({
          messages: [{ 
            role: 'user', 
            content: `Please provide a concise summary of the following news article that captures the key points, main arguments, and important details. Focus on extracting the most valuable information that would be useful to someone who needs to understand the article quickly.

Article text:
${text}` 
          }],
          // max_tokens is the maximum number of tokens to generate, in English it's roughly 0.75 token per word, so it's about 800 * 0.75 = 600 words
          max_tokens: 800,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Azure OpenAI API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      });
      return res.status(response.status).json({
        error: `Azure OpenAI API error: ${errorData.error?.message || 'Unknown error'}`,
      });
    }

    const data = await response.json();
    return res.status(200).json({ summary: data.choices[0].message.content });
  } catch (error) {
    console.error('API request failed:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}