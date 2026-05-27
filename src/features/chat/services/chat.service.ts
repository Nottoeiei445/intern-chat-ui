// src/features/chat/services/chat.service.ts
import apiClient from '@/lib/api-client';
import { CHAT_CONFIG } from '../config/chat.config';

export const chatService = {
  // 1. ดึงประวัติแชททั้งหมด
  getHistories: (options?: { page?: number, limit?: number }, userId?: string) => {
    let url = `${CHAT_CONFIG.endpoints.history}`;
    const queryParams = [];
    if (options?.page) queryParams.push(`page=${options.page}`);
    if (options?.limit) queryParams.push(`limit=${options.limit}`);
    if (userId) queryParams.push(`userId=${userId}`);
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
    return apiClient.get<any>(url);
  },

  // 2. ดึงรายละเอียดข้อความในแชทนั้นๆ
  getConversationDetail: (conversationId: string, page?: number) => {
    let url = `${CHAT_CONFIG.endpoints.conversation}/${conversationId}/messages`;
    if (page) url += `?page=${page}`;
      
    return apiClient.get<any>(url);
  },

  getConversationLayers: (conversationId: string) => {
    return apiClient.get<any>(`${CHAT_CONFIG.endpoints.conversation}/${conversationId}/map-layers`);
  },

  updateLayersOrder: (conversationId: string, layerIds: string[]) => {
    return apiClient.patch<any>(`${CHAT_CONFIG.endpoints.conversation}/${conversationId}/map-layers`, { layerIds });
  },

  // 3. ส่งข้อความใหม่ (แบบไม่ไหล)
  sendMessageStream: (payload: { 
    message: string; 
    userId?: string; 
    model?: string;
    ephemeral?: boolean; 
    images?: string[];
    conversationId?: string | null 
  }, apiKey?: string) => { // <--- รับ apiKey มาจาก Component

    return apiClient.stream(`${CHAT_CONFIG.endpoints.chat}`, payload, {
      headers: {
        'X-API-Key': apiKey || '',
      }
    });
  },

  renameConversation: (id: string, newTitle: string, userId?: string) => {
    const payload: any = { title: newTitle };
    if (userId) payload.userId = userId; 

    return apiClient.put<any>(`${CHAT_CONFIG.endpoints.conversation}/${id}`, payload);
  },

  // 5. ลบแชท 
  deleteConversation: (id: string) => {
    return apiClient.delete<any>(`${CHAT_CONFIG.endpoints.conversation}/${id}`);
  },

  editMessage: (messageId: string, newContent: string, is_generate: boolean = false) => {
      return apiClient.put(`${CHAT_CONFIG.endpoints.message}/${messageId}`, { 
        newContent, 
        is_generate 
      });
    },

  getModels: () => {
      return apiClient.get<any>(`${CHAT_CONFIG.endpoints.models}`);
    },

};