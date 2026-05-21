import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList } from '@/../src/features/chat/components/MentionList';
import { useMapStore } from '@/store/useMapStore';

export const suggestion = {
    items: ({ query }: { query: string }) => {
        const dynamicLayers = useMapStore.getState().dynamicLayers || [];

        return dynamicLayers
            .filter(layer => (layer.title || layer.id || "").toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);
        },

    render: () => {
        let component: ReactRenderer;
        let popup: TippyInstance[];

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                })

                if (!props.clientRect) {
                    return
                }

                popup = tippy('body', {
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