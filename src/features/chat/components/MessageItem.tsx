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
  onSendChoice?: (choiceValue: string) => void;
}

export const MessageItem = ({ 
  msg, 
  isLatestUser, 
  isLoading, 
  isFetchingHistory, 
  scrollToBottom, 
  onEditMessage,
  onSendChoice
}: MessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
 
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
          
          {isLatestUser && msg.id && (
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
            <div className="opacity-60 mt-1">
              {msg.role === "user" ? <User size={20}/> : <Bot size={20}/>}
            </div>
            <div className="flex-1 space-y-4 min-w-0">
              
              {isEditing ? (
                <div className="flex flex-col gap-3 w-full min-w-0">
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-background border-border text-foreground resize-none focus-visible:ring-primary"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs hover:bg-accent hover:text-foreground" 
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={editValue === msg.content || !editValue.trim() || isLoading}
                      onClick={handleSubmit}
                      className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
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


              {msg.role === "assistant" && msg.choices && msg.choices.length > 0 && !isEditing && (
                <div className="mt-5 pt-4 border-t border-border flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                  
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <Sparkles size={13} className="text-primary" />
                    Please select an option
                  </span>
                  
                  <div className="flex flex-col gap-2 w-full">
                    {msg.choices.map((choice, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSendChoice?.(choice.value)}
                        className="group relative flex items-center justify-between w-full px-4 py-3 bg-background border border-border rounded-xl hover:bg-accent hover:border-primary/50 transition-all duration-300 active:scale-[0.98] text-left overflow-hidden shadow-sm hover:shadow-md"
                      >
                        {/* Text Content */}
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors z-10">
                          {choice.label}
                        </span>
                        
                        {/* Arrow Icon */}
                        <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10 text-primary">
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
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