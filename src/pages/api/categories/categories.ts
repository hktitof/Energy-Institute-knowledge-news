import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds";

// Ensure the DB is connected when the API route is hit
connectDB();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Query to fetch categories, search terms, and links
  const query = `
    SELECT 
      c.CategoryID, c.CategoryName,
      s.SearchTermID, s.Term,
      l.LinkID, l.URL, l.Title
    FROM Categories c
    LEFT JOIN SearchTerms s ON c.CategoryID = s.CategoryID
    LEFT JOIN Links l ON c.CategoryID = l.CategoryID
    ORDER BY c.CategoryID;
  `;

  try {
    const rows = (await executeQuery(query)) || [];

    interface SearchTerm {
      SearchTermID: number;
      Term: string;
    }

    interface Link {
      LinkID: number;
      URL: string;
      Title: string | null;
    }

    interface Category {
      CategoryID: number;
      CategoryName: string;
      searchTerms: SearchTerm[];
      links: Link[];
      articles: Article[];
      articleFetchProgressProps: ArticleFetchProgressProps;
    }

    type Article = {
      id: string;
      title: string;
      summary: string;
      link: string;
      selected: boolean;
    };

    type ArticleFetchProgressProps = {
      totalArticles: number;
      fetchedCount: number;
      errorCount: number;
      currentArticle: string | null;
      isActive: boolean;
    };

    // Group rows into categories with search terms and links
    const categoriesMap: { [key: number]: Category } = {};

    // Track seen IDs to avoid duplicates
    const seenSearchTerms: { [key: string]: boolean } = {};
    const seenLinks: { [key: string]: boolean } = {};

    rows.forEach(
      (row: {
        CategoryID: number;
        CategoryName: string;
        SearchTermID: number | null;
        Term: string | null;
        LinkID: number | null;
        URL: string | null;
        Title: string | null;
      }) => {
        if (!categoriesMap[row.CategoryID]) {
          categoriesMap[row.CategoryID] = {
            CategoryID: row.CategoryID,
            CategoryName: row.CategoryName,
            searchTerms: [],
            links: [],
            articles: [],
            articleFetchProgressProps: {
              totalArticles: 0,
              fetchedCount: 0,
              errorCount: 0,
              currentArticle: null,
              isActive: false,
            },
          };
        }

        // Add search term only if we haven't seen it before for this category
        if (row.SearchTermID !== null) {
          const searchTermKey = `${row.CategoryID}-${row.SearchTermID}`;
          if (!seenSearchTerms[searchTermKey]) {
            categoriesMap[row.CategoryID].searchTerms.push({
              SearchTermID: row.SearchTermID,
              Term: row.Term ?? "",
            });
            seenSearchTerms[searchTermKey] = true;
          }
        }

        // Add link only if we haven't seen it before for this category
        if (row.LinkID !== null) {
          const linkKey = `${row.CategoryID}-${row.LinkID}`;
          if (!seenLinks[linkKey]) {
            // Add to links array
            categoriesMap[row.CategoryID].links.push({
              LinkID: row.LinkID,
              URL: row.URL ?? "",
              Title: row.Title,
            });

            // // Add link as an article (inside the same conditional)
            // categoriesMap[row.CategoryID].articles.push({
            //   id: `link-${row.LinkID}`,
            //   title: row.Title || "Untitled Link",
            //   summary: "",
            //   link: row.URL ?? "",
            //   selected: false,
            // });

            seenLinks[linkKey] = true;
          }
        }
      }
    );

    const categories = Object.values(categoriesMap);
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);

    // Return a more specific error message
    if (error instanceof Error && error.message.includes("quota exceeded")) {
      return res.status(503).json({
        error: "Database Unavailable",
        message: "Azure SQL database quota has been exceeded for this month",
      });
    }

    res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
