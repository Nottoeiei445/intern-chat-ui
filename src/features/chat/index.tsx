"use client";

import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";

import { useChat } from "./hooks/useChat";

export const ChatFeature = () => {
  const { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat,
    renameChat
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama3");

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const currentChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-ibm">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={toggleSidebar}
        chats={chats} 
        onRename={renameChat}
        activeId={activeChatId} 
        onSelect={setActiveChatId} 
        onNew={createNewChat} 
        onDelete={deleteChat} 
      />
      
      <div className="flex-1 flex flex-col relative min-w-0">
        <Header 
          isSidebarOpen={isSidebarOpen} 
          onToggle={toggleSidebar}
          selectedModel={selectedModel} 
          onModelChange={setSelectedModel} 
        />
        
        <div className="flex-1 overflow-hidden">
          <MessageList 
            messages={currentChat?.messages || []} 
            isLoading={isLoading} 
          />
        </div>

        <ChatInput 
          onSendMessage={(val) => sendMessage(val, selectedModel)} 
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