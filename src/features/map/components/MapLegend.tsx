"use client";

import { useState } from "react"; 
import { List, ChevronDown, Layers } from "lucide-react"; 
import { useMapStore } from "@/store/useMapStore";

export const MapLegend = () => {
  const { dynamicLayers } = useMapStore();
  const [isExpanded, setIsExpanded] = useState(true);

  // Guard Clause: ถ้าไม่มีเลเยอร์เปิดอยู่เลย ไม่ต้องเรนเดอร์กล่อง
  if (!dynamicLayers || dynamicLayers.length === 0) return null;

  // ฟังก์ชันหลักดักแกะโครงสร้างสไตล์ของคู่มือระดับ Github ทุกเคส
  const renderSingleLayerLegend = (layer: any) => {
    if (!layer.renderStyles || !Array.isArray(layer.renderStyles) || layer.renderStyles.length === 0) return null;

    const targetStyle = layer.renderStyles[0];
    const paint = targetStyle?.paint || {};
    const layerType = targetStyle?.type || targetStyle?.layerType;
    const title = layer.title || "Layer Legend";

    // -------------------------------------------------------------------------
    // CASE 1: ดักเลเยอร์ประเภท RASTER (ภาพถ่ายดาวเทียม / เรดาร์น้ำฝน)
    // -------------------------------------------------------------------------
    if (layerType === "raster") {
      return (
        <div key={layer.id} className="p-3 bg-background/70 backdrop-blur-md border border-border rounded-xl shadow-lg w-[240px] font-sans text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h4 className="text-[11px] font-bold mb-1 text-muted-foreground uppercase tracking-wider truncate" title={title}>
            {title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-1">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>ข้อมูลภาพถ่าย / เรดาร์เชิงพื้นที่</span>
          </div>
        </div>
      );
    }

    // รวมคีย์สีจากทุก Geometry Type ในคู่มือ GitHub (fill, fill-extrusion, line, circle, heatmap)
    let colorExpression = paint["fill-color"] || 
                          paint["fill-extrusion-color"] || 
                          paint["line-color"] || 
                          paint["circle-color"] || 
                          paint["heatmap-color"];

    if (!colorExpression) return null;

    // ลอกคราบโครงสร้างเงื่อนไข "case" ตรวจสถานะ Hover ของระบบออกไปอย่างปลอดภัย
    let finalExpression = colorExpression;
    if (Array.isArray(colorExpression) && colorExpression[0] === "case") {
      finalExpression = colorExpression[3] || colorExpression[colorExpression.length - 1];
    }

    // -------------------------------------------------------------------------
    // CASE 2: ดักสีที่เป็นข้อความธรรมดา (Plain Hex Code String เช่น เลเยอร์ Solid Line / Dashed Line)
    // -------------------------------------------------------------------------
    if (typeof finalExpression === "string") {
      return (
        <div key={layer.id} className="p-3 bg-background/70 backdrop-blur-md border border-border rounded-xl shadow-lg w-[240px] font-sans text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h4 className="text-[11px] font-bold mb-2 text-muted-foreground uppercase tracking-wider truncate" title={title}>
            {title}
          </h4>
          <div className="flex items-center gap-2 text-xs font-medium">
            <div className="w-3 h-3 rounded-md shrink-0 border border-black/10 shadow-sm" style={{ backgroundColor: finalExpression }} />
            <span className="text-muted-foreground">สไตล์เส้นมาตรฐานระบบ</span>
          </div>
        </div>
      );
    }

    // ตรวจสอบเช็กความปลอดภัยขั้นสุดท้ายก่อนถอดโครงสร้างอาเรย์มิติตัวแปร
    if (!Array.isArray(finalExpression)) return null;
    const expressionType = finalExpression[0];

    // -------------------------------------------------------------------------
    // CASE 3: ดักโครงสร้างประเภท MATCH (การจำแนกสีตามกลุ่มข้อมูล เช่น ขอบเขตภูมิภาค re_nesdb)
    // -------------------------------------------------------------------------
    if (expressionType === "match") {
      const legendItems: { label: string; color: string }[] = [];
      // ลูปเริ่มแกะจากดัชนีพารามิเตอร์ตัวที่ 2 กระโดดทีละคู่ (ค่าข้อมูล, รหัสสี)
      for (let i = 2; i < finalExpression.length - 1; i += 2) {
        if (finalExpression[i] !== undefined && finalExpression[i + 1] !== undefined) {
          legendItems.push({
            label: String(finalExpression[i]),
            color: String(finalExpression[i + 1]),
          });
        }
      }

      return (
        <div key={layer.id} className="p-3 bg-background/70 backdrop-blur-md border border-border rounded-xl shadow-lg w-[240px] font-sans text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h4 className="text-[11px] font-bold mb-2 text-muted-foreground uppercase tracking-wider truncate" title={title}>
            {title}
          </h4>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
            {legendItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-medium">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 shadow-sm" style={{ backgroundColor: item.color }} />
                <span className="truncate text-muted-foreground hover:text-foreground transition-colors">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // CASE 4: ดักโครงสร้างประเภท INTERPOLATE / STEP (การไล่เฉดสีสี Gradient)
    // -------------------------------------------------------------------------
    if (expressionType === "interpolate" || expressionType === "step") {
      const colors: string[] = [];
      const values: number[] = [];
      const startIndex = expressionType === "interpolate" ? 3 : 2;

      for (let i = startIndex; i < finalExpression.length; i += 2) {
        if (finalExpression[i] !== undefined && finalExpression[i + 1] !== undefined) {
          values.push(Number(finalExpression[i]));
          colors.push(String(finalExpression[i + 1]));
        }
      }

      const gradientString = colors.join(", ");
      const isHeatmap = layerType === "heatmap" || !!paint["heatmap-color"];

      return (
        <div key={layer.id} className="p-3 bg-background/70 backdrop-blur-md border border-border rounded-xl shadow-lg w-[240px] font-sans text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h4 className="text-[11px] font-bold mb-2 text-muted-foreground uppercase tracking-wider truncate" title={title}>
            {isHeatmap ? `Data density (${title})` : title}
          </h4>
          
          {/* หลอดแก้วสเกลเฉดสีระบบกระจกฝ้าตามแบบดีไซน์ของเฮีย */}
          <div className="w-full h-3 rounded-md border border-black/5 shadow-inner" style={{ backgroundImage: `linear-gradient(to right, ${gradientString})` }} />
          
          {/* ควบคุมการแสดงผลส่วนข้อความด้านล่างหลอดสี */}
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold mt-1.5 px-0.5">
            {isHeatmap ? (
              <>
                <span>Min</span>
                <span>Max</span>
              </>
            ) : (
              // หากเป็นข้อมูลพอยต์พิกัดความร้อนทั่วไป (เช่น ข้อมูลไฟป่า bright_ti5) ให้เรนเดอร์แจกแจงตัวเลขตามจริงดั้งเดิม
              values.map((val, idx) => {
                const isLargeScale = Math.max(...values) > 100;
                const finalDisplayedVal = isLargeScale ? Math.round(val / 10) * 10 : Number(val.toFixed(1));
                return (
                  <span key={idx} className="transition-colors hover:text-foreground">
                    {finalDisplayedVal}
                  </span>
                );
              })
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ส่วนของการพับปิด-ขยายกล่องเลเจนด์ภาพรวม
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="p-3 bg-background/70 backdrop-blur-md border border-border shadow-lg rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center justify-center pointer-events-auto relative active:scale-95"
        title="Show Legend"
      >
        <List className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-background shadow-md">
          {dynamicLayers.length}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto custom-scrollbar pointer-events-auto p-1">
      <div className="flex justify-end pr-1">
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-1 px-2 py-1 bg-background/70 backdrop-blur-md border border-border rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground shadow-sm transition-all active:scale-95"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          HIDE
        </button>
      </div>
      {dynamicLayers.map((layer) => renderSingleLayerLegend(layer))}
    </div>
  );
};