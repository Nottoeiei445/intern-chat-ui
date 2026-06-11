// src/features/map/components/ExploreDataModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore";
import { X, FileJson, BarChart3, Download, AlertCircle, Loader2, ToggleLeft, Activity } from "lucide-react";
import axios from "axios";
import { MAP_CONFIG } from "@/features/map/config/map.config";
import { ENV } from "@/lib/env";

interface ExploreDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONNECTION_ID = "6734498c30535afad9a3f7ad";

const ANALYTICS_BLACKLIST = [
  "latitude", "longitude", "utm_e", "utm_n",
  "pv_idn", "ap_idn", "tb_idn",
  "pv_code", "ap_code", "tb_code", "lu_code",
  "timestamp", "v_angle", "v_dist", "f_alarm"
];

export const ExploreDataModal = ({ isOpen, onClose }: ExploreDataModalProps) => {
  const { dynamicLayers, apiKeys, currentConversationApiKey } = useMapStore();
  
  const [selectedLayerId, setSelectedLayerId] = useState<string>("");
  const [availableColumns, setAvailableColumns] = useState<any[]>([]); 
  const [selectedColumnName, setSelectedColumnName] = useState<string>(""); 
  
  const [analysisMode, setAnalysisMode] = useState<"summary" | "distribution">("summary");

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isColumnsLoading, setIsColumnsLoading] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null);

  const explorableLayers = dynamicLayers.filter(
    (layer) =>
      layer.type === "vector_tile" ||
      layer.type === "pmtiles" ||
      layer.type === "featureCollection" ||
      layer.type === "vector"
  );

  useEffect(() => {
    if (isOpen && explorableLayers.length > 0 && !selectedLayerId) {
      setSelectedLayerId(explorableLayers[0].id);
    }
  }, [isOpen, explorableLayers, selectedLayerId]);

  useEffect(() => {
    if (!isOpen || !selectedLayerId) return;

    const fetchLayerSchema = async () => {
      setIsColumnsLoading(true);
      setError(null);
      setAvailableColumns([]);
      setSelectedColumnName("");
      setAnalyticsData(null);

      try {
        const currentLayer = explorableLayers.find((l) => l.id === selectedLayerId);
        if (!currentLayer || !currentLayer.baseUrl) {
          throw new Error("Base URL reference not found for this layer.");
        }

        const urlOrigin = new URL(currentLayer.baseUrl).origin;
        const apiKey = currentConversationApiKey || apiKeys.vallaris || apiKeys.gistda || "";

        const datasourcesPath = MAP_CONFIG.endpoints.analytics.datasources(CONNECTION_ID);
        const dsResponse = await axios.get(`${urlOrigin}${datasourcesPath}?api_key=${apiKey}`);
        const allDatasources = dsResponse.data?.datasources || [];

        const matchedDs = allDatasources.find(
          (ds: any) => ds.name === currentLayer.title || ds.id === currentLayer.layerId || ds.id === currentLayer.id
        );

        if (!matchedDs) {
          throw new Error(`Could not resolve Vallaris Datasource ID for layer "${currentLayer.title}".`);
        }

        const backendDatasourceId = matchedDs.id;

        const columnsPath = MAP_CONFIG.endpoints.analytics.columns(CONNECTION_ID, backendDatasourceId);
        const columnsResponse = await axios.get(`${urlOrigin}${columnsPath}?api_key=${apiKey}`);
        const allColumns = columnsResponse.data?.columns || [];

        const filteredFields = allColumns.filter(
          (col: any) => col.dataTypeAlias === "number" && !ANALYTICS_BLACKLIST.includes(col.name)
        );

        setAvailableColumns(filteredFields);
        if (filteredFields.length > 0) {
          setSelectedColumnName(filteredFields[0].name);
        } else {
          setSelectedColumnName("_id"); 
        }

      } catch (err: any) {
        console.error("[Schema Fetch Failure]:", err);
        setError(err.message || "Failed to parse layer metadata structures.");
      } finally {
        setIsColumnsLoading(false);
      }
    };

    fetchLayerSchema();
  }, [selectedLayerId, isOpen]);


  useEffect(() => {
    if (!isOpen || !selectedLayerId || !selectedColumnName) return;

    const fetchDynamicAnalytics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const currentLayer = explorableLayers.find((l) => l.id === selectedLayerId);
        if (!currentLayer || !currentLayer.baseUrl) return;

        const urlOrigin = new URL(currentLayer.baseUrl).origin;
        const apiKeyExplored = ENV.VALLARIS_ANALYTICS_KEY;

        const datasourcesPath = MAP_CONFIG.endpoints.analytics.datasources(CONNECTION_ID);
        const apiKey = currentConversationApiKey || apiKeys.vallaris || apiKeys.gistda || "";
        const dsResponse = await axios.get(`${urlOrigin}${datasourcesPath}?api_key=${apiKey}`);
        const matchedDs = (dsResponse.data?.datasources || []).find(
          (ds: any) => ds.name === currentLayer.title || ds.id === currentLayer.layerId || ds.id === currentLayer.id
        );

        if (!matchedDs) return;

        const targetCol = selectedColumnName;
        
        let columnsPayload: any[] = [];
        let dynamicAggregateRules: any[] = [];
        let limitValue = 1;

        if (analysisMode === "summary") {
          columnsPayload = [];
          dynamicAggregateRules = [
            { column: targetCol, aggregate: "count", alias: "total_valid_points" },
            { column: targetCol, aggregate: "avg", alias: `global_average_${targetCol}` },
            { column: targetCol, aggregate: "min", alias: `global_minimum_${targetCol}` },
            { column: targetCol, aggregate: "max", alias: `global_maximum_${targetCol}` }
          ];
          limitValue = 1;
        } else {
          columnsPayload = [{ name: targetCol, alias: targetCol }];
          dynamicAggregateRules = [
            { column: targetCol, aggregate: "count", alias: "points_count" }
          ];
          limitValue = 10000; // เปิดโควตาให้แถวข้อมูลแจกแจงความถี่ไหลลงมาได้ทั้งหมด
        }

        const explorePayload = {
          connectionId: ENV.VALLARIS_CONNECTION_ID,
          datasource: { id: matchedDs.id },
          columns: columnsPayload,
          aggregate: dynamicAggregateRules,
          offset: 0,
          limit: limitValue
        };

        const explorePath = MAP_CONFIG.endpoints.analytics.explore;
        const queryResponse = await axios.post(`${urlOrigin}${explorePath}`, explorePayload, {
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKeyExplored
          }
        });

        if (analysisMode === "summary") {
          // โหมดภาพรวม ดึงเอาวัตถุก้อนแรกแถวเดียวออกมาโชว์เนื้อเน้นๆ
          const summaryResult = queryResponse.data?.items?.[0] || queryResponse.data?.data?.[0] || queryResponse.data;
          setAnalyticsData(summaryResult);
        } else {
          // โหมดแจกแจงค่า แสดงลิสต์ตารางอาร์เรย์ทั้งหมดที่จับกลุ่มคิวรี่ออกมา
          const listResult = queryResponse.data?.items || queryResponse.data?.data || queryResponse.data;
          setAnalyticsData(listResult);
        }

      } catch (err: any) {
        console.error("[Explore Aggregation Failure]:", err);
        setError(err?.response?.data?.message || err.message || "Failed to execute global spatial data calculation.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDynamicAnalytics();
  }, [selectedColumnName, selectedLayerId, analysisMode, isOpen]); 

  const handleDownloadJson = () => {
    if (!analyticsData) return;
    const fileName = `${analysisMode}_metrics_${selectedColumnName}_${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col h-[80vh] transition-all">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base md:text-lg">Explore Layer Data Workspace</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Control Panel */}
        <div className="p-4 flex flex-col gap-4 overflow-hidden flex-1">
          
          {/* แผง Dropdowns คู่หลัก */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Active Layer ({explorableLayers.length})
              </label>
              <select
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="w-full bg-background border border-border p-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                {explorableLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.title || layer.layerId} ({layer.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Specific Attribute
              </label>
              <select
                value={selectedColumnName}
                onChange={(e) => setSelectedColumnName(e.target.value)}
                disabled={isColumnsLoading || availableColumns.length === 0}
                className="w-full bg-background border border-border p-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isColumnsLoading ? (
                  <option>Scanning schema...</option>
                ) : availableColumns.length === 0 ? (
                  <option>No quantitative metrics available</option>
                ) : (
                  availableColumns.map((col) => (
                    <option key={col.id} value={col.name}>
                      {col.name} ({col.dataType || "number"})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Analysis Strategy
            </label>
            <div className="grid grid-cols-2 p-1 bg-accent/50 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setAnalysisMode("summary")}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  analysisMode === "summary"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 size={14} />
                Global Summary 
              </button>
              <button
                type="button"
                onClick={() => setAnalysisMode("distribution")}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  analysisMode === "distribution"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Activity size={14} />
                Value Distribution 
              </button>
            </div>
          </div>

          {/* Terminal View */}
          <div className="flex-1 min-h-0 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl font-mono text-xs p-4 overflow-auto relative custom-scrollbar group">
            {(isLoading || isColumnsLoading) && (
              <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-zinc-950/80 backdrop-blur-xs text-zinc-400 z-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[11px] tracking-wide">Processing analytical query requested via Vallaris engine...</span>
              </div>
            )}

            {error && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-destructive gap-2">
                <AlertCircle size={24} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {!isLoading && !isColumnsLoading && !error && analyticsData && (
              <div className="relative h-full">
                <button
                  onClick={handleDownloadJson}
                  className="absolute top-0 right-0 p-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-primary-foreground hover:bg-primary rounded-lg transition-all flex items-center gap-1.5 text-[11px] font-sans font-bold shadow-xl opacity-100 md:opacity-0 md:group-hover:opacity-100"
                >
                  <Download size={14} />
                  Download JSON
                </button>
                <pre className="pt-8 md:pt-0 leading-relaxed select-text">{JSON.stringify(analyticsData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!error && analyticsData && !isLoading && !isColumnsLoading && (
          <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0 bg-accent/20 rounded-b-2xl">
            <button
              onClick={handleDownloadJson}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 shadow-md shadow-primary/10"
            >
              <FileJson size={16} />
              Export {analysisMode === "summary" ? "Global Summary" : "Distribution Table"} (.json)
            </button>
          </div>
        )}

      </div>
    </div>
  );
};