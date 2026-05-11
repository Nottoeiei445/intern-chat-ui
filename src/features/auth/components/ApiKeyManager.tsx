"use client";

import { useState } from "react";
import { Plus, Search, Filter, LayoutGrid, List } from "lucide-react";
import { ApiKey } from "../types";
import { ApiKeyCard } from "./ApiKeyCard";
import { CreateApiKeyModal } from "./CreateApiKeyModal";
import { EditApiKeyModal } from "./EditApiKeyModal"; 
import { useApiKeys } from "../hooks/useApiKeys";
import { ViewApiKeyModal } from './ViewApiKeyModal';

export const ApiKeyManager = () => {
  const { keys, isLoading, addKey, updateKey, deleteKey } = useApiKeys();
  const [viewingKeyId, setViewingKeyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);

  //เพิ่มการเช็ค Array.isArray ป้องกันหน้าจอขาวเวลาโหลดข้อมูลไม่ทัน
  const filteredKeys = (Array.isArray(keys) ? keys : []).filter(k => 
    k?.keyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 text-slate-200">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            API Keys <span className="text-slate-500 text-lg">({Array.isArray(keys) ? keys.length : 0})</span>
          </h1>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#10a37f] hover:bg-[#1a7f64] text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-green-900/10 active:scale-95">
          <Plus size={18} />
          New API Key
        </button>
      </div>

      {/* --- Toolbar Section (Filters & Search) --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-[#202123] border border-white/10 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
            Application <Filter size={14} />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-[#202123] border border-white/10 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
            Date created <Filter size={14} />
          </button>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="Search keys..."
              className="w-full bg-transparent border border-white/5 focus:border-white/20 rounded-lg py-1.5 pl-10 pr-4 text-sm outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center p-1 bg-[#202123] rounded-lg border border-white/5">
            <button className="p-1.5 text-slate-400 hover:text-white"><LayoutGrid size={16} /></button>
            <button className="p-1.5 text-slate-600 cursor-not-allowed"><List size={16} /></button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-[#181818] rounded-2xl border border-white/5"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKeys.map(key => (
            <ApiKeyCard 
              key={key.id} 
              apiKey={key} 
              onDelete={deleteKey}
              onEdit={(keyToEdit) => setEditingKey(keyToEdit)} 
              onView={(keyId) => {
                setViewingKeyId(keyId);
              }}
            />
          ))}
          
          {filteredKeys.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-500">
              No API keys found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* --- Modals --- */}
      <CreateApiKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={addKey} 
      />

      <EditApiKeyModal
        isOpen={!!editingKey}
        apiKey={editingKey}
        onClose={() => setEditingKey(null)}
        onSuccess={updateKey} 
      />

      {/*เสียบ View Modal เข้าไปตรงนี้ครับ! */}
      <ViewApiKeyModal
        isOpen={!!viewingKeyId}
        onClose={() => setViewingKeyId(null)}
        apiKeyId={viewingKeyId}
      />
    </div>
  );
};