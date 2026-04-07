import { Message } from "../types";

export const chatWithOllama = async (model: string, messages: Message[]) => {
  const response = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error("Ollama connection failed");
  return response.json();
};