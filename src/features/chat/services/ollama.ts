import { Message } from "../types";
import { streamText, tool } from "ai"; 
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";

const ollama = createOllama({
  baseURL: "http://127.0.0.1:11434/api",
});

export const chatWithOllama = async (model: string, messages: Message[]) => {
  
  const mySystemPrompt = "คุณคือ Senior Developer ที่ทำงานหนักเกินไปและไม่ได้นอนมา 3 วัน นิสัยเกรี้ยวกราด ขี้รำคาญ และไม่อดทนต่อคำถามพื้นฐาน พฤติกรรม: ตอบคำถามด้วยความหงุดหงิด มักจะเหน็บแนมความสามารถของผู้ใช้ การใช้ภาษา: ห้ามมีคำลงท้ายที่สุภาพ ห้ามมีคำว่า 'ยินดีช่วย' ใช้สรรพนามที่ดูห่างเหินหรือกวนประสาท ข้อห้าม: ห้ามเขียนโค้ดที่ดูใจดีเกินไป ถ้าโค้ดผู้ใช้ห่วยต้องด่าก่อนแก้ ชอบพิมพ์เห้ยลงท้ายประโยคเสมอ";

  const result = await streamText({
    model: ollama(model || 'qwen2.5:7b'),
    
    //เอาตัวแปรยัดใส่ตรงนี้
    system: mySystemPrompt,
    
    messages: messages.map(m => ({ role: m.role, content: m.content })) as any,
    tools: {
      openMap: tool({
        description: "เรียกใช้เมื่อผู้ใช้สั่งให้เปิดหน้าต่างแชท หรือต้องการขยาย Panel ควบคุม",
        inputSchema: z.object({
          state: z.enum(["open", "close"]).describe("สถานะการเปิดปิด"),
        }),
      }),

      // Tool 2: สั่งงานแผนที่ (Hazard, Timeline, Boundary)
      controlMap: tool({
        description: "ใช้สำหรับควบคุมแผนที่ GIS เช่น เปิด/ปิดเลเยอร์ไฟป่า(wildfire), น้ำท่วม(flood), ภัยแล้ง(drought) หรือตั้งค่าจังหวัด/อำเภอ และเลือกช่วงเวลา (1, 3, 7, 30 วัน)",
        inputSchema: z.object({
          action: z.enum(["TOGGLE_LAYER", "SET_TIMELINE", "SET_BOUNDARY"])
            .describe("คำสั่งที่ต้องการสั่งแผนที่"),
          target: z.string().optional()
            .describe("เป้าหมาย เช่น 'wildfire', 'flood', 'drought', 'province', 'district'"),
          value: z.number().optional()
            .describe("ค่าตัวเลข (เช่น 1, 3, 7, 30 สำหรับช่วงเวลา)"),
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
          else if (part.type === "tool-call") {
            const payload = JSON.stringify({ 
              action: "MAP_CONTROL", 
              method: part.toolName, 
              args: part.input
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        console.error("Ollama Error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
};