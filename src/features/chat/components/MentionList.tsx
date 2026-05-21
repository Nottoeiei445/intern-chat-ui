import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Layers } from 'lucide-react'

interface MentionListProps {
    items: any[];
    command: (item: {id: string; label: string }) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => { setSelectedIndex(0) }, [props.items])

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command({
                id: item.layerId || item.id,
                label: item.title || item.id
            })
        }
    }

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
                return true
            } 
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelectedIndex((selectedIndex + 1) % props.items.length)
                return true
            }
            if (event.key === 'Enter') {
                event.preventDefault()
                selectItem(selectedIndex)
                return true
            }
            return false
        },
    }))

    if (!props.items.length) {
        return null
    }

return (
    <div id = "mention-popup" className="w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2">
      <div className="p-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border flex items-center gap-2">
        <Layers size={14} /> Select a layer
      </div>
      
      <div className="max-h-48 overflow-y-auto custom-scrollbar">
        {props.items.map((layer, index) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors flex flex-col ${
              index === selectedIndex ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
            }`}
          >
            <span className="font-medium truncate">{layer.title || layer.id}</span>
            <span className="text-[10px] text-muted-foreground opacity-70 truncate">{layer.id}</span>
          </button>
        ))}
      </div>
    </div>
  )
})

MentionList.displayName = 'MentionList'
