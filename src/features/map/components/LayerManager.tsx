"use client";

import { useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import { chatService } from "@/features/chat/services/chat.service"; 
import { Layers, Eye, EyeOff, Map, ChevronRight, GripVertical } from "lucide-react";

// นำเข้าเครื่องมือจาก dnd-kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

// สร้าง Component ย่อยสำหรับแต่ละกล่องเลเยอร์เพื่อให้รองรับการลาก (โครงสร้างเดิมคงไว้ปกติ)
const SortableLayerItem = ({ layer, isHidden, onToggleVisibility, onClickMentions }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClickMentions}
      className={`bg-card border rounded-xl p-3 flex flex-col gap-3 transition-colors cursor-pointer group ${
        isDragging ? "border-primary shadow-2xl scale-[1.02]" : "border-border shadow-sm hover:border-primary/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden pr-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-2 rounded-md hover:bg-accent transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">
              {layer.title || layer.layerId}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {layer.type}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(layer.id);
          }}
          className={`p-2 rounded-lg transition-all shrink-0 ${
            !isHidden ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          {!isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
    </div>
  );
};


// Component หลัก LayerManager
// ปรับตรงนี้ให้รับ activeChatId ผ่าน Props เพื่อใช้ระบุตัวตนของห้องแชทครับเฮีย
export const LayerManager = () => {
  const {
    dynamicLayers,
    setDynamicLayers,
    hiddenLayers,
    toggleLayerVisibility,
    isBaseMapVisible,
    toggleBaseMap,
    triggerLayerMention,
    activeChatId,
  } = useMapStore();

  const [isOpen, setIsOpen] = useState(false);

  // ตั้งค่าเซนเซอร์การลาก 
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ฟังก์ชันจัดการตอนปล่อยเมาส์ 
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // 1. เช็กความเรียบร้อยก่อน
    if (!over) return;
    if (active.id === over.id) {
        console.log("Ignored: Same position");
        return;
    }

    // 2. จัดการหน้าบ้าน (UI)
    const oldIndex = dynamicLayers.findIndex((l) => l.id === active.id);
    const newIndex = dynamicLayers.findIndex((l) => l.id === over.id);
    const reorderedLayers = arrayMove(dynamicLayers, oldIndex, newIndex);
    setDynamicLayers(reorderedLayers);

    // 3. เตรียมส่งหลังบ้าน (API Sync)
    const currentActiveChatId = useMapStore.getState().activeChatId; 
    
    console.log("Attempting API Sync:", { 
        currentActiveChatId, 
        isSession: currentActiveChatId?.startsWith("session_") 
    });

    if (currentActiveChatId && !currentActiveChatId.startsWith("session_")) {
        try {
            const orderedIds = reorderedLayers.map((layer) => layer.id);
            console.log("Sending to API:", orderedIds); // ดูว่าส่งอะไรไป

            await chatService.updateLayersOrder(currentActiveChatId, orderedIds);
            console.log("Sync success!");
        } catch (error) {
            console.error("Sync failed! Error details:", error);
        }
    } else {
        console.warn("Sync skipped: No valid activeChatId or it is a session.");
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-3 bg-card text-foreground rounded-2xl border border-border shadow-2xl hover:bg-accent transition-all active:scale-95 group flex items-center px-4 gap-0 hover:gap-1.5 transition-all duration-300"
        >
          <Layers className="w-5 h-5 text-primary shrink-0" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 text-sm font-bold whitespace-nowrap">
            Layers
          </span>
        </button>
      )}

      {/* แถบ Sidebar ทางขวา */}
      <div
        className={`h-full transition-all duration-300 ease-in-out bg-background/95 backdrop-blur-2xl border-l border-border shadow-2xl flex flex-col ${
          isOpen ? "w-full md:w-[320px] translate-x-0" : "w-0 translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Layer Manager</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Base Map Toggle */}
          <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-accent rounded-lg text-foreground shrink-0">
                <Map size={16} />
              </div>
              <span className="font-semibold text-sm truncate">Base Map</span>
            </div>
            <button
              onClick={toggleBaseMap}
              className={`p-2 rounded-lg transition-all ${
                isBaseMapVisible ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {isBaseMapVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <hr className="border-border" />

          {/* Dynamic AI Layers (DND Provider) */}
          {dynamicLayers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              No active layers. <br /> Ask AI to generate some maps!
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                AI Layers ({dynamicLayers.length})
              </h3>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
                <SortableContext items={dynamicLayers.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  {dynamicLayers.map((layer) => (
                    <SortableLayerItem
                      key={layer.id}
                      layer={layer}
                      isHidden={hiddenLayers.includes(layer.id)}
                      onToggleVisibility={toggleLayerVisibility}
                      onClickMentions={() => triggerLayerMention(layer.layerId || layer.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              
            </div>
          )}
        </div>
      </div>
    </>
  );
};