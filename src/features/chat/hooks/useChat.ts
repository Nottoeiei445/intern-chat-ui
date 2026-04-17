// src/features/chat/hooks/useChat.ts
"use client"

import { useState, useEffect } from "react";
import { ChatThread, Message } from "../types";
import { useAuth } from "../../auth/context/AuthContext";
import { chatService } from "../services/chat.service"; 

export function useChat() {
  const { user } = useAuth(); // ดึงข้อมูลผู้ใช้จาก Context

  const [chats, setChats] = useState<ChatThread[]>([]); // รายการแชททั้งหมด
  const [activeChatId, setActiveChatId] = useState<string | null>(null); // แชทที่กำลังเปิดอยู่
  const [isLoading, setIsLoading] = useState(false); // สถานะโหลดข้อมูล
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]); // ข้อความชั่วคราวสำหรับ Guest (ไม่เก็บประวัติ)

  // Helper: Sort chats
  const sortChats = (list: ChatThread[]) => { // เรียงตาม updatedAt ใหม่สุดไปเก่าสุด
    return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); // ถ้า updatedAt ไม่มี ให้ถือว่าเป็น 0
  };

  //1. Fetch All Histories
  useEffect(() => { // ดึงประวัติแชททั้งหมดเมื่อผู้ใช้ล็อกอินหรือเปลี่ยนแปลงข้อมูลผู้ใช้
    const fetchAllHistories = async () => { // ถ้าไม่มี user หรือ user.id ให้หยุดการทำงาน (แต่ไม่ต้องเตะออก เพราะเราจะใช้โหมด Guest แทน)
      if (!user?.id) return; //ปลดล็อกเงื่อนไข !user?.id ออก ให้เหลือแค่เช็ค user.id พอ (ถ้าไม่มีไอดี แสดงว่าเป็น Guest เราจะไม่ดึงประวัติ แต่ยังคงทำงานต่อไปได้)
      
      console.group("📡 [INIT] Fetching Chat Histories"); // ใช้ console.group เพื่อจัดกลุ่ม log ให้ดูง่ายขึ้น
      
      try {
        const responseData = await chatService.getHistories(user.id); // ดึงประวัติแชททั้งหมดจากเซิร์ฟเวอร์
        const rawList = responseData.data || responseData; // รองรับทั้งรูปแบบ { data: [...] } และ [...] ตรงๆ

        //SOFT DELETE LOGIC
        const filteredList = rawList.filter((item: any) => { // กรองรายการที่ถูก Soft Deleted ออก (is_active: false หรือ deleted: true)
          const isActive = item.is_active !== false && item.deleted !== true; // ถ้า is_active เป็น false หรือ deleted เป็น true แปลว่าโดนลบแบบ Soft Deleted ให้กรองออก
          if (!isActive) console.warn(`🚫 Ignored Soft Deleted ID: ${item.id}`); // แสดง log สำหรับรายการที่ถูกกรองออก
          return isActive; // คืนค่าเฉพาะรายการที่ยังไม่ถูกลบ (is_active ไม่เป็น false และ deleted ไม่เป็น true)
        });

        const mappedChats: ChatThread[] = filteredList.map((item: any) => ({ // แปลงข้อมูลจาก API ให้เป็นรูปแบบ ChatThread ที่เราต้องการใช้ใน UI
          id: item.id, // ใช้ id ตรงๆ จาก API
          title: item.title || "New Conversation", // ถ้าไม่มี title ให้ตั้งเป็น "New Conversation"
          messages: [],  // เริ่มต้นด้วย messages ว่างๆ ก่อน เดี๋ยวค่อยไปโหลดทีละแชทในภายหลัง (Lazy Load)
          createdAt: new Date(item.created_at).getTime(), // แปลง created_at เป็น timestamp (ตัวเลข)
          updatedAt: new Date(item.last_message_at || item.updated_at || item.created_at).getTime(), // แปลง last_message_at หรือ updated_at หรือ created_at เป็น timestamp (ตัวเลข) โดยให้ความสำคัญกับ last_message_at ก่อน
        }));

        const sorted = sortChats(mappedChats); // เรียงแชทตาม updatedAt ใหม่สุดไปเก่าสุด
        setChats(sorted); // อัปเดตรายการแชทใน State ด้วยข้อมูลที่ถูกกรองและเรียงแล้ว
        console.table(sorted.slice(0, 5)); // แสดงตัวอย่างข้อมูลที่ได้ในรูปแบบตาราง (แค่ 5 รายการแรก)
        
        if (sorted.length > 0 && !activeChatId) { // ถ้ามีแชทอยู่และยังไม่มีแชทที่ถูกเลือกเป็น active ให้ตั้งแชทแรกเป็น active
          setActiveChatId(sorted[0].id); 
        }
      } catch (error) {
        console.error("❌ Failed to fetch histories:", error); // แสดง error ถ้าดึงข้อมูลไม่สำเร็จ
      } finally {
        console.groupEnd(); // จบกลุ่ม log
      }
    };
    fetchAllHistories(); // เรียกใช้ฟังก์ชันดึงประวัติแชททั้งหมด ด้านบนอะ
  }, [user]); // รัน useEffect นี้ใหม่ทุกครั้งที่ข้อมูลผู้ใช้เปลี่ยนแปลง 

  //2. Fetch Chat Detail (Messages)
  useEffect(() => {
    const fetchChatDetail = async () => { 
      if (!activeChatId || activeChatId.startsWith('session_') || chats.length === 0) return; // ถ้าไม่มีแชทที่ถูกเลือก หรือเป็นแชทชั่วคราวที่ยังไม่ถูกบันทึกในระบบ (session_*) หรือยังไม่มีข้อมูลแชทเลย ให้หยุดการทำงาน (ไม่ต้องไปดึงรายละเอียด)
      
      const currentChat = chats.find(c => c.id === activeChatId); // หาแชทที่ถูกเลือกในรายการแชททั้งหมด
      if (!currentChat || (currentChat.messages && currentChat.messages.length > 0)) return; // ถ้าไม่เจอแชทที่ถูกเลือก หรือแชทนั้นมี messages อยู่แล้ว (ไม่ใช่แชทใหม่ที่เพิ่งสร้าง) ให้หยุดการทำงาน (ไม่ต้องไปดึงรายละเอียดซ้ำ)
        setIsLoading(true); // ตั้งสถานะกำลังโหลดข้อมูล
      try {
        const responseData = await chatService.getConversationDetail(activeChatId); // ดึงรายละเอียดของแชทที่ถูกเลือกจากเซิร์ฟเวอร์ (รวมถึงข้อความทั้งหมดในแชทนั้น)
        const messages = responseData.data?.messages || responseData.messages || responseData.data || []; // รองรับทั้งรูปแบบ { data: { messages: [...] } }, { messages: [...] }, หรือ [...] ตรงๆ
        
        setChats(prev => prev.map(chat =>  // อัปเดตเฉพาะแชทที่ถูกเลือกโดยเพิ่ม messages ที่ดึงมาใหม่เข้าไปในแชทนั้น
          chat.id === activeChatId ? { ...chat, messages: messages } : chat // แชทอื่นๆ ไม่เปลี่ยนแปลง
        ));
      } catch (error) {
        console.error("❌ Failed to load messages:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChatDetail(); // เรียกใช้ฟังก์ชันดึงรายละเอียดของแชทที่ถูกเลือก ด้านบนอะ
  }, [activeChatId, chats.length]);  // รัน useEffect นี้ใหม่ทุกครั้งที่แชทที่ถูกเลือกเปลี่ยนแปลง หรือจำนวนแชททั้งหมดเปลี่ยนแปลง (เพื่อรองรับกรณีที่เพิ่งสร้างแชทใหม่แล้ว activeChatId ยังเป็น session_*)

  const createNewChat = () => setActiveChatId(null); //Create New Chat (แค่ตั้ง activeChatId เป็น null เพื่อให้ UI รู้ว่าเรากำลังสร้างแชทใหม่ ถ้า user ยังไม่ล็อกอิน จะใช้โหมด Guest แทน)

  //3. Send Message (เวอร์ชัน Stream SSE)
const sendMessage = async (input: string, model: string, options?: { ephemeral?: boolean }) => { 
  if (!input.trim()) return; // ถ้าข้อความที่ส่งมาเป็นแค่ช่องว่าง ให้หยุดการทำงาน (ไม่ต้องส่งข้อความว่างๆ ไปให้เซิร์ฟเวอร์)
  
  const ephemeral = (!user?.id) ? true : (options?.ephemeral ?? false);

  if (!ephemeral && !user?.id) { // ถ้าไม่ใช่โหมด Guest แต่ไม่มี user.id แปลว่าเกิดความผิดพลาดบางอย่างในระบบล็อกอิน ให้หยุดการทำงานและแสดง error (แต่ไม่ต้องเตะออก เพราะเราจะใช้โหมด Guest แทน)
    console.error("❌ Member mode requires login"); 
    return;
  }

  let currentId = activeChatId; // ใช้ตัวแปรนี้ในการอ้างอิง ID ของแชทที่เรากำลังส่งข้อความอยู่ (อาจจะเป็น ID จริงจากระบบ หรือ session_* สำหรับแชทใหม่ที่ยังไม่ถูกบันทึกในระบบก็ได้)
  const userMsg: Message = { role: "user", content: input }; // สร้างข้อความของผู้ใช้ที่เราจะเพิ่มเข้าไปในแชทก่อนส่งไปให้เซิร์ฟเวอร์
  let isNewSession = false; // ตัวแปรนี้จะช่วยบอกเราว่าเรากำลังสร้างแชทใหม่ที่ยังไม่มี ID จริงในระบบหรือเปล่า (ถ้าเป็น true แปลว่าเราจะส่งข้อความนี้ไปพร้อมกับการสร้างแชทใหม่เลย)

  // --- จัดการ UI (เหมือนเดิม) ---
  if (ephemeral) {
    setEphemeralMessages(prev => [...prev, userMsg]); // สำหรับ Guest ให้ใส่ข้อความของผู้ใช้ลงใน ephemeralMessages ซึ่งจะแสดงเฉพาะในโหมด Guest เท่านั้น
  } else if (currentId && !currentId.startsWith('session_')) { // ถ้ามีแชทที่ถูกเลือกและไม่ใช่แชทชั่วคราว (session_*) ให้เพิ่มข้อความของผู้ใช้เข้าไปในแชทนั้นเลย
    setChats(prev => {
      const updated = prev.map(chat => 
        chat.id === currentId 
          ? { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() } 
          : chat
      );
      return sortChats(updated); 
    });
  } else {
    isNewSession = true; // ถ้าไม่มีแชทที่ถูกเลือก หรือเป็นแชทชั่วคราว (session_*) แปลว่าเรากำลังจะสร้างแชทใหม่ที่ยังไม่มี ID จริงในระบบ ให้ตั้ง isNewSession เป็น true เพื่อบอกเราว่าเราจะส่งข้อความนี้ไปพร้อมกับการสร้างแชทใหม่เลย
    const tempId = `session_${Date.now()}`; // สร้าง ID ชั่วคราวสำหรับแชทใหม่ที่ยังไม่ถูกบันทึกในระบบ (ใช้ session_ ตามด้วย timestamp เพื่อให้แน่ใจว่าไม่ซ้ำกับ ID จริงในระบบ)
    setChats(prev => [{ id: tempId, title: input.slice(0, 30), messages: [userMsg], createdAt: Date.now(), updatedAt: Date.now() }, ...prev]); // เพิ่มแชทใหม่ที่มี ID ชั่วคราวนี้เข้าไปในรายการแชท (แสดงใน UI ทันที) โดยใช้ข้อความของผู้ใช้เป็นชื่อแชทชั่วคราว (ตัดให้ไม่เกิน 30 ตัวอักษร)
    setActiveChatId(tempId); // ตั้งแชทใหม่ที่มี ID ชั่วคราวนี้เป็นแชทที่ถูกเลือกอยู่ (active) เพื่อให้ UI รู้ว่าเรากำลังทำงานกับแชทนี้อยู่
    currentId = tempId; // อัปเดต currentId ให้เป็น ID ชั่วคราวนี้เพื่อใช้ในการส่งข้อความไปให้เซิร์ฟเวอร์ (เซิร์ฟเวอร์จะต้องรับรู้ว่าเรากำลังสร้างแชทใหม่ที่ยังไม่มี ID จริงในระบบอยู่)
  }

  setIsLoading(true); // ตั้งสถานะกำลังโหลดข้อมูล (อาจจะใช้แสดง spinner หรือปิดปุ่มส่งข้อความชั่วคราวใน UI)

  try {
    //จุดแก้ 3: ปรับ Payload ให้รองรับ Guest
    const payload = { 
      message: input, 
      userId: user?.id || 'guest_user', // ถ้าไม่มีไอดี ให้ส่งเป็น guest ไปแทน
      ...(isNewSession ? {} : { conversationId: currentId })
    };

    const response = await chatService.sendMessageStream(payload);
    
    // --- ส่วนดัก Header และ Loop Stream (เหมือนเดิมที่เฮียแก้ไว้) ---
    const realConversationId = response.headers.get('X-Conversation-Id') || response.headers.get('conversation_id');
    const assistantMsg: Message = { role: "assistant", content: "" };

    // อัปเดต State เบื้องต้น
    if (!ephemeral) {
      setChats(prev => prev.map(chat => 
        chat.id === currentId 
          ? { ...chat, id: realConversationId || chat.id, messages: [...chat.messages, assistantMsg] } 
          : chat
      ));
      if (isNewSession && realConversationId) {
        setActiveChatId(realConversationId);
        currentId = realConversationId;
      }
    } else {
      // สำหรับ Guest ให้ใส่ assistantMsg ลงใน ephemeral
      setEphemeralMessages(prev => [...prev, assistantMsg]);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.replace('data: ', '').trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);
              const textChunk = data.text || data.content || "";
              accumulatedContent += textChunk;

              // ตัด <tool_call> ออก
              const displayContent = accumulatedContent.split("<tool_call>").pop()?.trim() || accumulatedContent;

              if (ephemeral) {
                // 🟢 สำหรับขาจร
                setEphemeralMessages(prev => {
                  const newMsgs = [...prev];
                  const lastIdx = newMsgs.length - 1;
                  if (newMsgs[lastIdx]?.role === "assistant") {
                    newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: displayContent };
                  }
                  return newMsgs;
                });
              } else {
                // 🔵 สำหรับสมาชิก
                setChats(prev => prev.map(chat => 
                  chat.id === currentId 
                    ? {
                        ...chat,
                        messages: chat.messages.map((msg, idx) => 
                          idx === chat.messages.length - 1 ? { ...msg, content: displayContent } : msg
                        )
                      }
                    : chat
                ));
              }
            } catch (e) {}
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Stream failed:", error);
  } finally {
    setIsLoading(false);
  }
};


 //4. Delete Chat
 const deleteChat = async (id: string) => {
  if (!user?.id) return;

  console.log(`🗑️ [PROCESS] Requesting server to delete conversation: ${id}`);
  
  setIsLoading(true);

  try {
    await chatService.deleteConversation(id); 
    console.log(`✅ [SUCCESS] Server confirmed deletion (No Body sent)`);

    // 2. ลบออกจากหน้าจอ (UI Update)
    const filtered = chats.filter(c => c.id !== id);
    setChats(filtered);
    
    // ถ้าแชทที่โดนลบคือแชทที่กำลังเปิดอยู่ ให้เด้งไปอันบนสุด
    if (activeChatId === id) {
      setActiveChatId(filtered[0]?.id || null);
    }

  } catch (error: any) {
    console.error("❌ [FAILURE] Server rejected deletion:", error);
    alert(`Failed to delete chat. Server responded with an error.`);
  } finally {
    setIsLoading(false);
  }
};

  // 🛠️ 5. Rename Chat
  const renameChat = async (id: string, newTitle: string) => {
    if (!user?.id) return;

    const originalChats = [...chats];
    setChats(prev => prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat));
    
    try {
      await chatService.renameConversation(id, user.id, newTitle);
    } catch (error) {
      console.error("❌ [FAILURE] Failed to rename chat:", error);
      setChats(originalChats); // Rollback
    }
  };

  return { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat, 
    renameChat, 
    ephemeralMessages 
  };
}