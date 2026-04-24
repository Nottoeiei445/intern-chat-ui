import { Message } from "../types";
import { streamText, tool } from "ai"; 
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";

const ollama = createOllama({
  baseURL: "http://127.0.0.1:11434/api",
});

export const chatWithOllama = async (model: string, messages: Message[]) => {
  const result = await streamText({
    model: ollama(model || 'qwen2.5'),
    messages: messages.map(m => ({ role: m.role, content: m.content })) as any,
    tools: {
      openMap: tool({
        description: "เรียกใช้เมื่อผู้ใช้สั่งให้เปิดแผนที่ (Map), ดูพิกัด หรือแสดงหน้าแผนที่",
        inputSchema: z.object({
          request: z.string().optional().describe("คำสั่ง"),
        }),
      }), 
    },
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            const payload = JSON.stringify({ text: part.text });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } 
          else if (part.type === "tool-call" && part.toolName === "openMap") {
            const payload = JSON.stringify({ action: "REDIRECT", path: "/map" });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        console.error("Ollama Stream Error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
};