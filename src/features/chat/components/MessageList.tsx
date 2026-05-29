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
  onSendSearch?: (messageId: string, searchQuery: string) => void;
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
  onSendSearch,
  canEdit,
  isLastUserMessage
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const contentWrapperRef = useRef<HTMLDivElement>(null)
  
  const previousScrollHeight = useRef<number>(0)
  const previousScrollTop = useRef<number>(0) 
  
  const isUserScrolledUp = useRef(false)
  const isInitialMount = useRef(true)

  // 🌟 3. เปลี่ยนจาก smooth เป็น instant เพื่อไม่ให้จอกระตุกตอนดึงลง
  const scrollToBottom = (behavior: ScrollBehavior = "instant") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMount.current = false }, 1000) 
    return () => clearTimeout(timer)
  }, [])

  // จัดการดึง Scroll ตอนโหลดประวัติแชทเก่า
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
    const wrapper = contentWrapperRef.current;
    if (!wrapper) return;

    const resizeObserver = new ResizeObserver(() => {
      if (!isUserScrolledUp.current && !isFetchingHistory) {
        scrollToBottom("instant"); 
      }
    });

    resizeObserver.observe(wrapper);
    return () => resizeObserver.disconnect();
  }, [isFetchingHistory]);

  // สั่งดึงจอลงล่างเมื่อมีข้อความใหม่
  useEffect(() => {
    if (messages.length === 0) return;
    
    // รีเซ็ตสถานะ ถือว่าเป็นการโหลดแชทใหม่หรือมี AI กำลังพิมพ์
    if (isLoading || messages.length <= 2) {
       isUserScrolledUp.current = false;
    }

    if (!isUserScrolledUp.current && !isFetchingHistory) {
      scrollToBottom("smooth");
    }
  }, [messages.length, isLoading, isFetchingHistory])

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const currentScrollTop = container.scrollTop;

    // เลื่อนขึ้นสุด ดึงประวัติ
    if (currentScrollTop <= 10) {
      if (isInitialMount.current || isFetchingHistory || !hasMore) return;
      if (onLoadMore) onLoadMore();
    }

    // คำนวณระยะห่างจากขอบล่างสุด
    const distanceFromBottom = container.scrollHeight - currentScrollTop - container.clientHeight;
    
    // ถ้าห่างขอบล่างเกิน 50px แปลว่ายูสเซอร์จงใจเลื่อนขึ้นไปอ่านประวัติ (ห้ามดึงจอแย่งยูสเซอร์)
    if (distanceFromBottom > 50) {
      isUserScrolledUp.current = true;
    } else {
      isUserScrolledUp.current = false;
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
      
      <div ref={contentWrapperRef} className="flex flex-col w-full pb-4">
        
        <div className="flex flex-col space-y-10 w-full">
          {isFetchingHistory && (
            <div className="flex justify-center text-primary text-[10px] font-black uppercase tracking-widest my-4 animate-pulse">
              <Sparkles size={14} className="animate-spin mr-2" /> Loading previous messages...
            </div>
          )}

          {messages.length === 0 && !isFetchingHistory && (
            <div className="flex flex-col items-center justify-center p-4 mt-8">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                <div className="relative bg-card border border-border p-8 rounded-full shadow-2xl">
                  <MapPin size={48} className="text-primary" />
                </div>
              </div>
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
              scrollToBottom={() => scrollToBottom("smooth")}
              onEditMessage={onEditMessage}
              onSendChoice={onSendChoice}
              onSendPagination={onSendPagination}
              onSendSearch={onSendSearch}
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