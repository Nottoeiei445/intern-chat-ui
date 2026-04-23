"use client"

import { useRef, useEffect, useLayoutEffect } from "react"
import { MapPin, Sparkles } from "lucide-react"
import { Message } from "../types"
import { MessageItem } from "./MessageItem"

interface Props {
  messages: Message[];
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetchingHistory?: boolean;
  onEditMessage?: (id: string, newContent: string) => void;
}

export const MessageList = ({ messages, isLoading, onLoadMore, hasMore, isFetchingHistory, onEditMessage }: Props) => {
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
        <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none text-slate-200">
          <MapPin size={64} className="mb-4 text-blue-500" />
          <h2 className="text-2xl font-black">GIS ANALYSIS AI</h2>
          <p className="text-sm">Start a conversation to analyze geospatial data.</p>
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