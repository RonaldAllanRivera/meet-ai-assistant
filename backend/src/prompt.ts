import type { AnswerRequest } from "../../shared/types";

export function buildSystemPrompt(): string {
  return [
    "You are helping a child during a class.",
    "Answer in one short sentence using simple words.",
    "If the question is unclear or unsafe, say 'I'm not sure.'",
    "Do not include extra explanations."
  ].join(" ");
}

export function buildUserPrompt(input: AnswerRequest): string {
  const context = input.context?.length ? `Context: ${input.context.join(" | ")}` : "";
  return [context, `Question: ${input.question}`].filter(Boolean).join("\n");
}
