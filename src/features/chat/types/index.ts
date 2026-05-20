export interface ClarityChoice {
  label: string;
  value: string;
}

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  images?: string[]; 
  choices?: ClarityChoice[];
  choiceKey?: string; // เพื่อระบุว่าชุด choices นี้เกี่ยวข้องกับคำถามหรือข้อความไหน (ถ้ามี)
  imageUrl?: string; // สำหรับเก็บ URL ของภาพที่แนบมา (ถ้ามี)
  pagination?: {         
    numberReturned: number;
    numberMatched: number;
    hasNext: boolean;
    hasBack: boolean;
    offset?: number;
  };
  metadata?: any;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

export interface SuggestionItem {
  key: string;
  label: string;
  value?: string;
  promptTemplate: string;
}

// ? = ตัวแปรนี้จะมีหรือไม่มีก็ได้ ไม่บังคับ