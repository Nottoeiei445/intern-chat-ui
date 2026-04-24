// src/features/chat/services/chat.service.ts
import apiClient from '@/lib/api-client';
import { CHAT_CONFIG } from '../config/chat.config';

export const chatService = {
  // 1. ดึงประวัติแชททั้งหมด
  getHistories: (userId?: string) => {
    return apiClient.get<any>(`${CHAT_CONFIG.endpoints.history}`, { userId });
  },

  // 2. ดึงรายละเอียดข้อความในแชทนั้นๆ
  getConversationDetail: (conversationId: string, page?: number) => {
    // ถ้ามีการส่งเลขหน้ามา ให้เติม ?page=... ต่อท้าย URL
    const url = page 
      ? `${CHAT_CONFIG.endpoints.conversation}/${conversationId}?page=${page}`
      : `${CHAT_CONFIG.endpoints.conversation}/${conversationId}`;
      
    return apiClient.get<any>(url);
  },

  //3. ส่งข้อความแบบ Stream (SSE)
  sendMessageStream: (payload: { 
    message: string; 
    userId?: string; 
    model?: string;
    ephemeral?: boolean; 
    images?: string[];
    conversationId?: string | null 
  }) => {
    return apiClient.stream(`${CHAT_CONFIG.endpoints.chat}`, payload);
  },

  renameConversation: (id: string, newTitle: string, userId?: string) => {
    const payload: any = { title: newTitle }; // เริ่มต้น payload ด้วยข้อมูลที่จำเป็น
    if (userId) payload.userId = userId; 

    return apiClient.put<any>(`${CHAT_CONFIG.endpoints.conversation}/${id}`, payload);
  },

  // 5. ลบแชท 
  deleteConversation: (id: string) => {
    return apiClient.delete<any>(`${CHAT_CONFIG.endpoints.delete}/${id}`);
  },

editMessage: (messageId: string, newContent: string, is_generate: boolean = false) => {
  return apiClient.put(`/chat/editmessage/${messageId}`, { newContent, is_generate });
},

};
