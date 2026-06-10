
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
    chat: "/chat",
    history: "/chat/conversations", // ดึงประวัติแชท
    conversation: "/chat/conversations", // ดึงข้อมูลแชทเฉพาะ conversationId
    message: "/chat/messages",
    models: "/chat/models",   // ดึงรายชื่อโมเดลที่ใช้ได้
    exploreAnalytics: '/core/api/analytics/1.0/explore',
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

  pagination: {
    pageSize: 5, // จำนวนข้อความต่อหน้าเวลาดึงประวัติแชท
  },

  mapEvents: {
    layerCatalog: 'layer_catalog',
    mapStyle: 'map_style',
    mapClear: 'map_clear',
    mapOptions: 'map_options',
    suggestions: 'suggestions',
    messageUpdate: 'message',
    missingApiKey: 'missing_api_key',
    mapStylePatch: 'map_style_patch',
    mapFilterPatch: 'map_filter_patch',
  },

  mapClearModes: {
    all: 'all',
    selected: 'selected',
  },
  
};

export type ChatConfig = typeof CHAT_CONFIG;