"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Send, Paperclip, Image as ImageIcon, MapPin, X, Layers } from "lucide-react"
import { ApiKeyPopover } from "@/features/auth/components/ApiKeyPopover"
import { useMapStore } from "@/store/useMapStore";
import dynamic from "next/dynamic";
import { useDynamicLayers } from "@/features/map/hooks/useDynamicLayers";
import { text } from "stream/consumers";
import { set } from "zod";

interface Props {
  onSendMessage: (content: string, images: string[]) => void;
  isLoading: boolean;
  isGuestExpired?: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading, isGuestExpired = false }: Props) => {
  const [input, setInput] = useState("")
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isKeyModalOpen, dynamicLayers } = useMapStore();
  const isInputDisabled = isGuestExpired || isKeyModalOpen;
  const [isMentionOpen, setIsMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionStartIdx, setMentionStartIdx] = useState(-1)
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const [mentionMap, setMentionMap] = useState<Record<string, string>>({})

  const filteredLayers = (dynamicLayers || []).filter(layer =>
    (layer.title || layer.id || "").toLowerCase().includes(mentionQuery.toLowerCase())
  );

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
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
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

  const handleMentionInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val); // อัปเดตข้อความปกติที่แสดงบนจอ

    const cursor = e.target.selectionStart; // ตำแหน่งเคอร์เซอร์
    const textBeforeCursor = val.slice(0, cursor); // ข้อความก่อนเคอร์เซอร์
    const atIndex = textBeforeCursor.lastIndexOf('@'); // ค้นหา @ ล่าสุดก่อนเคอร์เซอร์

    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')) { // ตรวจสอบว่า @ นั้นเป็นจุดเริ่มต้นของคำหรือไม่
      const query = textBeforeCursor.slice(atIndex + 1); // ข้อความหลัง @

      if (!query.includes(' ')) { // ถ้าไม่มีช่องว่างต่อจากพิมพ์ @ แสดงว่าเรายังอยู่ในช่วงพิมพ์ชื่อ layer
        setIsMentionOpen(true); // เปิด dropdown
        setMentionQuery(query); // อัปเดต query สำหรับกรองเลเยอร์
        setMentionStartIdx(atIndex); // บันทึกตำแหน่งเริ่มต้นของ @ เพื่อใช้ในการแทรกชื่อเลเยอร์ภายหลัง
        setActiveMentionIndex(0); // รีเซ็ตการเลือกใน dropdown
        return;
      }
    }
    setIsMentionOpen(false);
  };

  const insertMention = (layer: any) => {
    const displayName = `@${(layer.title || layer.id).replace(/\s+/g, '_')}`; // สร้างชื่อที่จะแสดงในข้อความ โดยแทนที่ช่องว่างด้วย _ เพื่อป้องกันปัญหาในการแยกคำ
    const layerId = layer.layerId || layer.id; // ใช้ layerId ที่มาจากข้อมูลเลเยอร์จริงๆ แทนการใช้ชื่อที่แสดง

    // แทรกชื่อเลเยอร์ที่เลือกลงในข้อความ โดยแทนที่ส่วนที่พิมพ์หลัง @ ด้วยชื่อที่แสดง
    const newValue = input.slice(0, mentionStartIdx) + displayName + ' ' + input.slice(textareaRef.current?.selectionStart || mentionStartIdx + mentionQuery.length + 1);
    setInput(newValue); // อัปเดตข้อความใน textarea
    setMentionMap(prev => ({ ...prev, [displayName]: layerId })); // บันทึกการแมปชื่อที่แสดงกับ layerId จริง
    setIsMentionOpen(false); // ปิด dropdown หลังเลือก

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSend = () => {
    if ((!input.trim() && images.length === 0) || isLoading || isInputDisabled) return  
    let finalPayload = input;
    Object.entries(mentionMap).forEach(([displayName, layerId]) => {
      // ใช้ Regex แทนที่ทุกจุดที่พบ Display Name ให้เป็น [layer_id: xxx]
      const regex = new RegExp(displayName, 'g');
      finalPayload = finalPayload.replace(regex, `[layer_id: ${layerId}]`);
    });

    onSendMessage(finalPayload, images) 
    
    setInput("")
    setImages([]) 
    setMentionMap({}) // ล้างความจำหลังส่ง
    setIsMentionOpen(false) 
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveMentionIndex(prev => Math.min(prev + 1, filteredLayers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredLayers[activeMentionIndex]) {
          insertMention(filteredLayers[activeMentionIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setIsMentionOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  };

  return (
    <div className="p-6 bg-gradient-to-t from-background to-transparent bg-background">
      <div className="max-w-4xl mx-auto relative">

        <ApiKeyPopover />

        {isMentionOpen && filteredLayers.length > 0 && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2">
            <div className="p-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border flex items-center gap-2">
              <Layers size={14} /> Select a layer
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {filteredLayers.map((layer, idx) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => insertMention(layer)}
                  onMouseEnter={() => setActiveMentionIndex(idx)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex flex-col ${
                    idx === activeMentionIndex ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="font-medium truncate">{layer.title || layer.id}</span>
                  <span className="text-[10px] text-muted-foreground opacity-70 truncate">{layer.id}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`relative bg-card border rounded-2xl p-2 shadow-2xl transition-all text-foreground overflow-hidden ${
          isInputDisabled ? "border-border/50 opacity-50" : "border-border focus-within:border-primary/50"
        }`}>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 p-3 mb-2 border-b border-border bg-muted/30">
              {images.map((src, idx) => (
                <div key={idx} className="relative group w-16 h-16">
                  <img 
                    src={src} 
                    className="w-full h-full object-cover rounded-xl border border-border shadow-md transition-all group-hover:brightness-75" 
                    alt="preview" 
                  />
                  
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeImage(idx);
                    }}
                    disabled={isInputDisabled} 
                    className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 
                               shadow-xl z-20 transition-all scale-100 group-hover:scale-110 active:scale-90 disabled:opacity-50"
                    title="Remove image"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>

                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity" />
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            disabled={isInputDisabled} 
            placeholder={
              isKeyModalOpen ? "Please provide API Key above..." :
              isGuestExpired ? "Session expired. Please refresh..." : 
              "Ask about GIS, maps, or layers..." 
            }
            className={`w-full bg-transparent p-3 pr-14 text-sm leading-relaxed focus:outline-none resize-none placeholder:text-muted-foreground text-foreground ${
              isInputDisabled ? "cursor-not-allowed" : ""
            }`}
            value={input}
            onChange={handleMentionInput}
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
                disabled={isInputDisabled}
              />
              <button 
                type="button"
                onClick={() => !isInputDisabled && fileInputRef.current?.click()} 
                disabled={isInputDisabled} 
                className={`p-2 transition-colors ${isInputDisabled ? "text-muted-foreground/50 cursor-not-allowed" : "text-muted-foreground hover:text-primary"}`}
              >
                <ImageIcon size={18} />
              </button>
            </div>
            
            <button 
              type="button"
              onClick={handleSend}
              disabled={isLoading || isInputDisabled || (!input.trim() && images.length === 0)} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        
        <p className="text-center text-[9px] text-muted-foreground/50 mt-3 font-bold uppercase tracking-[0.3em]">
          Ollama v0.20.2 Local Node
        </p>
      </div>
    </div>
  )
}