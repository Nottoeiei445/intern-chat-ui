"use client";

import { useState, useEffect, useRef } from "react";
import { useMapStore } from "@/store/useMapStore"; 
import { KeyRound, ShieldAlert, ArrowRight, X, ChevronDown, ChevronUp, Loader2, Lock } from "lucide-react"; 
import { useApiKeys } from "@/features/auth/hooks/useApiKeys"; 
import { apiKeyService } from "@/features/auth/services/apiKey.service"; 
import { useAuth } from "@/features/auth";

export const ApiKeyPopover = () => {
  const { user } = useAuth();
  const { setApiKey, isKeyModalOpen, closeKeyModal } = useMapStore();
  
  const [selectedKeyId, setSelectedKeyId] = useState(""); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFetchingKey, setIsFetchingKey] = useState(false); 
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🌟 1. ดึง hosts ออกมาใช้งานคู่กับ keys
  const { keys, hosts } = useApiKeys();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isKeyModalOpen) return null;

  const formatMaskedKey = (key: string) => {
    if (!key) return "";
    if (key.length <= 16) return key; 
    return `${key.slice(0, 4)}******************************${key.slice(-4)}`;
  };

  const handleSave = async () => {
    if (!user || selectedKeyId.trim() === "") return; 
    
    setIsFetchingKey(true);
    try {
      const response = await apiKeyService.getKeyById(selectedKeyId);
      const fullKey = response?.data?.apiKey || (response as any)?.apiKey;

      if (fullKey) {
        setApiKey("gistda", fullKey); 
        closeKeyModal();
        setSelectedKeyId("");
        setIsDropdownOpen(false);
      } else {
        console.error("Failed to retrieve the full API key.");
      }
    } catch (error) {
      console.error("Error fetching full API key:", error);
    } finally {
      setIsFetchingKey(false);
    }
  };

  const selectedKeyObj = Array.isArray(keys) ? keys.find(k => k.id === selectedKeyId) : null;
  const isSubmitDisabled = !user || !selectedKeyId;

  return (
    <div className="absolute bottom-[calc(100%+12px)] left-0 w-full z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      
      <div className="relative">
        <button 
          onClick={(e) => {
            e.preventDefault();
            closeKeyModal();
          }}
          className="absolute -top-3 -right-2 bg-muted border border-border hover:bg-destructive hover:border-destructive text-muted-foreground hover:text-destructive-foreground rounded-full p-1.5 shadow-xl z-50 transition-all scale-100 hover:scale-110 active:scale-90"
          title="Close"
          disabled={isFetchingKey}
        >
          <X size={14} strokeWidth={3} />
        </button>

        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-4 flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <KeyRound size={16} />
              </div>
              <span className="text-sm font-bold text-card-foreground">
                Authentication Required
              </span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 hidden sm:flex font-medium">
              <ShieldAlert size={12} /> Map layers need API token
            </span>
          </div>

          <div className="flex gap-2">
            
            <div className="relative flex-1" ref={dropdownRef}>
              
              {user ? (
                <>
                  {isDropdownOpen && !isFetchingKey && (
                    <div className="absolute bottom-[calc(100%+8px)] left-0 w-full bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                        {Array.isArray(keys) && keys.length === 0 ? (
                           <div className="p-3 text-center text-xs text-muted-foreground">No API Keys found</div>
                        ) : (
                          Array.isArray(keys) && keys.map((item) => {
                            const matchedHost = hosts.find(h => h.id === item.hostId);
                            const displayHostName = matchedHost ? matchedHost.hostname : "All Hosts";

                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setSelectedKeyId(item.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg flex flex-col gap-1 transition-colors ${
                                  selectedKeyId === item.id ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm">{item.keyName}</span>
                                  <span className="text-[9px] opacity-70 border border-border px-1.5 rounded-md uppercase tracking-wider bg-background">
                                    {displayHostName}
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono truncate">
                                  {formatMaskedKey(item.maskedKey)}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={isFetchingKey} 
                    className="w-full h-14 px-4 bg-background border border-input rounded-xl flex items-center justify-between focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden shadow-inner"
                  >
                    {selectedKeyObj ? (
                      <div className="flex flex-col items-start justify-center overflow-hidden w-[calc(100%-24px)] h-full">
                        <span className="text-foreground font-semibold text-sm truncate w-full text-left">
                          {selectedKeyObj.keyName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate w-full text-left opacity-80 mt-0.5">
                          {formatMaskedKey(selectedKeyObj.maskedKey)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Select an API Key...</span>
                    )}
                    
                    <div className="shrink-0 ml-2">
                      {isDropdownOpen ? (
                        <ChevronUp size={16} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={16} className="text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </>
              ) : (
                <div className="relative group w-full">
                  <div className="w-full h-14 px-4 bg-muted/30 border border-border/50 rounded-xl flex items-center justify-between cursor-not-allowed opacity-70 transition-all">
                    <div className="flex items-center gap-3">
                      <Lock size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground text-sm">Login to select API key...</span>
                    </div>
                    <ChevronDown size={16} className="text-muted-foreground/40" />
                  </div>

                  <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-popover border border-border text-foreground text-xs font-medium px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl flex items-center gap-2">
                    <Lock size={12} className="text-muted-foreground" />
                    Please log in to access this feature
                  </div>
                </div>
              )}
            </div>

            <div className="relative group h-14" title={!user ? "Login Required" : ""}>
              <button
                onClick={handleSave}
                disabled={isSubmitDisabled || isFetchingKey}
                className={`px-5 h-full rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                  !user 
                    ? "bg-primary/40 text-primary-foreground/50 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {isFetchingKey ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};