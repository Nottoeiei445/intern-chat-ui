"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";

import { useChat } from "./hooks/useChat";
import { useAuth } from "../auth/context/AuthContext";
import { useRouter } from "next/navigation";

export const ChatFeature = () => {
  const { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat,
    renameChat,
    ephemeralMessages
  } = useChat();

  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama3");
  const router = useRouter();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    if (!user) {
      setActiveChatId(null);
    } else {
      if (!activeChatId && chats.length > 0) {
        setActiveChatId(chats[0].id);
      }
    }
  }, [user, chats, setActiveChatId, activeChatId]);

  const handleCreateNew = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    createNewChat();
  };

  const handleSelect = (id: string | null) => {
    if (!user) {
      router.push("/login");
      return;
    }
    setActiveChatId(id);
  };

  const handleSendMessage = (val: string, model: string) => {
    if (!user && !activeChatId) {
      sendMessage(val, model, { ephemeral: true });
    } else {
      sendMessage(val, model);
    }
  };

  const currentChat = chats.find(c => c.id === activeChatId);
  const messagesToShow = activeChatId ? (currentChat?.messages || []) : ephemeralMessages;

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-ibm">
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
      
      <div className="flex-1 flex flex-col relative min-w-0">
        <Header 
          isSidebarOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          selectedModel={selectedModel} 
          onModelChange={setSelectedModel} 
        />
        
        <div className="flex-1 overflow-hidden">
          <MessageList 
            messages={messagesToShow} 
            isLoading={isLoading} 
          />
        </div>

        <ChatInput 
          onSendMessage={(val) => handleSendMessage(val, selectedModel)} 
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