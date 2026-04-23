// 1. ประกาศ TypeScript Types สำหรับ Environment Variables (ถ้าอยากได้ type safety ตั้งแต่ตอนเขียนโค้ด)
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_COMPANY_API_KEY: string;
      NEXT_PUBLIC_CHAT_API_BASE_URL: string;
      NEXT_PUBLIC_AUTH_API_URL: string;
      NEXT_PUBLIC_MAP_API_KEY_VECTOR_TILES: string;
      NEXT_PUBLIC_MAP_VALLARIS_API_KEY: string;
    }
  }
}

// 2. สร้าง Object สำหรับเก็บ Environment Variables ที่เราต้องการใช้ในแอป (แบบนี้จะได้ autocomplete และ type checking)
export const ENV = {
  COMPANY_API_KEY: process.env.NEXT_PUBLIC_COMPANY_API_KEY,
  MAP_API_KEY: process.env.NEXT_PUBLIC_MAP_API_KEY_VECTOR_TILES,
  CHAT_API_BASE_URL: process.env.NEXT_PUBLIC_CHAT_API_BASE_URL,
  AUTH_API_URL: process.env.NEXT_PUBLIC_AUTH_API_URL,
  MAP_VALLARIS_API_KEY: process.env.NEXT_PUBLIC_MAP_VALLARIS_API_KEY,
} as const;