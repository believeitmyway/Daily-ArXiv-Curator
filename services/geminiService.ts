
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Paper } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to normalize URLs.
 */
const normalizeUrl = (url: string, title: string): string => {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(title)}`;
  
  if (!url || url === 'N/A') return searchUrl;
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    // Block internal Google AI Studio links explicitly
    if (domain.includes("aistudio.google") || domain.includes("googleapis.com")) {
      return searchUrl;
    }

    // Trusted Academic Domains Whitelist
    const trustedDomains = [
      "arxiv.org",
      "openreview.net",
      "nature.com",
      "science.org",
      "neurips.cc",
      "iclr.cc",
      "acm.org",
      "ieee.org",
      "cvf.com",
      "aclweb.org",
      "github.com",
      "huggingface.co"
    ];

    const isTrusted = trustedDomains.some(d => domain.includes(d));

    // Special handling for ArXiv to ensure abstract link
    if (domain.includes("arxiv.org")) {
      const match = url.match(/(\d{4}\.\d{4,5}|[a-z\-]+\/\d{7})/);
      if (match) {
        return `https://arxiv.org/abs/${match[0]}`;
      }
      return searchUrl;
    }

    return isTrusted ? url : searchUrl;
  } catch (e) {
    return searchUrl;
  }
};

/**
 * Step 1: Search & Gather Data (Text Mode with Tools)
 */
export const findPapers = async (promptQuery: string): Promise<string> => {
  const model = "gemini-2.5-flash"; 
  
  const searchPrompt = `
    Act as a senior research assistant.
    Goal: Find 3-5 LATEST and MOST IMPACTFUL research papers about: "${promptQuery}".

    **EXECUTION STEPS:**
    1. **Search**: Find high-quality papers (arXiv, NeurIPS, CVPR, Nature, etc.) published recently.
    2. **Web Presence Check (Viral/Buzz)**:
       - For each paper found, YOU MUST perform a Google Search for the **exact title** in double quotes (e.g. "Paper Title").
       - **Look for the "About X results" count** in the search metadata if available.
       - **IF NOT VISIBLE**, count how many search results (snippets) are from **non-academic sources** (blogs, Twitter/X, Reddit, News, GitHub).
       - Report the "Web Buzz" as either the Hit Count (e.g. "12,400 results") OR the Source Count (e.g. "5+ news sources", "Discussed on X/Reddit", or "Academic only").

    **OUTPUT FORMAT (Text Report):**
    For each paper:
    - Title
    - Authors
    - Published Date
    - URL
    - Citation Count: (e.g. "124" or "0")
    - Web Buzz: (e.g. "12,000 hits", "Viral on X", "8+ blog posts", "Academic only")
    - Abstract/Summary in English
    
    Ensure you explicitly state "Academic only" if no buzz is found.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable search specifically for this step
      },
    });
    
    return response.text || "";
  } catch (error) {
    console.error("Error searching papers:", error);
    throw new Error("Failed to search for papers.");
  }
};

/**
 * Step 2: Parse & Format (JSON Mode, NO Tools)
 */
export const curateAndParsePapers = async (topicId: string, searchResultText: string): Promise<Paper[]> => {
  const model = "gemini-2.5-flash";

  const prompt = `
    You are a data extraction specialist.
    
    **SOURCE TEXT:**
    ${searchResultText}

    **TASK:**
    1. Extract the research papers from the source text above.
    2. **Calculate 'engagementScore' (0-100)**:
       - **Base**: 50
       - **Citation Boost**: +1 per citation (max +30).
       - **Viral Boost (Web Buzz)**:
         - If 'Web Buzz' mentions "k" (thousands) or > 1000 hits -> **+40 points**.
         - If 'Web Buzz' mentions "Viral", "Trending", "Reddit", "Twitter", "X" -> **+30 points**.
         - If 'Web Buzz' has > 10 sources/posts -> **+20 points**.
         - If 'Web Buzz' is "Academic only" or "0" -> **0 points**.
       - **Recency**: Last 30 days (+10).
    3. Translate the summary to Japanese.
    4. Return strict JSON.

    **FIELDS REQUIRED:**
    - title
    - authors (array of strings)
    - publishedDate (YYYY-MM-DD)
    - url
    - summary (Japanese, 1 sentence punchline)
    - abstract (English original)
    - abstractJa (Japanese translation)
    - engagementScore (number)
    - engagementReason (Short explanation, e.g. "New but Viral: 12k hits")
    - impactBadge (Short string, e.g. "Viral Hit", "Highly Cited", "New Arrival")
    - citationCount (String, e.g. "0" or "150")
    - webMentionCount (String. e.g. "12.5k hits", "Viral on X", "Academic only". If missing, use "N/A")
    - imageUrl (String, optional)
  `;

  // Define strict schema for reliable parsing
  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        authors: { type: Type.ARRAY, items: { type: Type.STRING } },
        publishedDate: { type: Type.STRING },
        url: { type: Type.STRING },
        summary: { type: Type.STRING },
        abstract: { type: Type.STRING },
        abstractJa: { type: Type.STRING },
        engagementScore: { type: Type.NUMBER },
        engagementReason: { type: Type.STRING },
        impactBadge: { type: Type.STRING },
        citationCount: { type: Type.STRING },
        webMentionCount: { type: Type.STRING },
        imageUrl: { type: Type.STRING }
      },
      required: ["title", "authors", "publishedDate", "url", "summary", "abstract", "abstractJa", "engagementScore", "citationCount", "webMentionCount"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        // NO TOOLS HERE. Pure text-to-json extraction.
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    let parsed: any[] = [];
    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        console.error("JSON Parse Error in Step 2:", e);
        return [];
    }

    return parsed.map((p: any) => ({
        ...p,
        url: normalizeUrl(p.url, p.title), 
        id: p.url || Math.random().toString(36).substr(2, 9),
        topicId,
        impactBadge: p.impactBadge || (p.engagementScore > 80 ? "Must Read" : "New Arrival"),
        citationCount: p.citationCount || "0",
        webMentionCount: p.webMentionCount || "N/A",
        imageUrl: p.imageUrl && p.imageUrl.startsWith("http") ? p.imageUrl : undefined
    }));
  } catch (error) {
    console.error("Error parsing papers:", error);
    return [];
  }
};
