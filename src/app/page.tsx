"use client"

import { useState } from "react"
import { useChat, Sidebar, Header, MessageList, ChatInput } from "../features/chat"

export default function GISChatPro() {
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

  const [selectedModel, setSelectedModel] = useState("deepseek-r1:7b");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const currentChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-ibm">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={toggleSidebar}
        chats={chats} 
        activeId={activeChatId} 
        onSelect={setActiveChatId} 
        onNew={createNewChat} 
        onDelete={deleteChat} 
        onRename={renameChat}
      />

      <main className="flex-1 flex flex-col relative">
        <Header 
          isSidebarOpen={isSidebarOpen}
          onToggle={toggleSidebar}
          selectedModel={selectedModel} 
          onModelChange={setSelectedModel} 
        />

        <MessageList 
          messages={currentChat?.messages || []} 
          isLoading={isLoading} 
        />

        <ChatInput 
          onSendMessage={(val) => sendMessage(val, selectedModel)} 
          isLoading={isLoading} 
        />
      </main>
    </div>
  )
}