"use client"

import { useState, useRef, ChangeEvent, useEffect } from "react"
import { Send, Image as ImageIcon, X, Layers, Sparkles } from "lucide-react"
import { ApiKeyPopover } from "@/features/auth/components/ApiKeyPopover"
import { useMapStore } from "@/store/useMapStore";
import { SuggestionItem } from "../types";


interface Props {
  onSendMessage: (content: string, images: string[]) => void;
  isLoading: boolean;
  isGuestExpired?: boolean;
  suggestions?: SuggestionItem[]; 
}

export const ChatInput = ({ onSendMessage, isLoading, isGuestExpired = false, suggestions = [] }: Props) => {
  const [input, setInput] = useState("")
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // 🌟 2. ดึง pendingMention และ clearPendingMention ออกมาจาก Store
  const { isKeyModalOpen, dynamicLayers, pendingMention, clearPendingMention } = useMapStore();
  const isInputDisabled = isGuestExpired || isKeyModalOpen;
  const [isMentionOpen, setIsMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionStartIdx, setMentionStartIdx] = useState(-1)
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const [mentionMap, setMentionMap] = useState<Record<string, string>>({})

  const filteredLayers = (dynamicLayers || []).filter(layer =>
    (layer.title || layer.id || "").toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // 🌟 3. พระเอกของเรา: useEffect ดักฟังคำสั่งจาก Store (LayerManager)
  useEffect(() => {
    if (pendingMention) {
      // แงะเอา layerId ออกมาจากคำสั่ง "[layer_id: xxx]"
      const match = pendingMention.text.match(/\[layer_id:\s*([^\]]+)\]/);
      const extractedId = match ? match[1].trim() : null;

      if (extractedId) {
        // ไปค้นหาชื่อเลเยอร์จริงๆ มาโชว์ให้สวยๆ
        const layer = dynamicLayers.find(l => l.id === extractedId || l.layerId === extractedId);
        
        if (layer) {
          // ถ้าเจอ สร้างชื่อสวยๆ แบบ @ชื่อเลเยอร์
          const displayName = `@${(layer.title || layer.id).replace(/\s+/g, '_')}`;
          
          setInput((prev) => {
            const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + displayName + ' ';
          });
          
          // บันทึกลง mentionMap เพื่อให้ตอนกด Send มันแปลงกลับเป็น ID ส่งให้หลังบ้าน
          setMentionMap(prev => ({ ...prev, [displayName]: extractedId }));
        } else {
          // กันเหนียว ถ้าหาไม่เจอจริงๆ ก็โยนข้อความดิบๆ ลงไป
          setInput((prev) => {
            const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + pendingMention.text + ' ';
          });
        }
      }

      // 🌟 สั่งเคลียร์คำสั่งใน Store ทันที เพื่อให้รับคำสั่งรอบถัดไปได้
      clearPendingMention();

      // โฟกัสช่องแชท เผื่อย้ายไปพิมพ์ต่อ
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [pendingMention, dynamicLayers, clearPendingMention]);

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
    setInput(val); 

    const cursor = e.target.selectionStart; 
    const textBeforeCursor = val.slice(0, cursor); 
    const atIndex = textBeforeCursor.lastIndexOf('@'); 

    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')) { 
      const query = textBeforeCursor.slice(atIndex + 1); 

      if (!query.includes(' ')) { 
        setIsMentionOpen(true); 
        setMentionQuery(query); 
        setMentionStartIdx(atIndex); 
        setActiveMentionIndex(0); 
        return;
      }
    }
    setIsMentionOpen(false);
  };

  const insertMention = (layer: any) => {
    const displayName = `@${(layer.title || layer.id).replace(/\s+/g, '_')}`; 
    const layerId = layer.layerId || layer.id; 

    const newValue = input.slice(0, mentionStartIdx) + displayName + ' ' + input.slice(textareaRef.current?.selectionStart || mentionStartIdx + mentionQuery.length + 1);
    setInput(newValue); 
    setMentionMap(prev => ({ ...prev, [displayName]: layerId })); 
    setIsMentionOpen(false); 

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSend = () => {
    if ((!input.trim() && images.length === 0) || isLoading || isInputDisabled) return  
    let finalPayload = input;
    Object.entries(mentionMap).forEach(([displayName, layerId]) => {
      const regex = new RegExp(displayName, 'g');
      finalPayload = finalPayload.replace(regex, `[layer_id: ${layerId}]`);
    });

    onSendMessage(finalPayload, images) 
    
    setInput("")
    setImages([]) 
    setMentionMap({}) 
    setIsMentionOpen(false) 
  };

const handleSuggestionClick = (suggestion: SuggestionItem) => {
  if (isLoading || isInputDisabled) return;

  const isGuidedClear = suggestion.promptTemplate?.toLowerCase().includes("clear layerid");

  if (isGuidedClear) {
    const textToSet = "clear layer: @";
    setInput(textToSet);

    // 2. สั่งกางกล่อง Dropdown ของระบบ Mention 
    setIsMentionOpen(true);
    setMentionQuery(""); // เคลียร์ query เป็นว่างเปล่า เพื่อพ่นรายชื่อ Layer ทั้งหมดออกมาโชว์
    
    // ตั้งตำแหน่งจุดเริ่มแกะคำให้อยู่ตรงเครื่องหมาย @ 
    const atIndex = textToSet.indexOf("@");
    setMentionStartIdx(atIndex); 
    setActiveMentionIndex(0);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textToSet.length;
        textareaRef.current.selectionEnd = textToSet.length;
      }
    }, 50);

    return; 
  }

  let finalPrompt = suggestion.promptTemplate;
  if (suggestion.value) {
    finalPrompt = finalPrompt.replace(/\{value\}/g, suggestion.value);
  }
  onSendMessage(finalPrompt, []); 
  
  setInput("");
  setImages([]);
  setMentionMap({});
  setIsMentionOpen(false);
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

        {suggestions && suggestions.length > 0 && !isMentionOpen && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((suggestion) => {
              const displayLabel = suggestion.value 
                ? `${suggestion.label} ${suggestion.value}` 
                : suggestion.label;
              return (
                <button
                  key={suggestion.key}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading || isInputDisabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-card hover:bg-muted text-foreground rounded-full border border-border shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed animate-in fade-in slide-in-from-bottom-2"
                >
                  <Sparkles size={14} className="text-amber-500" />
                  {displayLabel}
                </button>
              );
            })}
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
        
      </div>
    </div>
  )
}