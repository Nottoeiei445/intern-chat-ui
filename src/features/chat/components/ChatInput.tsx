"use client"

import { useState, useRef } from "react"
import { Send, Paperclip, Image as ImageIcon, MapPin } from "lucide-react"

interface Props {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading }: Props) => {
  const [input, setInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSendMessage(input)
    setInput("") // Clear input after sending
  }

  // Handle 'Enter' key press (without shift key)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-6 bg-gradient-to-t from-[#050505] to-transparent bg-[#050505]">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-[#111] border border-white/10 rounded-2xl p-2 shadow-2xl focus-within:border-blue-500/50 transition-all text-slate-200 overflow-hidden">
          <textarea
            rows={1}
            placeholder="Ask about GIS layers, population density, or maps..."
            className="w-full bg-transparent p-3 pr-14 text-sm focus:outline-none resize-none placeholder:text-slate-700"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex gap-1">
              <input type="file" ref={fileInputRef} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-600 hover:text-blue-400 transition-colors"><Paperclip size={18} /></button>
              <button className="p-2 text-slate-600 hover:text-blue-400 transition-colors"><ImageIcon size={18} /></button>
              <button className="p-2 text-slate-600 hover:text-blue-400 transition-colors"><MapPin size={18} /></button>
            </div>
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all disabled:opacity-20"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        <p className="text-center text-[9px] text-slate-800 mt-3 font-bold uppercase tracking-[0.3em]">Ollama v0.20.2 Local Node</p>
      </div>
    </div>
  )
}