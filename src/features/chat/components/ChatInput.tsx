"use client"

import { useState, useRef, ChangeEvent, useEffect } from "react"
import { Send, Image as ImageIcon, X, Sparkles } from "lucide-react"
import { ApiKeyPopover } from "@/features/auth/components/ApiKeyPopover"
import { useMapStore } from "@/store/useMapStore";
import { SuggestionItem } from "../types";

// 1. นำเข้าและตั้งค่า Tiptap Editor พร้อม Extension สำหรับระบบ Mention ที่จะใช้แปลงข้อความพิเศษเป็นป้าย Chip
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { useApiKeys } from "@/features/auth/hooks/useApiKeys";
import { suggestion } from './suggestion'

interface Props {
  onSendMessage: (content: string, images: string[]) => void;
  isLoading: boolean;
  isGuestExpired?: boolean;
  suggestions?: SuggestionItem[];
}

export const ChatInput = ({ onSendMessage, isLoading, isGuestExpired = false, suggestions = [] }: Props) => {
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { isKeyModalOpen, dynamicLayers, pendingMention, clearPendingMention, currentConversationApiKey } = useMapStore();
  const isInputDisabled = isGuestExpired || isKeyModalOpen;
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const { keys, hosts } = useApiKeys();
  const activeKeyObj = keys.find(k => k.id === currentConversationApiKey || k.maskedKey === currentConversationApiKey);
  const currentHost = hosts.find((h) => h.id === activeKeyObj?.hostId);
  const activeHostName = currentHost ? currentHost.hostname : null;

  const editor = useEditor({
  extensions: [
    StarterKit.configure({
      paragraph: { HTMLAttributes: { class: 'leading-relaxed text-sm text-foreground' } },
    }),
    Mention.configure({
      HTMLAttributes: {
        class: 'bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-md mx-0.5 inline-block border border-primary/20 select-all cursor-pointer hover:bg-primary/20 transition-colors',
      },
      suggestion,
      // ฟังก์ชันนี้จะถูกเรียกเมื่อ Tiptap ต้องการแปลง Node ของ Mention เป็นข้อความที่สามารถแสดงใน Editor ได้ โดยจะดึงค่า label หรือ id มาแสดงแทน
      renderLabel({ node }) {
        return `${node.attrs.label ?? node.attrs.id}`;
      },
    }),
  ],
  editorProps: {
    attributes: {
      class: 'w-full bg-transparent p-3 pr-14 text-sm leading-relaxed focus:outline-none min-h-[44px] max-h-[180px] overflow-y-auto custom-scrollbar text-foreground break-words outline-none',
    },
    handleKeyDown: (view, event) => {
      if (event.key === 'Enter' && !event.shiftKey) {

        const isMentionOpen = document.getElementById('mention-popup');
        if (isMentionOpen) {
          return false; 
        }
        event.preventDefault();
        handleSend();
        return true;
      }
      return false;
    }
  },
  // ตั้งค่าฟังก์ชันเพื่อตรวจสอบว่า Editor ว่างเปล่าหรือไม่ เพื่อแสดง/ซ่อน Placeholder
  onCreate: ({ editor }) => {
    setIsEditorEmpty(editor.isEmpty);
  },
  onUpdate: ({ editor }) => {
    setIsEditorEmpty(editor.isEmpty);
  },
})

  // 2. ปรับสถานะความสามารถในการแก้ไขของ Editor ตามสถานะของ Modal และ Session
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isInputDisabled);
    }
  }, [isInputDisabled, editor]);

  // ฟังก์ชันแปลงโครงสร้าง Editor กลับเป็นข้อความดิบที่ API รู้จัก โดยจะตรวจจับรูปแบบพิเศษของ Mention แล้วแปลงเป็น xxx
  const getSerializedContent = () => {
    if (!editor) return "";
    const json = editor.getJSON();
    
    const parseNode = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.type === 'mention') {
        return node.attrs.id;
      }
      let text = '';
      if (node.content) {
        node.content.forEach((child: any) => {
          text += parseNode(child);
        });
      }
      if (node.type === 'paragraph') {
        return text + '\n';
      }
      return text;
    };

    return parseNode(json).trim();
  };

  useEffect(() => {
    if (pendingMention && editor) {
      const match = pendingMention.text.match(/\[layer_id:\s*([^\]]+)\]/);
      const extractedId = match ? match[1].trim() : null;

      if (extractedId) {
        const layer = dynamicLayers.find(l => l.id === extractedId || l.layerId === extractedId);
        
        if (layer) {
          editor.commands.insertContent([
            {
              type: 'mention',
              attrs: {
                id: extractedId,
                label: (layer.title || layer.id).replace(/\s+/g, '_')
              }
            },
            {
              type: 'text',
              text: ' '
            }
          ]);
          setIsEditorEmpty(false);
        } else {
          editor.commands.insertContent(pendingMention.text + ' ');
          setIsEditorEmpty(false);
        }
      }

      clearPendingMention();
      setTimeout(() => editor.commands.focus('end'), 10);
    }
  }, [pendingMention, dynamicLayers, clearPendingMention, editor]);

  // --- ระบบจัดการรูปภาพภาพ ---
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

  // ฟังก์ชันจัดการเมื่อคลิกที่ปุ่มส่งข้อความ หรือกด Enter โดยจะตรวจสอบว่ามีข้อความหรือรูปภาพหรือไม่ก่อนส่ง และจะล้างเนื้อหาใน Editor พร้อมรีเซ็ตสถานะหลังส่ง
  const handleSend = () => {
    if (!editor || isLoading || isInputDisabled) return;

    const finalPayload = getSerializedContent(); // แปลงเนื้อหาใน Editor เป็นข้อความดิบที่ API รู้จัก
    if (!finalPayload && images.length === 0) return; // ห้ามส่งถ้าไม่มีข้อความและไม่มีรูปภาพ

    onSendMessage(finalPayload, images);
    
    // ล้างเนื้อหาใน Editor ทิ้งให้พร้อมรันข้อความต่อไป
    editor.commands.clearContent();
    setImages([]);
    setIsEditorEmpty(true);
  };

  // ฟังก์ชันจัดการเมื่อคลิกที่ปุ่มคำแนะนำ (Suggestion) โดยจะตรวจสอบประเภทของคำแนะนำและดำเนินการตามนั้น เช่น ถ้าเป็นคำสั่งเคลียร์เลเยอร์ก็จะตั้งค่าเนื้อหาใน Editor เป็นข้อความที่มีเครื่องหมาย @ พร้อมกับชื่อเลเยอร์เพื่อให้ระบบ Mention แปลงเป็นป้าย Chip ทันที
  const handleSuggestionClick = (suggestion: SuggestionItem) => {
    if (isLoading || isInputDisabled || !editor) return;

    const isGuidedClear = suggestion.key === "clear_layer";

    if (isGuidedClear) {
      const textToSet = `${suggestion.promptTemplate || "Clear map layer "}@`;
      editor.commands.setContent(textToSet);
      setIsEditorEmpty(false); 
      setTimeout(() => {
        editor.commands.focus('end');
      }, 10);
      return; 
    }

    let finalPrompt = suggestion.promptTemplate || "";
  if (suggestion.value) {
    finalPrompt = finalPrompt.replace(/\{value\}/g, suggestion.value);
  }
  
  onSendMessage(finalPrompt, []); 
  setImages([]);
};

  return (
    <div className="p-6 bg-gradient-to-t from-background to-transparent bg-background">
      <div className="max-w-4xl mx-auto relative">

        <ApiKeyPopover />

        {/* Suggestion Buttons */}
        {suggestions && suggestions.length > 0 && (
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
                  <img src={src} className="w-full h-full object-cover rounded-xl border border-border shadow-md transition-all group-hover:brightness-75" alt="preview" />
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); removeImage(idx); }}
                    disabled={isInputDisabled} 
                    className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 shadow-xl z-20 transition-all scale-100 group-hover:scale-110 active:scale-90 disabled:opacity-50"
                    title="Remove image"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity" />
                </div>
              ))}
            </div>
          )}

          {/* Editor Container */}
          <div className="relative w-full" onPaste={handlePaste}>
            {isEditorEmpty && (
              <div className="absolute top-3 left-3 text-sm text-muted-foreground pointer-events-none select-none z-10">
                {isKeyModalOpen ? "Please provide API Key above..." :
                 isGuestExpired ? "Session expired. Please refresh..." : 
                 activeHostName ? `Ask about GIS, maps, or layers on [${activeHostName.toUpperCase()}]...` :
                 "Ask about GIS, maps, or layers..."}
              </div>
            )}
            
            <EditorContent editor={editor} />
          </div>
          
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex gap-1">
              <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileChange} disabled={isInputDisabled} />
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
              disabled={isLoading || isInputDisabled || (isEditorEmpty && images.length === 0)} 
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