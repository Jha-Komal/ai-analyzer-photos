import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local before generating insights/reports.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const DEFAULT_MODEL = "claude-sonnet-5";

interface CompleteOptions {
  model?: string;
  maxTokens?: number;
}

/** Sends a single prompt and returns raw text, expecting a JSON array response. */
export async function completeJson(prompt: string, options: CompleteOptions = {}): Promise<string> {
  const { model = DEFAULT_MODEL, maxTokens = 8000 } = options;
  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0.2,
    system:
      "You are an expert UX researcher specializing in photo/memory retrieval behavior. Always respond with valid JSON only, no markdown, no explanation, no code fences.",
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

/** Sends a prompt expecting a long structured-text report (not JSON). */
export async function completeText(prompt: string, options: CompleteOptions = {}): Promise<string> {
  const { model = DEFAULT_MODEL, maxTokens = 8000 } = options;
  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0.2,
    system:
      "You are a senior product researcher producing a rigorous, evidence-grounded research report. Follow the requested structure and section order exactly. Respond with the report text only -- no markdown code fences, no preamble.",
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}
