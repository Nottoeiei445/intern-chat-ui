"use client"

import { useState } from "react"
import { Sparkles, User, Bot, Copy, Pencil, Lock } from "lucide-react"
import { Message } from "../types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "../../auth/context/AuthContext" 
 
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MessageItemProps {
  msg: Message;
  isLatestUser: boolean;
  isLoading: boolean;
  isFetchingHistory: boolean;
  scrollToBottom: () => void;
  onEditMessage?: (id: string, newContent: string) => void;
  onSendChoice?: (key: string, choiceValue: string) => void;
  canEdit?: boolean;
  isLatestMessage?: boolean;
}

export const MessageItem = ({ 
  msg, 
  isLatestUser, 
  isLoading, 
  isFetchingHistory, 
  scrollToBottom, 
  onEditMessage,
  onSendChoice,
  canEdit,
  isLatestMessage
}: MessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
 
  const { user } = useAuth();
  const isGuest = !user; 

  const handleEditClick = () => {
    if (isGuest) return; // ดักไว้เผื่อเหนียว
    setEditValue(msg.content);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleSubmit = () => {
    if (msg.id && onEditMessage) {
      onEditMessage(msg.id, editValue);
      setIsEditing(false);
    }
  };

  return (
    <div className={`group flex items-start w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      
      {msg.role === "user" && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center pr-2 pt-5 gap-1 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent" 
            onClick={() => navigator.clipboard.writeText(msg.content)}
          >
            <Copy size={14} />
          </Button>
          
          {canEdit && msg.id && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={isGuest ? "cursor-not-allowed inline-block" : ""}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={isGuest}
                      className={`h-8 w-8 transition-colors ${
                        isGuest 
                          ? "text-muted-foreground/50 opacity-100"
                          : "text-muted-foreground hover:text-primary hover:bg-accent"
                      }`} 
                      onClick={handleEditClick}
                    >
                      <Pencil size={14} />
                    </Button>
                  </span>
                </TooltipTrigger>
                {isGuest && (
                  <TooltipContent side="top" className="bg-popover text-popover-foreground border-border font-ibm text-xs">
                    <div className="flex items-center gap-2">
                      <Lock size={12} className="text-primary" />
                      <p>Sign in to edit message</p>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      <div className="max-w-[85%] space-y-3">
        {msg.thinking && (
          <div className="bg-muted/50 border border-border rounded-2xl p-4 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2 mb-2 text-primary/70 uppercase tracking-tighter font-bold">
              <Sparkles size={12} /> Chain of Thought
            </div>
            {msg.thinking}
          </div>
        )}
        
        <div className={`flex flex-col gap-4 p-5 rounded-3xl ${
          msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none shadow-xl" : "bg-muted border border-border text-foreground rounded-tl-none"
        }`}>
          <div className="flex gap-4">
            <div className="opacitye-60 mt-1">
              {msg.role === "user" ? <User size={20}/> : <Bot size={20}/>}
            </div>
            <div className="flex-1 space-y-4 min-w-0">
              
              {isEditing ? (
                <div className="flex flex-col gap-3 w-full min-w-0">
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-transparent focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 p-3 rounded-xl shadow-inner"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-primary-foreground hover:bg-black/10 dark:hover:bg-white/10" 
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    
                    {/* Layer 2: ปุ่ม Submit */}
                    <Button
                      size="sm"
                      disabled={editValue === msg.content || !editValue.trim() || isLoading}
                      onClick={handleSubmit}
                      className="text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-sm"
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              ) : (
                msg.content && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                )
              )}

              {msg.images && msg.images.length > 0 && !isEditing && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.images.map((imgSrc, imgIdx) => (
                    <div key={imgIdx} className="relative max-w-[200px] max-h-[200px] overflow-hidden rounded-xl border border-border shadow-lg">
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

              {msg.imageUrl && !isEditing && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="relative max-w-[200px] max-h-[200px] overflow-hidden rounded-xl border border-border shadow-lg">
                    <img 
                      src={msg.imageUrl} 
                      alt="history-attachment"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onLoad={() => { if (!isFetchingHistory) scrollToBottom() }}
                    />
                  </div>
                </div>
              )}

              {msg.role === "assistant" && msg.choices && msg.choices.length > 0 && !isEditing && (
                <div className="mt-5 pt-4 border-t border-border flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                  
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <Sparkles size={13} className="text-primary" />
                    Please select an option
                  </span>
                  
                  <div className="flex flex-col gap-2 w-full">
                    {msg.choices.map((choice, idx) => {
                      const isSelected = selectedChoice === choice.value;
                      const hasSelection = selectedChoice !== null;
                      const isChoiceClickable = isLatestMessage && !isLoading && !hasSelection;

                      return (
                        <button
                          key={idx}
                          disabled={!isChoiceClickable} // ป้องกันการกดซ้ำ
                          onClick={() => {
                            setSelectedChoice(choice.value); // บันทึกว่าเลือกปุ่มนี้
                            onSendChoice?.(msg.choiceKey || "", choice.value); // ส่งค่าไปให้ AI
                          }}
                          className={`group relative flex items-center justify-between w-full px-4 py-3 bg-background border rounded-xl transition-all duration-300 text-left overflow-hidden shadow-sm ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary/50" //สีตอนถูกเลือก (เด่นสุด ขอบสี Primary)
                              : !isChoiceClickable 
                                ? "border-transparent opacity-50 cursor-not-allowed bg-muted/50 grayscale" //สีตอนโดนบล็อก (ปุ่มที่ไม่ได้ถูกเลือก)
                                : "border-border hover:bg-accent hover:border-primary/50 active:scale-[0.98] hover:shadow-md" // สีปกติ
                          }`}
                        >
                          {/* Text Content */}
                          <span className={`text-sm font-medium z-10 transition-colors ${
                            isSelected 
                              ? 'text-primary font-bold' // ข้อความสี Primary
                              : !isChoiceClickable 
                                ? 'text-muted-foreground' 
                                : 'text-foreground group-hover:text-primary'
                          }`}>
                            {choice.label}
                          </span>
                          
                          <div className={`transition-all duration-300 z-10 ${
                            isSelected 
                              ? 'opacity-100 text-primary' 
                              : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-primary'
                          }`}>
                            {isSelected ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isChoiceClickable ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {msg.role === "assistant" && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center pl-2 pt-5 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent" 
            onClick={() => navigator.clipboard.writeText(msg.content)}
          >
            <Copy size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}