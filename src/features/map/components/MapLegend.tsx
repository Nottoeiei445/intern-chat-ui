// src/features/map/components/MapLegend.tsx
"use client";

import { useState } from "react"; 
import { List, ChevronDown } from "lucide-react"; 
import { useMapStore } from "@/store/useMapStore";

export const MapLegend = () => {
  const { dynamicLayers } = useMapStore();
  const [isExpanded, setIsExpanded] = useState(true);

  // Guard Clause: ถ้าไม่มีเลเยอร์เปิดอยู่เลย ไม่ต้องขึ้นกล่อง
  if (!dynamicLayers || dynamicLayers.length === 0) return null;

  // ฟังก์ชันย่อยคอยแกะโครงสร้างสไตล์แยกทีละเลเยอร์อย่างปลอดภัย (คงเดิมไว้ทั้งหมด)
  const renderSingleLayerLegend = (layer: any) => {
    if (!layer.renderStyles || !Array.isArray(layer.renderStyles) || layer.renderStyles.length === 0) return null;

    const targetStyle = layer.renderStyles[0];
    const paint = targetStyle?.paint || {};
    let colorExpression = paint["circle-color"] || paint["fill-color"] || paint["line-color"];

    if (!Array.isArray(colorExpression)) return null;

    // ถ้าเจอคำว่า "case" นำหน้า ให้กระโดดไปคว้าเอาอาร์กิวเมนต์ตัวสุดท้าย (Fallback) ซึ่งก็คือกล่องสไตล์หลักมาทำงานต่อทันที!
    if (colorExpression[0] === "case") {
      colorExpression = colorExpression[colorExpression.length - 1];
    }

    // เช็กความปลอดภัยอีกรอบหลังลอกคราบ เผื่อตัวสุดท้ายไม่ได้เป็นอาเรย์
    if (!Array.isArray(colorExpression)) return null;

    const expressionType = colorExpression[0]; // ตอนนี้จะกลายเป็น 'match' หรือ 'interpolate' สมใจอยากแล้วครับ
    const title = layer.title || "Layer Legend";

    //แกะโครงสร้างแบบ "match" (แยกสีตามรายชื่อกลุ่ม)
    if (expressionType === "match") {
      const legendItems: { label: string; color: string }[] = [];
      for (let i = 2; i < colorExpression.length - 1; i += 2) {
        legendItems.push({
          label: String(colorExpression[i]),
          color: String(colorExpression[i + 1]),
        });
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

    //แกะโครงสร้างแบบ interpolate หรือ step (ไล่เฉดสีเป็น Gradient ตามระดับความรุนแรง)
    if (expressionType === "interpolate" || expressionType === "step") {
      const colors: string[] = [];
      const values: number[] = [];
      const startIndex = expressionType === "interpolate" ? 3 : 2;

      for (let i = startIndex; i < colorExpression.length; i += 2) {
        if (colorExpression[i] !== undefined && colorExpression[i + 1] !== undefined) {
          values.push(Number(colorExpression[i]));
          colors.push(String(colorExpression[i + 1]));
        }
      }

      const gradientString = colors.join(", ");

      const maxVal = values.length > 0 ? Math.max(...values) : 0;
      const isLargeScale = maxVal > 100; 
      return (
        <div key={layer.id} className="p-3 bg-background/70 backdrop-blur-md border border-border rounded-xl shadow-lg w-[240px] font-sans text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h4 className="text-[11px] font-bold mb-1.5 text-muted-foreground uppercase tracking-wider truncate" title={title}>
            {title}
          </h4>
          
          {/* แถบสีเลเจนด์ไล่เฉดสี Gradient */}
          <div className="w-full h-2.5 rounded-full border border-black/5 shadow-inner" style={{ backgroundImage: `linear-gradient(to right, ${gradientString})` }} />
          
          {/*ลูปพ่นตัวเลขบอกระดับความรุนแรงตามจริง กระจายตัวสม่ำเสมอใต้แถบสี */}
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold mt-1 px-0.5">
            {values.map((val, idx) => {
                const finalDisplayedVal = typeof val === 'number'
                  ? (isLargeScale ? Math.round(val / 10) * 10 : Number(val.toFixed(1)))
                  : val;

                return (
                <span key={idx} className="transition-colors hover:text-foreground">
                    {finalDisplayedVal}
                </span>
                );
            })}
            </div>
        </div>
      );
    }

    return null;
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="p-3 bg-background/70 backdrop-blur-md border border-border shadow-lg rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center justify-center pointer-events-auto relative active:scale-95"
        title="Show Legend"
      >
        <List className="w-5 h-5" />
        {/* จุดเม็ดตัวเลขบอกจำนวนเลเยอร์ที่ซ่อนอยู่ด้านใน */}
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-background shadow-md">
          {dynamicLayers.length}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto custom-scrollbar pointer-events-auto p-1">
      {/* ปุ่มกดสั่งซ่อนกล่อง ดีไซน์กลืนไปกับธีมกระจกฝ้าของเฮีย */}
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