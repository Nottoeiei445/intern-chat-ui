"use client"

import { useState } from "react"
import { Sparkles, User, Bot, Copy, Pencil } from "lucide-react"
import { Message } from "../types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface MessageItemProps {
  msg: Message;
  isLatestUser: boolean;
  isLoading: boolean;
  isFetchingHistory: boolean;
  scrollToBottom: () => void;
  onEditMessage?: (id: string, newContent: string) => void;
}

export const MessageItem = ({ 
  msg, 
  isLatestUser, 
  isLoading, 
  isFetchingHistory, 
  scrollToBottom, 
  onEditMessage 
}: MessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const handleEditClick = () => {
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
            className="h-8 w-8 text-slate-500 hover:text-white hover:bg-white/10" 
            onClick={() => navigator.clipboard.writeText(msg.content)}
          >
            <Copy size={14} />
          </Button>
          {isLatestUser && msg.id && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-500 hover:text-blue-400 hover:bg-white/10" 
              onClick={handleEditClick}
            >
              <Pencil size={14} />
            </Button>
          )}
        </div>
      )}

      <div className="max-w-[85%] space-y-3">
        {msg.thinking && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-2 mb-2 text-blue-500/50 uppercase tracking-tighter font-bold">
              <Sparkles size={12} /> Chain of Thought
            </div>
            {msg.thinking}
          </div>
        )}
        
        <div className={`flex flex-col gap-4 p-5 rounded-3xl ${
          msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none shadow-xl" : "bg-[#111] border border-white/5 rounded-tl-none"
        }`}>
          <div className="flex gap-4">
            <div className="opacity-40 text-slate-200 mt-1">
              {msg.role === "user" ? <User size={20}/> : <Bot size={20}/>}
            </div>
            <div className="flex-1 space-y-4 min-w-0">
              
              {isEditing ? (
                <div className="flex flex-col gap-3 min-w-[250px] sm:min-w-[400px]">
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-black/20 border-white/20 text-white resize-none focus-visible:ring-blue-500"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs hover:bg-white/10" 
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={editValue === msg.content || !editValue.trim() || isLoading}
                      onClick={handleSubmit}
                      className="text-xs bg-white text-blue-600 hover:bg-slate-200"
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              ) : (
                msg.content && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-200">
                    {msg.content}
                  </p>
                )
              )}

              {msg.images && msg.images.length > 0 && !isEditing && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.images.map((imgSrc, imgIdx) => (
                    <div key={imgIdx} className="relative max-w-[200px] max-h-[200px] overflow-hidden rounded-xl border border-white/10 shadow-lg">
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
            </div>
          </div>
        </div>
      </div>

      {msg.role === "assistant" && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center pl-2 pt-5 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-500 hover:text-white hover:bg-white/10" 
            onClick={() => navigator.clipboard.writeText(msg.content)}
          >
            <Copy size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}