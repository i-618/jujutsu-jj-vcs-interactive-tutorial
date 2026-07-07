import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to avoid crashing if the API key is missing.
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint for AI Tutor
app.post("/api/tutor", async (req, res) => {
  try {
    const { message, history, currentLevel, levelGoal } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are an expert Jujutsu (jj) version control assistant and a gamified tutor for the "Learn Jujutsu" interactive app.
Jujutsu (jj) is a modern, Git-compatible version control system developed primarily at Google.
Key concepts of jj:
1. Working-copy commit is automatic: Every change is immediately committed in the background to the working copy commit (marked with '@'). There is no "git add" or manual staging.
2. First-class conflicts: Conflicts don't block work. Conflicted states are recorded directly in commits, so you can commit, rebase, and share conflicted states, and resolve them when ready.
3. Change IDs vs Commit IDs: A commit has a stable Change ID (e.g., 'qpvzunst') that stays the same when it is amended or rebased, and a standard Git-like Commit ID (hash) that changes.
4. Bookmarks (formerly branches) are just pointers. jujutsu recently renamed "branches" to "bookmarks".
5. Robust undo: 'jj undo' can undo almost any repository-level transaction using operation logs.

Answer the user's questions about Jujutsu (jj) vs Git clearly, briefly, and with helpful suggestions. 
If they are stuck on the current level (${currentLevel || "none"}), help guide them. The current level goal is: ${levelGoal || "none"}.
Avoid deep clinical developer jargon where possible. Keep the tone friendly, highly encouraging, and objective.`;

    const chatContents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        chatContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }
    chatContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI Tutor." });
  }
});

// Start server and handle Vite middleware in development
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jujutsu tutor server running on http://localhost:${PORT}`);
  });
}

bootstrap();
