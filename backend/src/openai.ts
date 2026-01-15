import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { AnswerRequest } from "../../shared/types";

type OpenAIMessage = {
  role: "system" | "user";
  content: string;
};

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 8000;

export async function requestAnswer(
  input: AnswerRequest,
  apiKey: string,
  model = DEFAULT_MODEL
): Promise<string> {
  const messages: OpenAIMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserPrompt(input) }
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 80
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as OpenAIChatResponse;
    return payload.choices?.[0]?.message?.content?.trim() ?? "";
  } finally {
    clearTimeout(timer);
  }
}
