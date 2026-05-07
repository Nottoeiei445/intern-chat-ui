"use client"

import { useState } from "react";
import { Menu, MessageSquarePlus, Settings, MessageSquare, Trash2, Pencil, Check, X, Lock, Sparkles } from "lucide-react";
import { ChatThread } from "../types";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/context/AuthContext";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chats: ChatThread[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export const Sidebar = ({ 
  isOpen, 
  onToggle, 
  chats, 
  activeId, 
  onSelect, 
  onNew, 
  onDelete,
  onRename
}: SidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [showGuestModal, setShowGuestModal] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();
  const isGuest = !user; // ตัวแปรเช็คความหล่อ

  const handleStartEdit = (e: React.MouseEvent, chat: ChatThread) => {
    e.stopPropagation();
    if (isGuest) return; // ถ้าเป็น Guest ไม่ต้องทำอะไร (โดน Tooltip ดักไว้แล้ว)
    setEditingId(chat.id);
    setTempTitle(chat.title || "");
  };

  const handleSave = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (tempTitle.trim()) {
      onRename(id, tempTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleNewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      setShowGuestModal(true); 
      return;
    }
    onNew();
  };

  const handleSelect = (chatId: string | null) => {
  if (isGuest) {
    if (chatId === activeId) return; 
    
    setShowGuestModal(true);
    return;
  }
  onSelect(chatId);
};

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isGuest) return; // ดักไว้เผื่อทะลุ Tooltip
    onDelete(id);
  };

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------
  return (
    <TooltipProvider delayDuration={200}>
      <aside 
        className={`
          ${isOpen ? "w-64" : "w-[68px]"} 
          flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out z-50 h-full overflow-hidden shrink-0
        `}
      >
        <div className="h-16 flex items-center px-[18px] shrink-0">
          <button 
            onClick={onToggle}
            className="p-2 hover:bg-accent rounded-full text-sidebar-foreground transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>

        <div className="px-3 mb-6 mt-2 shrink-0">
          <button 
            onClick={handleNewClick}
            className={`
              flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground 
              h-10 rounded-full transition-all duration-300
              ${isOpen ? "px-4 w-fit" : "w-10 justify-center px-0 mx-auto"}
              ${isGuest ? "opacity-80" : ""} 
            `}
          >
            <MessageSquarePlus size={20} className="shrink-0" />
            {isOpen && (
              <span className="font-ibm text-sm whitespace-nowrap animate-in fade-in duration-500">
                New Chat
              </span>
            )}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto px-3 space-y-1 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <p className="px-4 py-2 text-xs font-bold text-muted-foreground font-ibm uppercase tracking-wider">Last Chat</p>
          
          {chats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => !editingId && handleSelect(chat.id)}
              className={`
                flex items-center justify-between gap-3 p-3 rounded-full cursor-pointer group transition-colors
                ${activeId === chat.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-sidebar-foreground"}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <MessageSquare size={18} className={`shrink-0 ${activeId === chat.id ? "text-primary" : "text-muted-foreground"}`} />
                
                {editingId === chat.id ? (
                  <input
                    autoFocus
                    className="bg-background border border-border rounded px-2 py-0.5 text-sm w-full outline-none font-ibm text-foreground"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave(e, chat.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="font-ibm text-sm truncate">{chat.title || "บทสนทนาใหม่"}</span>
                )}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {editingId === chat.id ? (
                  <>
                    <button onClick={(e) => handleSave(e, chat.id)} className="p-1 text-muted-foreground hover:text-green-500">
                      <Check size={14} />
                    </button>
                    <button onClick={handleCancel} className="p-1 text-muted-foreground hover:text-destructive">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={isGuest ? "cursor-not-allowed inline-block" : ""}>
                          <button 
                            onClick={(e) => handleStartEdit(e, chat)}
                            className={`p-1 transition-all ${
                              isGuest 
                                ? "opacity-40 pointer-events-none text-muted-foreground" 
                                : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                            }`}
                          >
                            <Pencil size={14} />
                          </button>
                        </span>
                      </TooltipTrigger>
                      {isGuest && (
                        <TooltipContent side="top" className="bg-popover text-popover-foreground border-border font-ibm text-xs">
                          <div className="flex items-center gap-2">
                            <Lock size={12} className="text-primary" />
                            <p>Sign in to rename</p>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={isGuest ? "cursor-not-allowed inline-block" : ""}>
                          <button 
                            onClick={(e) => handleDelete(e, chat.id)}
                            className={`p-1 transition-all ${
                              isGuest 
                                ? "opacity-40 pointer-events-none text-muted-foreground" 
                                : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            }`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </TooltipTrigger>
                      {isGuest && (
                        <TooltipContent side="top" className="bg-popover text-popover-foreground border-border font-ibm text-xs">
                          <div className="flex items-center gap-2">
                            <Lock size={12} className="text-destructive" />
                            <p>Sign in to delete</p>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className={`flex items-center gap-3 p-3 rounded-full hover:bg-accent text-sidebar-foreground cursor-pointer transition-colors ${!isOpen && "justify-center"}`}>
            <Settings size={18} />
            {isOpen && <span className="font-ibm text-sm">Settings</span>}
          </div>
        </div>

        <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
          <DialogContent className="sm:max-w-md bg-background border-border text-foreground shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-ibm">
                <Sparkles className="text-primary" size={20} />
                Unlock Full Features
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2 font-ibm text-sm">
                Guest sessions are limited to a single active conversation. Log in or create an account to save your chat history, start new topics, and customize your experience!
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="sm:justify-end gap-2 mt-4">
              <button 
                type="button" 
                onClick={() => setShowGuestModal(false)}
                className="px-4 py-2 rounded-xl hover:bg-accent text-foreground font-ibm text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => router.push("/login")}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-ibm text-sm transition-colors shadow-lg"
              >
                Sign in to continue
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </aside>
    </TooltipProvider>
  );
};