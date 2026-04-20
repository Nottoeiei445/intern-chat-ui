export interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  images?: string[]; 
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

// ? = ตัวแปรนี้จะมีหรือไม่มีก็ได้ ไม่บังคับ