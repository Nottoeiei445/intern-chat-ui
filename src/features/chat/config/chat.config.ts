// ดึง Base URL มาจากไฟล์ .env
const BASE_URL = process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || '/api/chat';

export const CHAT_CONFIG = {
  HISTORY: `${BASE_URL}/history`,
  APPEND: `${BASE_URL}/append`,
};