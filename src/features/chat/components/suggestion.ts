import { ReactRenderer } from '@tiptap/react'; // แปลง react component เป็น tiptap suggestion component (HTML DOM ธรรมดา)
import tippy, { Instance as TippyInstance } from 'tippy.js'; // ไลบรารีสำหรับสร้าง tooltip ที่จะใช้แสดง suggestion popup
import { MentionList } from '@/../src/features/chat/components/MentionList';
import { useMapStore } from '@/store/useMapStore';

export const suggestion = { // ทำให้เป็น object ที่มีฟังก์ชัน items และ render
    items: ({ query }: { query: string }) => {
        const dynamicLayers = useMapStore.getState().dynamicLayers || []; 
        return dynamicLayers 
            .filter(layer => (layer.title || layer.id || "")
            .toLowerCase().includes(query.toLowerCase())) 
            .slice(0, 5);
    },

    render: () => { // ฟังก์ชัน render จะถูกเรียกเมื่อมีการแสดงผล suggestion และจะสร้าง ReactRenderer และ tippy instance เพื่อแสดง popup
        let component: ReactRenderer; 
        let popup: TippyInstance[];

        return { // props คือข้อมูลที่ tiptap ส่งมาให้ มี props.item และช้อมูลตำแหน่งจอ
            onStart: (props: any) => { // ฟังก์ชัน onStart จะถูกเรียกเมื่อเริ่มแสดง suggestion โดยจะสร้าง ReactRenderer และ tippy instance เพื่อแสดง popup
                
                component = new ReactRenderer(MentionList, { 
                    props,
                    editor: props.editor,
                })

                if (!props.clientRect) { // ถ้าไม่มี พิกัด ให้ return ออกไปเลย เพราะไม่สามารถแสดง popup ได้
                    return
                }

                popup = tippy('body', { //สั่งสร้างกล่อง Popup ด้วย tippy โดยกำหนดให้แสดงที่ตำแหน่งของ props.clientRect ซึ่ง tiptap จะส่งมาให้ตอนเรียก onStart
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'top-start',
                })
            },

            onUpdate(props: any) {
                component.updateProps(props)

                if (!props.clientRect) {
                    return
                }

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                })
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide()
                    return true
                }
                return (component.ref as { onKeyDown: (props: any) => boolean })?.onKeyDown(props)
            },

            onExit() {
                popup[0].destroy()
                component.destroy()
            },
        }
  },
}