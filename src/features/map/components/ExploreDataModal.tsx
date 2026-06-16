// src/features/map/components/ExploreDataModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useMapStore } from "@/store/useMapStore";
import { X, FileJson, BarChart3, Download, AlertCircle, Loader2, Activity, PieChart, TrendingUp, Eye, Code, ImageIcon } from "lucide-react";
import axios from "axios";
import { MAP_CONFIG } from "@/features/map/config/map.config";
import { ENV } from "@/lib/env";

interface ExploreDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  const [viewType, setViewType] = useState<"chart" | "json">("chart"); 
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar"); 

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isColumnsLoading, setIsColumnsLoading] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null);

  const chartRef = useRef<SVGSVGElement>(null); 

  const explorableLayers = dynamicLayers.filter(
    (layer) =>
      layer.type === "vector_tile" ||
      layer.type === "pmtiles" ||
      layer.type === "featureCollection" ||
      layer.type === "vector"
  );

  const currentColumnObj = availableColumns.find(c => c.name === selectedColumnName);
  const isNumericColumn = currentColumnObj?.dataTypeAlias === "number";

  useEffect(() => {
    if (isOpen && explorableLayers.length > 0 && !selectedLayerId) {
      setSelectedLayerId(explorableLayers[0].id);
    }
  }, [isOpen, explorableLayers, selectedLayerId]);

  useEffect(() => {
    if (selectedColumnName && !isNumericColumn && analysisMode === "summary") {
      setAnalysisMode("distribution");
      setChartType("pie"); 
    }
  }, [selectedColumnName, isNumericColumn, analysisMode]);

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
        if (!currentLayer || !currentLayer.baseUrl) throw new Error("Base URL reference not found for this layer.");

        const urlOrigin = new URL(currentLayer.baseUrl).origin;
        const apiKey = currentConversationApiKey || apiKeys.vallaris || apiKeys.gistda || "";

        const datasourcesPath = MAP_CONFIG.endpoints.analytics.datasources(ENV.VALLARIS_CONNECTION_ID);
        const dsResponse = await axios.get(`${urlOrigin}${datasourcesPath}?api_key=${apiKey}`);
        const allDatasources = dsResponse.data?.datasources || [];

        const matchedDs = allDatasources.find(
          (ds: any) => ds.name === currentLayer.title || ds.id === currentLayer.layerId || ds.id === currentLayer.id
        );

        if (!matchedDs) throw new Error(`Could not resolve Vallaris Datasource ID.`);

        const backendDatasourceId = matchedDs.id;

        const columnsPath = MAP_CONFIG.endpoints.analytics.columns(ENV.VALLARIS_CONNECTION_ID, backendDatasourceId);
        const columnsResponse = await axios.get(`${urlOrigin}${columnsPath}?api_key=${apiKey}`);
        const allColumns = columnsResponse.data?.columns || [];

        const filteredFields = allColumns.filter(
          (col: any) => 
            (col.dataTypeAlias === "number" || col.dataTypeAlias === "string" || col.dataTypeAlias === "unknown") && 
            !ANALYTICS_BLACKLIST.includes(col.name) &&
            !col.name.startsWith("_")
        );

        setAvailableColumns(filteredFields);
        if (filteredFields.length > 0) setSelectedColumnName(filteredFields[0].name);
        else setSelectedColumnName("_id"); 

      } catch (err: any) {
        console.error("[Schema Fetch Failure]:", err);
        setError(err.message || "Failed to parse schema.");
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

        const datasourcesPath = MAP_CONFIG.endpoints.analytics.datasources(ENV.VALLARIS_CONNECTION_ID);
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

        if (analysisMode === "summary" && isNumericColumn) {
          columnsPayload = [];
          dynamicAggregateRules = [
            { column: targetCol, aggregate: "count", alias: "total_valid_points" },
            { column: targetCol, aggregate: "avg", alias: `global_average_${targetCol}` },
            { column: targetCol, aggregate: "min", alias: `global_minimum_${targetCol}` },
            { column: targetCol, aggregate: "max", alias: `global_maximum_${targetCol}` }
          ];
        } else {
          columnsPayload = [{ name: targetCol, alias: targetCol }];
          dynamicAggregateRules = [{ column: targetCol, aggregate: "count", alias: "points_count" }];
          limitValue = 10000; 
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
          headers: { "Content-Type": "application/json", "api-key": apiKeyExplored }
        });

        if (analysisMode === "summary") {
          const summaryResult = queryResponse.data?.items?.[0] || queryResponse.data?.data?.[0] || queryResponse.data;
          setAnalyticsData(summaryResult);
        } else {
          const listResult = queryResponse.data?.items || queryResponse.data?.data || queryResponse.data;
          const cleanList = Array.isArray(listResult) 
            ? listResult.filter((item: any) => item[targetCol] !== null && item[targetCol] !== undefined && item[targetCol] !== "")
            : [];
          setAnalyticsData(cleanList);
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

  const handleDownloadPng = () => {
    if (!chartRef.current) return;
    try {
      const svgElement = chartRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const URLObject = window.URL || window.webkitURL || window;
      const blobURL = URLObject.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 700;
        canvas.height = 380; 
        const context = canvas.getContext("2d");
        if (context) {
          context.fillStyle = "#09090b"; 
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 25, 20); 
          
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `chart_${analysisMode}_${selectedColumnName}_${Date.now()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URLObject.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.error("Failed to snapshot chart image:", err);
    }
  };

  const renderNativeCharts = () => {
    if (!analyticsData) return null;
    const targetKey = selectedColumnName;

    if (analysisMode === "summary") {
      const minVal = analyticsData[`global_minimum_${targetKey}`] || 0;
      const avgVal = analyticsData[`global_average_${targetKey}`] || 0;
      const maxVal = analyticsData[`global_maximum_${targetKey}`] || 0;
      const totalPoints = analyticsData[`total_valid_points`] || 0;

      const maxValueForScale = maxVal * 1.15 || 100;
      const hMin = (minVal / maxValueForScale) * 180;
      const hAvg = (avgVal / maxValueForScale) * 180;
      const hMax = (maxVal / maxValueForScale) * 180;

      return (
        <div className="flex flex-col items-center justify-center w-full h-full pt-4">
          <div className="text-center mb-2 text-zinc-400 text-xs font-sans">
            Global Snapshot Summary of <span className="text-primary font-bold">{targetKey}</span> over <span className="text-emerald-400 font-bold">{totalPoints}</span> spatial positions.
          </div>
          <svg ref={chartRef} width="100%" height="100%" viewBox="0 0 650 320" className="font-mono text-xs">
            <line x1="50" y1="40" x2="600" y2="40" stroke="#27272a" strokeDasharray="3" />
            <line x1="50" y1="140" x2="600" y2="140" stroke="#27272a" strokeDasharray="3" />
            <line x1="50" y1="240" x2="600" y2="240" stroke="#3f3f46" strokeWidth="1.5" />
            
            <rect x="150" y={240 - hMin} width="60" height={hMin} fill="#38bdf8" rx="4" />
            <text x="180" y={230 - hMin} fill="#38bdf8" textAnchor="middle" className="font-bold">{minVal.toFixed(2)}</text>
            <text x="180" y="260" fill="#94a3b8" textAnchor="middle" className="font-sans font-bold text-sm">MIN</text>

            <rect x="300" y={240 - hAvg} width="60" height={hAvg} fill="#10b981" rx="4" />
            <text x="330" y={230 - hAvg} fill="#10b981" textAnchor="middle" className="font-bold">{avgVal.toFixed(2)}</text>
            <text x="330" y="260" fill="#94a3b8" textAnchor="middle" className="font-sans font-bold text-sm">AVG</text>

            <rect x="450" y={240 - hMax} width="60" height={hMax} fill="#f43f5e" rx="4" />
            <text x="480" y={230 - hMax} fill="#f43f5e" textAnchor="middle" className="font-bold">{maxVal.toFixed(2)}</text>
            <text x="480" y="260" fill="#94a3b8" textAnchor="middle" className="font-sans font-bold text-sm">MAX</text>
          </svg>
        </div>
      );
    } else {
      if (!Array.isArray(analyticsData) || analyticsData.length === 0) {
        return <div className="h-full flex items-center justify-center text-zinc-500">No tabular data matching this attribute matrix.</div>;
      }

      let displayData: any[] = [];
      const colors = ["#f43f5e", "#06b6d4", "#10b981", "#eab308", "#a855f7", "#6366f1", "#f97316", "#ec4899"];

      if (chartType === "pie") {
        const sortedByCount = [...analyticsData].sort((a, b) => (b.points_count || 0) - (a.points_count || 0));
        if (sortedByCount.length > 8) {
          const top7 = sortedByCount.slice(0, 7);
          const remaining = sortedByCount.slice(7);
          const othersCount = remaining.reduce((sum, current) => sum + (current.points_count || 0), 0);
          displayData = [...top7, { [targetKey]: "Others (อื่นๆ)", points_count: othersCount }];
        } else {
          displayData = sortedByCount;
        }
      } else {
        const top10frequent = [...analyticsData]
          .sort((a, b) => (b.points_count || 0) - (a.points_count || 0))
          .slice(0, 10);
        if (isNumericColumn) {
          displayData = top10frequent.sort((a, b) => Number(a[targetKey]) - Number(b[targetKey]));
        } else {
          displayData = top10frequent;
        }
      }

      const maxPoints = Math.max(...displayData.map(d => d.points_count || 1));
      const totalPointsSum = displayData.reduce((acc, curr) => acc + (curr.points_count || 0), 0);

      // 1. PIE CHART 
      if (chartType === "pie") {
        let accumulatedPercent = 0;
        return (
          <div className="flex flex-col items-center justify-center w-full h-full pt-4">
            <svg ref={chartRef} width="100%" height="100%" viewBox="0 0 650 320" className="font-mono">
              <g transform="translate(140, 50) scale(6) rotate(-90, 20, 20)">
                <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#18181b" strokeWidth="4" />
                {displayData.map((d, i) => {
                  const percent = ((d.points_count || 0) / totalPointsSum) * 100;
                  const strokeDasharray = `${percent} ${100 - percent}`;
                  const strokeDashoffset = 100 - accumulatedPercent + 25; 
                  accumulatedPercent += percent;
                  const sliceColor = String(d[targetKey]).includes("อื่นๆ") ? "#52525b" : colors[i % colors.length];

                  return (
                    <circle
                      key={`pie-${i}`}
                      cx="20"
                      cy="20"
                      r="15.915"
                      fill="transparent"
                      stroke={sliceColor}
                      strokeWidth="4.5"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-700"
                    />
                  );
                })}
              </g>
              
              <g transform="translate(380, 50)">
                {displayData.map((d, i) => {
                  const pct = ((d.points_count || 0) / totalPointsSum) * 100;
                  const sliceColor = String(d[targetKey]).includes("อื่นๆ") ? "#52525b" : colors[i % colors.length];
                  const label = String(d[targetKey]);
                  const displayLabel = label.length > 15 ? label.substring(0, 15) + "..." : label;

                  return (
                    <g key={`legend-${i}`} transform={`translate(0, ${i * 26})`}>
                      <rect x="0" y="-10" width="14" height="14" rx="2" fill={sliceColor} />
                      <text x="24" y="2" fill="#d4d4d8" className="font-bold text-xs font-sans">{displayLabel}</text>
                      <text x="160" y="2" fill="#a1a1aa" className="text-[11px] font-mono">{d.points_count} pts</text>
                      <text x="220" y="2" fill="#38bdf8" className="font-bold text-[11px] font-mono">({pct.toFixed(1)}%)</text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        );
      }

      // 2. LINE CHART 
      if (chartType === "line") {
        const points = displayData.map((d, i) => {
          const x = 79 + i * 52; 
          const y = 240 - ((d.points_count || 0) / maxPoints) * 180;
          return `${x},${y}`;
        }).join(" ");

        return (
          <div className="flex flex-col items-center justify-center w-full h-full pt-4">
            <svg ref={chartRef} width="100%" height="100%" viewBox="0 0 650 320" className="font-mono text-xs">
              <line x1="50" y1="60" x2="600" y2="60" stroke="#27272a" strokeDasharray="3" />
              <line x1="50" y1="150" x2="600" y2="150" stroke="#27272a" strokeDasharray="3" />
              <line x1="50" y1="240" x2="600" y2="240" stroke="#3f3f46" strokeWidth="1.5" />
              
              <polyline fill="none" stroke="#06b6d4" strokeWidth="3" points={points} className="transition-all duration-500" />
              
              {displayData.map((d, i) => {
                const x = 79 + i * 52;
                const y = 240 - ((d.points_count || 0) / maxPoints) * 180;
                const label = String(d[targetKey]);
                const displayLabel = label.length > 12 ? label.substring(0, 12) + "..." : label;

                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="5" fill="#09090b" stroke="#06b6d4" strokeWidth="2.5" />
                    <text x={x} y={y - 12} fill="#06b6d4" textAnchor="middle" className="font-bold">{d.points_count}</text>
                    <text 
                      x={x} 
                      y="255" 
                      fill="#a1a1aa" 
                      textAnchor="end" 
                      transform={`rotate(-45, ${x}, 255)`} 
                      className="font-sans font-bold"
                    >
                      {displayLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      }

      // 3. BAR CHART 
      return (
        <div className="flex flex-col items-center justify-center w-full h-full pt-4">
          <svg ref={chartRef} width="100%" height="100%" viewBox="0 0 650 320" className="font-mono text-xs">
            <line x1="50" y1="60" x2="600" y2="60" stroke="#27272a" strokeDasharray="3" />
            <line x1="50" y1="150" x2="600" y2="150" stroke="#27272a" strokeDasharray="3" />
            <line x1="50" y1="240" x2="600" y2="240" stroke="#3f3f46" strokeWidth="1.5" />

            {displayData.map((d, i) => {
              const barHeight = ((d.points_count || 0) / maxPoints) * 180;
              const xPos = 65 + i * 52; 
              const label = String(d[targetKey]);
              const displayLabel = label.length > 12 ? label.substring(0, 12) + "..." : label;

              return (
                <g key={i}>
                  <rect x={xPos} y={240 - barHeight} width="28" height={barHeight} fill="#a855f7" rx="3" className="transition-all duration-500" />
                  <text x={xPos + 14} y={232 - barHeight} fill="#c084fc" textAnchor="middle" className="font-bold">{d.points_count}</text>
                  <text 
                    x={xPos + 14} 
                    y="255" 
                    fill="#a1a1aa" 
                    textAnchor="end" 
                    transform={`rotate(-45, ${xPos + 14}, 255)`} 
                    className="font-sans font-bold"
                  >
                    {displayLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh] transition-all">
        
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Explore Layer Data Workspace</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Control Panel [COMPACT DESIGN] */}
        <div className="p-3 flex flex-col gap-2.5 overflow-hidden flex-1">
          
          {/* แผง Dropdowns ย่อขนาดให้เพรียวบางลง */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 shrink-0">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Select Active Layer ({explorableLayers.length})
              </label>
              <select
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                {explorableLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.title || layer.layerId} ({layer.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Select Specific Attribute
              </label>
              <select
                value={selectedColumnName}
                onChange={(e) => setSelectedColumnName(e.target.value)}
                disabled={isColumnsLoading || availableColumns.length === 0}
                className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isColumnsLoading ? (
                  <option>Scanning schema...</option>
                ) : availableColumns.length === 0 ? (
                  <option>No explorable metrics available</option>
                ) : (
                  availableColumns.map((col) => (
                    <option key={col.id} value={col.name}>
                      {col.name} ({col.dataTypeAlias || "string"})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* แผงควบคุมกลยุทธ์กะทัดรัด */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 shrink-0">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Analysis Strategy
              </label>
              <div className="grid grid-cols-2 p-1 bg-accent/40 rounded-lg border border-border">
                <button
                  type="button"
                  disabled={!isNumericColumn}
                  onClick={() => setAnalysisMode("summary")}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                    analysisMode === "summary" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 size={13} /> Global Summary
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisMode("distribution")}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    analysisMode === "distribution" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Activity size={13} /> Value Distribution
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Display Interface
              </label>
              <div className="grid grid-cols-2 p-1 bg-accent/40 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setViewType("chart")}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    viewType === "chart" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye size={13} /> Chart Analytics
                </button>
                <button
                  type="button"
                  onClick={() => setViewType("json")}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    viewType === "json" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code size={13} /> Raw JSON
                </button>
              </div>
            </div>
          </div>

          {analysisMode === "distribution" && viewType === "chart" && !error && analyticsData && (
            <div className="flex flex-col gap-1 shrink-0 animate-fadeIn">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Chart Dimension
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-3 py-1 text-xs font-bold rounded-md border transition-all flex items-center gap-1 ${
                    chartType === "bar" ? "bg-purple-500/10 border-purple-500 text-purple-400" : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 size={12} /> Bar Chart
                </button>
                <button
                  onClick={() => setChartType("line")}
                  className={`px-3 py-1 text-xs font-bold rounded-md border transition-all flex items-center gap-1 ${
                    chartType === "line" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TrendingUp size={12} /> Line Chart
                </button>
                <button
                  onClick={() => setChartType("pie")}
                  className={`px-3 py-1 text-xs font-bold rounded-md border transition-all flex items-center gap-1 ${
                    chartType === "pie" ? "bg-rose-500/10 border-rose-500 text-rose-400" : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PieChart size={12} /> Pie Chart 
                </button>
              </div>
            </div>
          )}

          {/* Main Visualizer Terminal Box - ขยายพื้นที่เหลือเฟือ */}
          <div className="flex-1 min-h-0 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl font-mono text-xs p-2 overflow-auto relative custom-scrollbar group">
            {(isLoading || isColumnsLoading) && (
              <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-zinc-950/80 backdrop-blur-xs text-zinc-400 z-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[11px] tracking-wide">Processing query via Vallaris engine...</span>
              </div>
            )}

            {error && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-destructive gap-2">
                <AlertCircle size={24} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {!isLoading && !isColumnsLoading && !error && analyticsData && (
              <div className="h-full">
                {viewType === "json" ? (
                  <div className="relative h-full p-2">
                    <button
                      onClick={handleDownloadJson}
                      className="absolute top-0 right-0 p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-primary-foreground hover:bg-primary rounded-md transition-all flex items-center gap-1 text-[10px] font-sans font-bold shadow-xl"
                    >
                      <Download size={12} /> JSON
                    </button>
                    <pre className="pt-6 md:pt-0 leading-relaxed select-text">{JSON.stringify(analyticsData, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {renderNativeCharts()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!error && analyticsData && !isLoading && !isColumnsLoading && (
          <div className="p-3 border-t border-border flex justify-end gap-2 shrink-0 bg-accent/20 rounded-b-2xl">
            <button
              onClick={handleDownloadJson}
              className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs rounded-lg hover:bg-zinc-800 transition-all flex items-center gap-2"
            >
              <FileJson size={14} /> Export JSON
            </button>
            {viewType === "chart" && (
              <button
                onClick={handleDownloadPng}
                className="px-4 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 transition-all flex items-center gap-2 shadow-md shadow-primary/10"
              >
                <ImageIcon size={14} /> Export Image (.png)
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};