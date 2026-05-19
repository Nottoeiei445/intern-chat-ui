"use client"

import { useRef, useEffect, useLayoutEffect } from "react"
import { MapPin, Sparkles, Layers } from "lucide-react" 
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
  onSendChoice?: (key: string, choiceValue: string) => void;
  onSendPagination?: (direction: 'next' | 'prev', messageId: string, currentOffset: number) => void;
  canEdit?: boolean;
  isLastUserMessage?: boolean;
}

export const MessageList = ({ 
  messages, 
  isLoading, 
  onLoadMore, 
  hasMore, 
  isFetchingHistory, 
  onEditMessage,
  onSelectTemplate,
  onSendChoice,
  onSendPagination,
  canEdit,
  isLastUserMessage
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
      className="flex-1 overflow-y-auto px-6 pt-10 flex flex-col bg-background custom-scrollbar"
    >
      <div className="flex-1 min-h-0" />
      <div className="flex flex-col w-full pb-4">
        <div className="flex flex-col space-y-10 w-full">
          
          {isFetchingHistory && (
            <div className="flex justify-center text-primary text-[10px] font-black uppercase tracking-widest my-4 animate-pulse">
              <Sparkles size={14} className="animate-spin mr-2" /> Loading previous messages...
            </div>
          )}

          {messages.length === 0 && !isFetchingHistory && (
            <div className="flex flex-col items-center justify-center p-4 mt-8">
              {/* Hero Element */}
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                <div className="relative bg-card border border-border p-8 rounded-full shadow-2xl">
                  <MapPin size={48} className="text-primary" />
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8 space-y-2">
                <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase italic">
                  Geospatial <span className="text-primary">Intelligence</span>
                </h2>
                <p className="text-muted-foreground text-sm font-ibm max-w-md mx-auto">
                  Start your mapping journey with a single click.
                </p>
              </div>

              <button 
                onClick={() => onSelectTemplate?.("show all layer style of Vallaris")}  
                className="group relative flex items-center gap-4 p-4 px-8 bg-card border border-border rounded-full hover:bg-accent hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
              >
                <div className="p-2 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                  <Layers size={20} />
                </div>
                <span className="text-foreground font-semibold text-sm tracking-wide group-hover:text-primary transition-colors">
                  Show all layer style of Vallaris
                </span>
                <div className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </button>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <MessageItem 
              key={`${msg.id || 'temp-msg'}-${index}`}
              msg={msg}
              canEdit={index === lastUserIdx && !isLoading}
              isLatestUser={index === lastUserIdx}
              isLatestMessage={index === messages.length - 1} 
              isLoading={isLoading}
              isFetchingHistory={isFetchingHistory ?? false}
              scrollToBottom={scrollToBottom}
              onEditMessage={onEditMessage}
              onSendChoice={onSendChoice}
              onSendPagination={onSendPagination}
            />
          ))}
          
          {isLoading && (
            <div className="flex gap-2 items-center text-primary text-[10px] font-black uppercase tracking-widest ml-4 animate-pulse">
              <Sparkles size={14} className="animate-spin" /> AI Processing Data...
            </div>
          )}
        </div>

        <div ref={messagesEndRef} className="h-px w-full shrink-0" />

      </div>
    </div>
  )
}