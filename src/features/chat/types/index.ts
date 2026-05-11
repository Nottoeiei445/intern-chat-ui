export interface ClarityChoice {
  label: string;
  value: string;
  // อนาคตถ้าอยากแนบประเภท Layer หรือ Provider ก็สามารถเพิ่มได้ เช่น:
  // type?: "layer" | "provider";
}

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  images?: string[]; 
  choices?: ClarityChoice[];
  choiceKey?: string; // เพื่อระบุว่าชุด choices นี้เกี่ยวข้องกับคำถามหรือข้อความไหน (ถ้ามี)
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