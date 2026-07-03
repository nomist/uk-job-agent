import { describe, expect, it, vi } from "vitest";
import { OpenAiConfig } from "@/infrastructure/llm/openai/openai-config";
import { createChatCompletion } from "@/infrastructure/llm/openai/openai-client";
import { OpenAiChatMessage } from "@/infrastructure/llm/openai/openai-types";

const config: OpenAiConfig = { apiKey: "key123", model: "gpt-4o-mini" };
const messages: OpenAiChatMessage[] = [{ role: "user", content: "hello" }];

function chatCompletionResponse(content: string): Response {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-1",
      model: "gpt-4o-mini-2024-07-18",
      choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
    }),
    { status: 200 },
  );
}

describe("createChatCompletion", () => {
  it("never sends a temperature field, regardless of the configured model", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      chatCompletionResponse("{}"),
    );

    await createChatCompletion(config, messages, fetchImpl);

    const [, init] = fetchImpl.mock.calls[0];
    const requestBody = JSON.parse(init?.body as string);
    expect(requestBody).not.toHaveProperty("temperature");
  });

  it("sends only model, messages, and JSON response mode in the request body", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      chatCompletionResponse("{}"),
    );

    await createChatCompletion(config, messages, fetchImpl);

    const [, init] = fetchImpl.mock.calls[0];
    const requestBody = JSON.parse(init?.body as string);
    expect(requestBody).toEqual({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
    });
  });

  it("uses whatever model is configured via OPENAI_MODEL, unaffected by the temperature fix", async () => {
    const gpt5Config: OpenAiConfig = { apiKey: "key123", model: "gpt-5.5" };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      chatCompletionResponse("{}"),
    );

    await createChatCompletion(gpt5Config, messages, fetchImpl);

    const [, init] = fetchImpl.mock.calls[0];
    const requestBody = JSON.parse(init?.body as string);
    expect(requestBody.model).toBe("gpt-5.5");
    expect(requestBody).not.toHaveProperty("temperature");
  });
});
