import { Plus, MessageSquare, Trash2, User, Settings } from "lucide-react";
import { ChatThread } from "../types";

interface Props {
  chats: ChatThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNew: () => void;
}

export const Sidebar = ({ chats, activeId, onSelect, onDelete, onNew }: Props) => {
  return (
    <aside className="w-72 bg-[#0d0d0d] border-r border-white/5 flex flex-col">
       <div className="p-4">
          <button onClick={onNew} className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-semibold text-sm">
            <Plus size={18} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {chats.map(chat => (
            <div key={chat.id} onClick={() => onSelect(chat.id)} className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${activeId === chat.id ? "bg-blue-600/10 border-blue-500/50 text-blue-400" : "border-transparent hover:bg-white/5 text-slate-400"}`}>
              <MessageSquare size={16} />
              <span className="flex-1 text-sm truncate font-medium">{chat.title}</span>
              <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" onClick={(e) => onDelete(chat.id, e)} />
            </div>
          ))}
        </div>
        {/* User Info... */}
    </aside>
  );
};