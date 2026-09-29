import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: ".env.local" });

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set. Add it to .env.local before running the analysis pipeline.");
}

export const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";
