"use client"

import { useState } from "react";
import { Menu, MessageSquarePlus, Settings, MessageSquare, Trash2, Pencil, Check, X } from "lucide-react";
import { ChatThread } from "../types";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/context/AuthContext";

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
  const router = useRouter();
  const { user } = useAuth();

  const handleStartEdit = (e: React.MouseEvent, chat: ChatThread) => {
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
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
    if (!user) {
      router.push("/login");
      return;
    }
    onNew();
  };

  const handleSelect = (chatId: string | null) => {
    if (!user) {
      router.push("/login");
      return;
    }
    onSelect(chatId);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
    onDelete(id);
  };

  return (
    <aside 
      className={`
        ${isOpen ? "w-64" : "w-[68px]"} 
        flex flex-col bg-[#1e1f20] transition-all duration-300 ease-in-out z-50 h-full overflow-hidden shrink-0
      `}
    >
      <div className="h-16 flex items-center px-[18px] shrink-0">
        <button 
          onClick={onToggle}
          className="p-2 hover:bg-white/10 rounded-full text-slate-300 transition-colors"
        >
          <Menu size={22} />
        </button>
      </div>

      <div className="px-3 mb-6 mt-2 shrink-0">
        <button 
          onClick={handleNewClick}
          className={`
            flex items-center gap-3 bg-[#2b2c2e] hover:bg-[#37393b] text-slate-200 
            h-10 rounded-full transition-all duration-300
            ${isOpen ? "px-4 w-fit" : "w-10 justify-center px-0 mx-auto"}
            ${!user ? "opacity-60" : ""}
          `}
        >
          <MessageSquarePlus size={20} className="shrink-0" />
          {isOpen && (
            <span className="font-ibm text-sm whitespace-nowrap animate-in fade-in duration-500">
              แชทใหม่
            </span>
          )}
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto px-3 space-y-1 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <p className="px-4 py-2 text-xs font-bold text-slate-500 font-ibm uppercase tracking-wider">แชทล่าสุด</p>
        
        {chats.map((chat) => (
          <div 
            key={chat.id}
            onClick={() => !editingId && handleSelect(chat.id)}
            className={`
              flex items-center justify-between gap-3 p-3 rounded-full cursor-pointer group transition-colors
              ${activeId === chat.id ? "bg-blue-600/20 text-blue-400" : "hover:bg-white/5 text-slate-300"}
            `}
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <MessageSquare size={18} className={`shrink-0 ${activeId === chat.id ? "text-blue-400" : "text-slate-500"}`} />
              
              {editingId === chat.id ? (
                <input
                  autoFocus
                  className="bg-[#050505] border border-blue-500/50 rounded px-2 py-0.5 text-sm w-full outline-none font-ibm"
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
                  <button onClick={(e) => handleSave(e, chat.id)} className="p-1 hover:text-green-400">
                    <Check size={14} />
                  </button>
                  <button onClick={handleCancel} className="p-1 hover:text-red-400">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={(e) => handleStartEdit(e, chat)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-400 transition-all"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 shrink-0">
        <div className={`flex items-center gap-3 p-3 rounded-full hover:bg-white/5 text-slate-400 cursor-pointer ${!isOpen && "justify-center"}`}>
          <Settings size={18} />
          {isOpen && <span className="font-ibm text-sm">การตั้งค่า</span>}
        </div>
      </div>
    </aside>
  );
};