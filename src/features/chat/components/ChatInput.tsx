"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Send, Paperclip, Image as ImageIcon, MapPin, X } from "lucide-react"

interface Props {
  onSendMessage: (content: string, images: string[]) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading }: Props) => {
  const [input, setInput] = useState("")
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (images.length + newImages.length >= 5) break; 
      const b64 = await fileToBase64(files[i]);
      newImages.push(b64);
    }

    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const newImages: string[] = [];

    for (let i = 0; i < items.length; i++) {
      // เช็คว่าสิ่งที่ Paste มาเป็นไฟล์ และเป็นรูปภาพหรือไม่
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // เช็คโควตา 5 รูปเหมือนเดิมครับเฮีย
          if (images.length + newImages.length >= 5) break;

          const b64 = await fileToBase64(file);
          newImages.push(b64);
        }
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if ((!input.trim() && images.length === 0) || isLoading) return
    onSendMessage(input, images) 
    
    setInput("")
    setImages([]) 
  }

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
          
          {/* UI ส่วน Preview รูปภาพที่ปรับปรุงใหม่ */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 p-3 mb-2 border-b border-white/5 bg-white/[0.02]">
              {images.map((src, idx) => (
                <div key={idx} className="relative group w-16 h-16">
                  <img 
                    src={src} 
                    className="w-full h-full object-cover rounded-xl border border-white/10 shadow-md transition-all group-hover:brightness-75" 
                    alt="preview" 
                  />
                  
                  {/* ปุ่มกากบาทลบรูป - ปรับให้เด่นและกดง่ายขึ้น */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeImage(idx);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 
                               shadow-xl z-20 transition-all scale-100 group-hover:scale-110 active:scale-90"
                    title="Remove image"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>

                  {/* Overlay จางๆ ตอน Hover เพื่อให้รู้ว่ากดลบได้ */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity" />
                </div>
              ))}
            </div>
          )}

          <textarea
            rows={1}
            placeholder="Ask about GIS layers, population density, or maps..."
            className="w-full bg-transparent p-3 pr-14 text-sm focus:outline-none resize-none placeholder:text-slate-700"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
          
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex gap-1">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
              >
                <Paperclip size={18} />
              </button>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
              >
                <ImageIcon size={18} />
              </button>
              <button type="button" className="p-2 text-slate-600 hover:text-blue-400 transition-colors">
                <MapPin size={18} />
              </button>
            </div>
            
            <button 
              type="button"
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && images.length === 0)}
              className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all disabled:opacity-20"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        
        <p className="text-center text-[9px] text-slate-800 mt-3 font-bold uppercase tracking-[0.3em]">
          Ollama v0.20.2 Local Node
        </p>
      </div>
    </div>
  )
}