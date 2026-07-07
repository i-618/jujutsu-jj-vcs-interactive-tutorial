var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
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
          parts: [{ text: msg.text }]
        });
      }
    }
    chatContents.push({
      role: "user",
      parts: [{ text: message }]
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI Tutor." });
  }
});
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "docs");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jujutsu tutor server running on http://localhost:${PORT}`);
  });
}
bootstrap();
//# sourceMappingURL=server.cjs.map
