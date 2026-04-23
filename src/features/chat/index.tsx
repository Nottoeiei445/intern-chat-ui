"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Components
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";

// Hooks & Context
import { useChat } from "./hooks/useChat";
import { useAuth } from "../auth/context/AuthContext";

export const ChatFeature = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  // ดึงตัวแปรที่จำเป็นสำหรับการทำ Pagination มาจาก useChat
  const { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat,
    renameChat,
    editAndResend,
    ephemeralMessages,
    fetchNextPage,     // ฟังก์ชันสำหรับโหลดข้อความหน้าถัดไป (เก่าขึ้น)
    hasMore,          // สถานะเช็คว่ายังมีข้อความเก่าให้โหลดอีกหรือไม่
    isFetchingHistory,   // สถานะขณะกำลังดึงข้อมูลประวัติเก่า
    showExpiryWarning,
    setShowExpiryWarning,
    isGuestExpired,
    setIsGuestExpired
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama3");


  // คำนวณข้อความที่จะแสดงผล
  const messagesToShow = useMemo(() => {
    if (activeChatId) {
      const currentChat = chats.find(c => c.id === activeChatId);
      return currentChat?.messages || [];
    }
    return ephemeralMessages;
  }, [activeChatId, chats, ephemeralMessages]);

  const handleCreateNew = () => {
    if (!user) return router.push("/login");
    createNewChat();
  };

  const handleSelect = (id: string | null) => {
    if (!user) return router.push("/login");
    setActiveChatId(id);
  };

  const handleSendMessage = (val: string, images: string[] = []) => {
    sendMessage(val, selectedModel, images);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-ibm">
      <AlertDialog open={showExpiryWarning} onOpenChange={setShowExpiryWarning}>
        <AlertDialogContent className="bg-[#111] text-slate-200 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-yellow-500 text-xl flex items-center gap-2">
              ⚠️ Session Expiring Soon
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Your guest chat history will be cleared in 5 minutes for security reasons. 
              To save this conversation, please log in to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              Continue as Guest
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => router.push('/login')} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Log In Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        chats={chats} 
        onRename={renameChat}
        activeId={activeChatId} 
        onSelect={handleSelect} 
        onNew={handleCreateNew} 
        onDelete={deleteChat} 
      />
      
      <div className="flex-1 flex flex-col relative min-w-0 h-screen">
        <Header 
          isSidebarOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          selectedModel={selectedModel} 
          onModelChange={setSelectedModel} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden min-h-0"> 
          <MessageList 
            messages={messagesToShow} 
            isLoading={isLoading} 
            onLoadMore={fetchNextPage}
            hasMore={hasMore}
            isFetchingHistory={isFetchingHistory}
            onEditMessage={(id, newContent) => editAndResend(id, newContent, selectedModel)}
          />
        </div>

        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
};

export * from './types';
export * from './hooks/useChat';
export * from './components/Sidebar';
export * from './components/Header';
export * from './components/MessageList';
export * from './components/ChatInput';