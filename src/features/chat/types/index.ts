export interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}