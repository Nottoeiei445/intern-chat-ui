
export const CHAT_CONFIG = {
  // API Configuration
  api: {
    baseURL: process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:3000",
    withCredentials: true, 
    
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true", //ทะลวง Ngrok 
    },
  },

  endpoints: {
    chat: "/chat/",
    conversation: "/chat/history",
    history: "/chat/histories",
    delete: "/chat/delete", 
    
  },

  // Chat Validation & Settings
  settings: {
    maxMessageLength: 2000,
    defaultTitleLength: 30, // ตัดชื่อแชทแค่ 30 ตัวอักษร
    ephemeralModeDefault: false,
  },

  // Feature Flags
  features: {
    enableChatLogging: true,     // เปิด Log ดูการยิง API แชท
    enableAutoScroll: true,      // เลื่อนหน้าจอลงอัตโนมัติเวลาแชทมา
    enableStreaming: true,      // เผื่ออนาคตเพื่อนทำระบบข้อความไหลๆ
  },

  
};

export type ChatConfig = typeof CHAT_CONFIG;