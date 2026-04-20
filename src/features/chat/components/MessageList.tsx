"use client"

import { useRef, useEffect, useLayoutEffect } from "react"
import { MapPin, Sparkles, User, Bot } from "lucide-react"
import { Message } from "../types"

interface Props {
  messages: Message[];
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetchingHistory?: boolean;
}

export const MessageList = ({ messages, isLoading, onLoadMore, hasMore, isFetchingHistory }: Props) => {
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
        <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[85%] space-y-3">
            {msg.thinking && (
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-xs text-slate-500 font-mono">
                <div className="flex items-center gap-2 mb-2 text-blue-500/50 uppercase tracking-tighter font-bold">
                  <Sparkles size={12} /> Chain of Thought
                </div>
                {msg.thinking}
              </div>
            )}
            <div className={`flex flex-col gap-4 p-5 rounded-3xl ${
              msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none shadow-xl" : "bg-[#111] border border-white/5 rounded-tl-none"
            }`}>
              <div className="flex gap-4">
                <div className="opacity-40 text-slate-200">
                  {msg.role === "user" ? <User size={20}/> : <Bot size={20}/>}
                </div>
                <div className="flex-1 space-y-4">
                  {msg.content && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-200">
                      {msg.content}
                    </p>
                  )}

                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.images.map((imgSrc, imgIdx) => (
                        <div key={imgIdx} className="relative max-w-[200px] max-h-[200px] overflow-hidden rounded-xl border border-white/10 shadow-lg">
                          <img 
                            src={imgSrc} 
                            alt={`attachment-${imgIdx}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onLoad={() => { if (!isFetchingHistory) scrollToBottom() }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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