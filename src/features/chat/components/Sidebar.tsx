"use client"

import { Menu, MessageSquarePlus, Settings, MessageSquare, Trash2 } from "lucide-react";
import { ChatThread } from "../types";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chats: ChatThread[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const Sidebar = ({ 
  isOpen, 
  onToggle, 
  chats, 
  activeId, 
  onSelect, 
  onNew, 
  onDelete 
}: SidebarProps) => {
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
          onClick={onNew}
          className={`
            flex items-center gap-3 bg-[#2b2c2e] hover:bg-[#37393b] text-slate-200 
            h-10 rounded-full transition-all duration-300
            ${isOpen ? "px-4 w-fit" : "w-10 justify-center px-0 mx-auto"}
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
            onClick={() => onSelect(chat.id)}
            className={`
              flex items-center justify-between gap-3 p-3 rounded-full cursor-pointer group transition-colors
              ${activeId === chat.id ? "bg-blue-600/20 text-blue-400" : "hover:bg-white/5 text-slate-300"}
            `}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare size={18} className={`shrink-0 ${activeId === chat.id ? "text-blue-400" : "text-slate-500"}`} />
              <span className="font-ibm text-sm truncate">{chat.title || "บทสนทนาใหม่"}</span>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(chat.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
            >
              <Trash2 size={14} />
            </button>
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