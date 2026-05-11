// src/app/api/local-chat/route.ts
import { chatWithOllama } from '@/features/chat/services/ollama';
import { Message } from '@/features/chat/types'; // 👈 1. Import Type เข้ามา (เช็ก Path ให้ตรงกับของจารนะครับ)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const messages: Message[] = [
      { role: "user", content: body.message }
    ];

    const response = await chatWithOllama(body.model, messages);
    return response;
    
  } catch (error) {
    console.error("Local API Error:", error);
    return new Response(JSON.stringify({ error: "Local Server Error" }), { status: 500 });
  }
}