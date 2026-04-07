"use client"

import { useRef, useEffect } from "react"
import { MapPin, Sparkles, User, Bot } from "lucide-react"
import { Message } from "../types"

interface Props {
  messages: Message[];
  isLoading: boolean;
}

export const MessageList = ({ messages, isLoading }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-10 scroll-smooth bg-[#050505]">
      {messages.length === 0 && (
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
            <div className={`flex gap-4 p-5 rounded-3xl ${
              msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none shadow-xl" : "bg-[#111] border border-white/5 rounded-tl-none"
            }`}>
              <div className="opacity-40 text-slate-200">{msg.role === "user" ? <User size={20}/> : <Bot size={20}/>}</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-200">{msg.content}</p>
            </div>
          </div>
        </div>
      ))}
      {isLoading && <div className="flex gap-2 items-center text-blue-500 text-[10px] font-black uppercase tracking-widest ml-4 animate-pulse"><Sparkles size={14} className="animate-spin" /> AI Processing Data...</div>}
    </div>
  )
}