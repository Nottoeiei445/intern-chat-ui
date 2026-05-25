"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Search, Filter, LayoutGrid, List, Eye, Pencil, Trash, MoreVertical } from "lucide-react";
import { ApiKey } from "../types";
import { ApiKeyCard } from "./ApiKeyCard";
import { CreateApiKeyModal } from "./CreateApiKeyModal";
import { EditApiKeyModal } from "./EditApiKeyModal"; 
import { useApiKeys } from "../hooks/useApiKeys";
import { ViewApiKeyModal } from './ViewApiKeyModal';
import { AuthWidget } from "./AuthWidget";
import { DeleteApiKeyModal } from "./DeleteApiKeyModal";
import { useToast } from "@/components/ui/Toast"; 

export const ApiKeyManager = () => {
  const { keys, hosts, isLoading, addKey, updateKey, deleteKey } = useApiKeys();
  const { success, error } = useToast();

  const [viewingKeyId, setViewingKeyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const filteredKeys = (Array.isArray(keys) ? keys : []).filter(k => {
    const matchesSearch = k?.keyName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHost = !selectedHostId || k.hostId === selectedHostId;
    return matchesSearch && matchesHost;
  });

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
      setIsFilterOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);



  return (
    <div className="flex flex-col gap-2 text-foreground min-h-screen">
      <AuthWidget />

      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-4">
            API Keys <span className="text-muted-foreground text-lg font-medium">({Array.isArray(keys) ? keys.length : 0})</span>
          </h1>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 text-sm font-medium">
          <Plus size={16} />
          New API Key
        </button>
      </div>

      {/* --- Toolbar Section --- */}
<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4">
  
  <div className="flex items-center gap-2 w-full sm:w-auto relative" ref={filterDropdownRef}>
    <button 
      type="button"
      onClick={() => setIsFilterOpen(!isFilterOpen)}
      className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm font-medium"
    >
      <span>
        Host: {selectedHostId ? hosts.find(h => h.id === selectedHostId)?.hostname || selectedHostId : "All"}
      </span>
      <Filter size={12} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
    </button>

    {/* Dropdown กรองรายชื่อ Host */}
    {isFilterOpen && (
      <div className="absolute top-[calc(100%+4px)] left-0 w-48 bg-popover border border-border rounded-xl p-1 shadow-lg z-50 flex flex-col text-xs animate-in fade-in slide-in-from-top-1 duration-100">
        <button
          type="button"
          onClick={() => { setSelectedHostId(null); setIsFilterOpen(false); }}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!selectedHostId ? 'bg-accent text-foreground font-semibold' : 'hover:bg-muted/50 text-muted-foreground'}`}
        >
          All Hosts (ทั้งหมด)
        </button>
        <div className="h-px bg-border/50 my-1" />
        {hosts.map((host) => (
          <button
            key={host.id}
            type="button"
            onClick={() => { setSelectedHostId(host.id); setIsFilterOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedHostId === host.id ? 'bg-accent text-foreground font-semibold' : 'hover:bg-muted/50 text-foreground'}`}
          >
            {host.provider.toUpperCase()} - {host.hostname}
          </button>
        ))}
      </div>
    )}
  </div>

  {/* ฝั่งขวา: Search Bar กับปุ่มสลับ Grid/List */}
  <div className="flex items-center gap-4 w-full sm:w-auto">
    <div className="relative flex-1 sm:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
      <input 
        type="text"
        placeholder="Search keys..."
        className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg py-1.5 pl-9 pr-4 text-xs outline-none transition-all text-foreground shadow-sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
    <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border shadow-sm">
      <button 
        onClick={() => setViewMode("grid")}
        className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        <LayoutGrid size={14} />
      </button>
      <button 
        onClick={() => setViewMode("list")}
        className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        <List size={14} />
      </button>
    </div>
  </div>
</div>

      {/* --- Content Section --- */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl border border-border"></div>)}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKeys.map(key => (
            <ApiKeyCard 
              key={key.id} 
              apiKey={key} 
              onDelete={() => setKeyToDelete(key)} 
              onEdit={(keyToEdit) => setEditingKey(keyToEdit)} 
              onView={(keyId) => setViewingKeyId(keyId)}
              hosts={hosts}
            />
          ))}
        </div>
      ) : (
        /* ------------------- LIST VIEW ------------------- */
        <div className="w-full overflow-visible pb-20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-foreground bg-transparent">
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Name</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Host</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date created</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredKeys.map((key: any) => {
                const isActive = key.status !== 'Inactive' && key.isActive !== false;
                
                const matchedHost = hosts.find(h => h.id === key.hostId);
                const listDisplayHost = matchedHost ? matchedHost.hostname : "All Hosts";

                return (
                  <tr key={key.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="font-semibold text-sm text-foreground">
                        {key.keyName}
                      </div>
                    </td>
                    
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-secondary/60 text-secondary-foreground rounded-full">
                        {listDisplayHost}
                      </span>
                    </td>

                    <td className="px-6 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${isActive ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
                        {key.status || (isActive ? 'Active' : 'Inactive')}
                      </div>
                    </td>

                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {key.createdAt || key.created_at ? new Date(key.createdAt || key.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>

                    <td className="px-6 py-3 text-right relative">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          type="button"
                          onClick={() => setViewingKeyId(key.id)}
                          className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-all"
                        >
                          <Eye size={14} />
                        </button>

                        <button 
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === key.id ? null : key.id)}
                          className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-all"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>

                      {openDropdownId === key.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                          <div className="absolute right-6 top-10 z-50 w-32 bg-popover border border-border/80 rounded-xl shadow-lg py-1 text-xs flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                            <button 
                              type="button"
                              onClick={() => { setEditingKey(key); setOpenDropdownId(null); }} 
                              className="flex items-center gap-2 px-3 py-1.5 text-foreground hover:bg-accent transition-colors text-left"
                            >
                              <Pencil size={12} className="text-muted-foreground" /> Edit
                            </button>
                            <div className="h-px bg-border/50 my-1" />
                            <button 
                              type="button"
                              onClick={() => { setKeyToDelete(key); setOpenDropdownId(null); }} 
                              className="flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-left font-medium"
                            >
                              <Trash size={12} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Modals --- */}
      <CreateApiKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        hosts={hosts} 
        onSuccess={async (data) => {
          try {
            await addKey(data);
            success("API Key created successfully", "Success");
          } catch (err) {
            error("Failed to create API key", "Error");
          }
        }} 
      />

      <EditApiKeyModal
        isOpen={!!editingKey}
        apiKey={editingKey}
        onClose={() => setEditingKey(null)}
        onSuccess={async (id, data) => {
          try {
            await updateKey(id, data);
            success("API Key updated successfully", "Success");
          } catch (err) {
            error("Failed to update API key", "Error");
          }
        }} 
      />

      <ViewApiKeyModal
        isOpen={!!viewingKeyId}
        onClose={() => setViewingKeyId(null)}
        apiKeyId={viewingKeyId}
      />

      <DeleteApiKeyModal
        isOpen={!!keyToDelete}
        keyName={keyToDelete?.keyName || ""}
        onClose={() => setKeyToDelete(null)}
        onConfirm={async () => {
          if (keyToDelete) {
            try {
              await deleteKey(keyToDelete.id);
              success(`API Key "${keyToDelete.keyName}" deleted.`, "Deleted");
            } catch (err) {
              error("Failed to delete API key", "Error");
            }
          }
        }}
      />

    </div>
  );
};