"use client"

import { useRef, useEffect, useLayoutEffect } from "react"
import { MapPin, Sparkles, User, Layers } from "lucide-react" 
import { Message } from "../types"
import { MessageItem } from "./MessageItem"

interface Props {
  messages: Message[];
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetchingHistory?: boolean;
  onEditMessage?: (id: string, newContent: string) => void;
  onSelectTemplate?: (text: string) => void; 
}

export const MessageList = ({ 
  messages, 
  isLoading, 
  onLoadMore, 
  hasMore, 
  isFetchingHistory, 
  onEditMessage,
  onSelectTemplate 
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const previousScrollHeight = useRef<number>(0)
  const previousScrollTop = useRef<number>(0) 
  
  const lastMessageRef = useRef<Message | undefined>(undefined)
  const isInitialMount = useRef(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMount.current = false
    }, 1000) 
    return () => clearTimeout(timer)
  }, [])

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isFetchingHistory) {
      previousScrollHeight.current = container.scrollHeight;
      previousScrollTop.current = container.scrollTop;
    } else if (!isFetchingHistory && previousScrollHeight.current > 0) {
      const heightDifference = container.scrollHeight - previousScrollHeight.current;
      container.scrollTop = previousScrollTop.current + heightDifference;
      previousScrollHeight.current = 0;
    }
  }, [messages, isFetchingHistory])

  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];

    if (lastMessageRef.current !== lastMessage && !isFetchingHistory) {
      setTimeout(() => scrollToBottom(), 50)
    }
    
    lastMessageRef.current = lastMessage;
  }, [messages, isFetchingHistory])

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const currentScrollTop = scrollContainerRef.current.scrollTop;

    if (currentScrollTop <= 10) {
      if (isInitialMount.current || isFetchingHistory || !hasMore) return;
      
      if (onLoadMore) {
        onLoadMore();
      }
    }
  }

  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }

  return (
    <div 
      ref={scrollContainerRef} 
      onScroll={handleScroll}
      style={{ overflowAnchor: "none" }}
      className="flex-1 overflow-y-auto p-6 space-y-10 bg-[#050505] custom-scrollbar"
    >
      
      {isFetchingHistory && (
        <div className="flex justify-center text-blue-500 text-[10px] font-black uppercase tracking-widest my-4 animate-pulse">
          <Sparkles size={14} className="animate-spin mr-2" /> Loading previous messages...
        </div>
      )}

      {messages.length === 0 && !isFetchingHistory && (
        <div className="h-full flex flex-col items-center justify-center p-4 min-h-[60vh]">
          {/* Hero Element */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />
            <div className="relative bg-[#111] border border-white/10 p-8 rounded-full shadow-2xl">
              <MapPin size={48} className="text-blue-500" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Geospatial <span className="text-blue-500">Intelligence</span>
            </h2>
            <p className="text-slate-500 text-sm font-ibm max-w-md">
              Start by choosing a task to analyze geospatial data.
            </p>
          </div>

          {/* Bento Grid: กดแล้วส่งค่าผ่าน onSelectTemplate กลับไปไฟล์แม่ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full px-4">
            {[
              { title: "Population Density", desc: "Analyze how people are distributed.", icon: <User size={18}/> },
              { title: "Radius Search", desc: "Find locations within specific range.", icon: <MapPin size={18}/> },
              { title: "Environmental Layers", desc: "Compare vegetation and city zones.", icon: <Sparkles size={18}/> },
              { title: "Custom Analysis", desc: "Upload your CSV/GeoJSON data.", icon: <Layers size={18}/> }
            ].map((item, i) => (
              <button 
                key={i}
                onClick={() => onSelectTemplate?.(item.title)}  
                className="group flex flex-col items-start p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-blue-500/50 transition-all text-left"
              >
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {messages.map((msg, index) => (
        <MessageItem 
          key={msg.id || index}
          msg={msg}
          isLatestUser={index === lastUserIdx}
          isLoading={isLoading}
          isFetchingHistory={isFetchingHistory ?? false}
          scrollToBottom={scrollToBottom}
          onEditMessage={onEditMessage}
        />
      ))}
      
      {isLoading && (
        <div className="flex gap-2 items-center text-blue-500 text-[10px] font-black uppercase tracking-widest ml-4 animate-pulse">
          <Sparkles size={14} className="animate-spin" /> AI Processing Data...
        </div>
      )}

      <div ref={messagesEndRef} className="h-px w-full shrink-0" />
    </div>
  )
}