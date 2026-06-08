// src/features/chat/hooks/useChatStream.ts
import { useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import { chatService } from "../services/chat.service"; // ปรับ path ตามโครงสร้างจริงของเฮียครับ
import { CHAT_CONFIG } from "../config/chat.config"; // ปรับ path ตามจริง
import { AUTH_CONFIG } from "@/features/auth/config/auth.config"; // ปรับ path ตามจริงของเฮียครับ
import { Message, ChatThread } from "../types";
import { storage } from "@/lib/storage"; // ปรับ path ตามจริง

interface UseChatStreamProps {
  chats: ChatThread[];
  setChats: React.Dispatch<React.SetStateAction<ChatThread[]>>;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  setDynamicLayers: (layers: any[]) => void;
  setPaginationConfig: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  openKeyModal: () => void;
  setPendingChat: (chat: any) => void;
  user: any; 
}

export const useChatStream = ({
  chats,
  setChats,
  activeChatId,
  setActiveChatId,
  setDynamicLayers,
  setPaginationConfig,
  openKeyModal,
  setPendingChat,
  user
}: UseChatStreamProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]);

  // Helper ฟังก์ชันสำหรับเรียงลำดับแชท
  const sortChats = (list: ChatThread[]) => {
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const sendMessage = async (input: string, model: string, images: string[] = [], options?: any) => {
    if (!input.trim() && images.length === 0 && !options?.isRegenerate) return;

    const {
      ephemeral = false,
      isRegenerate = false,
      isSilentRetry = false,
      isClarity = false,
      editMessageId = null,
      choiceKey,
      choiceValue,
      mapselection,
      targetMessageId
    } = options || {};

    let currentId = options?.explicitChatId || activeChatId || (!user && (storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey) as string)) || null;
    
    if (user && typeof currentId === "string" && currentId.startsWith("guest_")) {
      currentId = null;
      if (options) delete options.explicitChatId;
    }
    let isNewSession = false;

    const existingChat = chats.find(c => c.id === currentId);
    const effectiveModel = existingChat?.model || model;

    if (!isRegenerate && !isSilentRetry) {
      const userMsg: Message = { role: "user", content: input, ...(images.length > 0 && { images }) };
      if (ephemeral) {
        setEphemeralMessages(prev => [...prev, userMsg]);
      } else if (currentId && !currentId.startsWith("session_")) {
        setChats(prev => {
          const exists = prev.some(c => c.id === currentId);
          if (!exists) {
            return [{ id: currentId as string, title: input.slice(0, 30) || "Guest Session", messages: [userMsg], model: effectiveModel, createdAt: Date.now(), updatedAt: Date.now() }, ...prev];
          }
          return sortChats(prev.map(chat => chat.id === currentId ? { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() } : chat));
        });
        setActiveChatId(currentId);
      } else {
        isNewSession = true;
        currentId = `session_${Date.now()}`;
        const mapStore = useMapStore.getState();
        mapStore.setcurrentConversationApiKey(null);
        mapStore.clearApiKeys();
        setChats(prev => [{ id: currentId as string, title: input.slice(0, 30), messages: [userMsg], model: effectiveModel, createdAt: Date.now(), updatedAt: Date.now() }, ...prev]);
        setActiveChatId(currentId);
      }
    }

    setSuggestions([]);
    setIsLoading(true);

    try {
      const payload = {
        message: input,
        model: effectiveModel,
        ephemeral,
        is_generate: isRegenerate,
        is_silent_retry: isSilentRetry,
        is_clarity: isClarity,
        ...(mapselection ? { mapselection } : (choiceKey && choiceValue ? { mapselection: { key: choiceKey, value: choiceValue } } : {})),
        ...(editMessageId && { edit_message_id: editMessageId }),
        ...(images.length > 0 && { images }),
        ...((isNewSession || ephemeral) ? {} : { conversationId: currentId })
      };

      const { currentConversationApiKey, apiKeys } = useMapStore.getState();
      const activeHeaderKey = currentConversationApiKey || apiKeys.gistda;

      const response = await chatService.sendMessageStream(payload, activeHeaderKey);
      let realIdToSwapLater = response.headers.get("X-Conversation-Id") || response.headers.get("conversation_id");
      const assistantMsg: Message = { role: "assistant", content: "" };

      if (!targetMessageId) {
        if (!ephemeral) setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, messages: [...chat.messages, assistantMsg] } : chat));
        else setEphemeralMessages(prev => [...prev, assistantMsg]);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let buffer = "";
      let currentEvent = CHAT_CONFIG.mapEvents.messageUpdate;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.replace("event: ", "").trim();
              continue;
            }

            if (!line.startsWith("data: ")) continue;

            try {
              const jsonStr = line.replace("data: ", "").trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              const data = JSON.parse(jsonStr);
              const eventType = data.event || currentEvent;

              const realId = data.conversationId || data.conversation_id || data.chat_id || data.chatId;
              if (realId) {
                if (currentId?.startsWith("session_")) {
                  const oldSessionId = currentId;
                  setChats(prev => prev.map(chat => chat.id === oldSessionId ? { ...chat, id: realId } : chat));
                  currentId = realId;
                  setActiveChatId(realId);
                  setPaginationConfig(prev => ({ ...prev, [realId]: { page: 1, hasMore: false } }));
                  const mapStore = useMapStore.getState();
                  if (mapStore.apiKeys.gistda) {
                    mapStore.setSessionKey(realId, mapStore.apiKeys.gistda);
                    mapStore.setcurrentConversationApiKey(mapStore.apiKeys.gistda);
                  }
                }
                if (isNewSession && !realIdToSwapLater && !ephemeral) {
                  realIdToSwapLater = String(realId);
                }
              }

              const streamModel = data.model || data.modelName || data.model_name || data.model_id;
              if (streamModel && eventType !== "vision") {
                setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, model: streamModel } : chat));
              }

              if (data.code === CHAT_CONFIG.mapEvents.missingApiKey || data.needsApiKey) {
                setPendingChat({ input, model, images, options: { ...options, explicitChatId: currentId } });
                openKeyModal();
                setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, messages: chat.messages.filter(m => m.role !== "assistant" || m.content !== "") } : chat));
                reader.cancel();
                return;
              }

              if (eventType === CHAT_CONFIG.mapEvents.layerCatalog && data.layer) {
                const b = data.layer;
                const currentLayers = useMapStore.getState().dynamicLayers;
                const newLayerId = b.layerId || b.styleId || b.basename || b.layerName || `ai-layer-${Date.now()}`;

                if (!currentLayers.some(l => l.id === newLayerId)) {
                  setDynamicLayers([...currentLayers, {
                    id: newLayerId,
                    type: b.type,
                    baseUrl: b.url,
                    layerId: newLayerId,
                    title: b.title,
                    apiProvider: b.url?.includes("vallaris") ? "vallaris" : "gistda",
                    bounds: b.bounds,
                    minzoom: b.minzoom,
                    maxzoom: b.maxzoom
                  }]);
                }
                continue;
              }

              if (eventType === CHAT_CONFIG.mapEvents.mapStyle && (data.availableStyles || data.layers)) {
                useMapStore.getState().recordLayerSnapshot(data.layerId);
                const currentLayers = useMapStore.getState().dynamicLayers; 
                
                let updatedLayers = currentLayers.map(layer => {
                    if (layer.layerId === data.layerId || layer.id === data.layerId) {
                    // ป้องกันคลังสไตล์เดิมโดนล้าง: ถ้าหลังบ้านไม่ส่งมา ให้ใช้ของเดิมที่เลเยอร์เคยมีค้ำไว้ก่อน
                    const receivedStyles = data.availableStyles || layer.availableStyles || [];
                    
                    // ปลดล็อกคีย์สไตล์: ให้ความสำคัญกับ activeStyle หรือ defaultStyle ที่หลังบ้านจงใจสั่งเปลี่ยนมาโดยตรง
                    const baseStyleKey = data.activeStyle || data.defaultStyle || (receivedStyles.length > 0 ? receivedStyles[0].styleKey : 'default');

                    return { 
                        ...layer, 
                        availableStyles: receivedStyles,
                        activeStyleKey: baseStyleKey, // ยอมรับคีย์เปลี่ยนสไตล์ตัวล่าสุดจากหลังบ้านทันที
                        renderStyles: data.layers || layer.renderStyles 
                    };
                    }
                    return layer;
                });

                /*
                updatedLayers = updatedLayers.map(layer => {
                  if (layer.id === "68172e7b171be104cc2be349" || layer.layerId === "68172e7b171be104cc2be349") {
                    return {
                      ...layer,
                      renderStyles: [
                        {
                          "type": "fill",
                          
                          "filter": ["==", ["get", "re_nesdb"], "Northeast"],
                          
                          // "filter": [">=", ["get", "freq"], 7],
                          // "filter": [
                          //   "all",
                          //   ["==", ["get", "re_nesdb"], "Northeast"],
                          //   [">=", ["get", "freq"], 7]
                          // ],

                          "paint": {
                            "fill-color": [
                              "case",
                              ["boolean", ["feature-state", "hover"], false], "#FFFF00",
                              [ 
                                "interpolate",
                                ["linear"],
                                ["get", "freq"],
                                1, "#22C55E",
                                3, "#EAB308",
                                5, "#F97316",
                                7, "#EF4444",
                                10, "#7E22CE"
                              ]
                            ],
                            "fill-opacity": 1,
                            "fill-outline-color": "#ffffff"
                          }
                        }
                      ]
                    };
                  }
                  return layer;
                }); */

                setDynamicLayers(updatedLayers);
                continue;
              }



              if (eventType === CHAT_CONFIG.mapEvents.mapStylePatch || data.event === "map_style_patch") {
                const mapStore = useMapStore.getState();
                mapStore.recordLayerSnapshot(data.layerId);
                const currentLayers = mapStore.dynamicLayers;
                
                const updatedLayers = currentLayers.map(layer => {
                  if (layer.layerId === data.layerId || layer.id === data.layerId) {
                    const newRenderStyles = JSON.parse(JSON.stringify(layer.renderStyles || []));
                    
                    newRenderStyles.forEach((styleObj: any) => {
                      if (styleObj.paint && styleObj.paint[data.paintKey]) {
                        const expr = styleObj.paint[data.paintKey];
                        
                        if (Array.isArray(expr) && data.operation === "update_stops" && data.patches) {
                          const isInterpolate = expr[0] === "interpolate";
                          const isMatch = expr[0] === "match";

                          data.patches.forEach((patch: any) => {
                            let valIdx = -1;
                            const startIdx = isInterpolate ? 3 : isMatch ? 2 : 0;
                            const endLimit = isInterpolate ? expr.length : isMatch ? expr.length - 1 : expr.length;

                            // 1. ค้นหาในลูปเพื่อตรวจสอบว่าค่าจุดนี้มีอยู่แล้วในสไตล์เดิมหรือไม่
                            for (let i = startIdx; i < endLimit; i += 2) {
                              if (expr[i] == patch.attributeValue) {
                                valIdx = i;
                                break;
                              }
                            }

                            if (valIdx !== -1) {
                              // ถ้าเจอค่าเดิมตั้งตั้งอยู่แล้ว ให้ทำการทาสีโค้ดใหม่ทับลงตำแหน่งถัดไปทันที
                              expr[valIdx + 1] = patch.output;
                            } else {
                              // 2. กรณีเป็นค่าใหม่เอี่ยม ให้ทำการสไนเปอร์แทรกตามเงื่อนไขไวยากรณ์แผนที่
                              if (isInterpolate) {
                                let inserted = false;
                                // วนลูปหาจุดแทรกที่ถูกต้อง เพื่อบังคับให้ตัวเลขเรียงจากน้อยไปมากเสมอ
                                for (let i = 3; i < expr.length; i += 2) {
                                  if (Number(patch.attributeValue) < Number(expr[i])) {
                                    expr.splice(i, 0, patch.attributeValue, patch.output);
                                    inserted = true;
                                    break;
                                  }
                                }
                                // ถ้าไม่มีตัวไหนมากกว่าเลย แปลว่าเป็นค่าสูงสุด ให้ดันต่อท้ายอาร์เรย์ได้เลย
                                if (!inserted) {
                                  expr.push(patch.attributeValue, patch.output);
                                }
                              } else if (isMatch) {
                                // ถ้าเป็นสไตล์ประเภท match ให้ทำการแทรกคู่สไตล์ใหม่ไว้ก่อนหน้าตัวแปร Fallback ค้ำท้าย
                                expr.splice(expr.length - 1, 0, patch.attributeValue, patch.output);
                              }
                            }
                          });
                        }
                      }
                    });
                    return { ...layer, renderStyles: newRenderStyles };
                  }
                  return layer;
                });
                
                setDynamicLayers(updatedLayers);
                continue;
              }

              if (eventType === CHAT_CONFIG.mapEvents.mapFilterPatch || data.event === "map_filter_patch") {
                useMapStore.getState().recordLayerSnapshot(data.layerId);
                const currentLayers = useMapStore.getState().dynamicLayers;

                const isSameLayerFamily = (patchType: string, styleType: string) => {
                  if (!patchType || !styleType) return false;
                  const pType = patchType.toLowerCase();
                  const sType = styleType.toLowerCase();

                  if (pType === sType) return true;

                  const polygonGeometryFamily = ["fill", "polygon", "area", "3d", "fill-extrusion", "extrusion"];
                  if (polygonGeometryFamily.includes(pType) && polygonGeometryFamily.includes(sType)) return true;

                  const lineGeometryFamily = ["line", "dashed-line", "polyline"];
                  if (lineGeometryFamily.includes(pType) && lineGeometryFamily.includes(sType)) return true;

                  const pointGeometryFamily = ["circle", "symbol", "heatmap", "point"];
                  if (pointGeometryFamily.includes(pType) && pointGeometryFamily.includes(sType)) return true;

                  return false;
                };

                let matchFound = false;

                const updatedLayers = currentLayers.map(layer => {
                  if (layer.layerId === data.layerId || layer.id === data.layerId) {
                    matchFound = true;

                    const newRenderStyles = JSON.parse(JSON.stringify(layer.renderStyles || []));

                    newRenderStyles.forEach((styleObj: any) => {
                      const matchingPatch = data.patches?.find((patch: any) => 
                        isSameLayerFamily(patch.layerType, styleObj.type || styleObj.layerType)
                      );


                      if (matchingPatch && data.operation === "set_filter") {
                        styleObj.filter = matchingPatch.filter;
                      }
                    });

                    return { ...layer, renderStyles: newRenderStyles };
                  }
                  return layer;
                });

                useMapStore.setState({ dynamicLayers: updatedLayers });
                continue;
              }

              if (eventType === CHAT_CONFIG.mapEvents.mapOptions || data.needInfo || data.choices) {
                const choices = data.choices || data.payload?.choices;
                const key = data.key || data.payload?.key;
                const questionText = data.question || data.payload?.question || "";
                const pagination = data.pagination || data.payload?.pagination;
                const reqOffset = mapselection?.pagination?.offset || 0;

                const updateMsg = (m: Message) => m.role === "assistant" ? {
                  ...m,
                  content: questionText || m.content,
                  choices: choices,
                  choiceKey: key,
                  pagination: pagination ? { ...pagination, offset: reqOffset } : undefined
                } : m;

                if (ephemeral) {
                  setEphemeralMessages(prev => prev.map((m, i) => i === prev.length - 1 ? updateMsg(m) : m));
                } else {
                  setChats(prev => prev.map(c => {
                    if (c.id !== currentId) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m, i) => {
                        const isTarget = targetMessageId ? m.id === targetMessageId : i === c.messages.length - 1;
                        return isTarget && m.role === "assistant" ? updateMsg(m) : m;
                      })
                    };
                  }));
                }
                continue;
              }

              // แผนที่โหมด 4: สั่งเคลียร์เลเยอร์ตามเสียงโหวตของผู้ใช้
              if (eventType === CHAT_CONFIG.mapEvents.mapClear) {
                const mapStore = useMapStore.getState();
                if (data.mode === CHAT_CONFIG.mapClearModes.all) {
                  mapStore.clearLayers();
                } else if (data.mode === CHAT_CONFIG.mapClearModes.selected && data.layerIds) {
                  const filteredLayers = mapStore.dynamicLayers.filter(
                    layer => !data.layerIds.includes(layer.id) && !data.layerIds.includes(layer.layerId)
                  );
                  mapStore.setDynamicLayers(filteredLayers);
                }
                continue;
              }

              // โหมดรับชิปแนะนำคำถามถัดไป (Suggestions chips)
              if (eventType === CHAT_CONFIG.mapEvents.suggestions && data.items) {
                setSuggestions(data.items);
                continue;
              }

              // แมปผูกไอดีข้อความที่แท้จริงแทนข้อความจำลอง
              const incomingUserId = data.usermessage_id || data.userMessageId;
              const incomingAssistantId = data.assistantmessage_Id || data.assistantMessageId;
              if (incomingUserId || incomingAssistantId) {
                setChats(prev => prev.map(chat => {
                  if (chat.id !== currentId) return chat;
                  const safeMsgs = [...chat.messages];
                  if (incomingUserId) {
                    for (let i = safeMsgs.length - 1; i >= 0; i--) {
                      if (safeMsgs[i].role === "user" && (!safeMsgs[i].id || String(safeMsgs[i].id).startsWith("temp_"))) {
                        safeMsgs[i] = { ...safeMsgs[i], id: incomingUserId };
                        break;
                      }
                    }
                  }
                  if (incomingAssistantId) {
                    for (let i = safeMsgs.length - 1; i >= 0; i--) {
                      if (safeMsgs[i].role === "assistant" && (!safeMsgs[i].id || String(safeMsgs[i].id).startsWith("temp_"))) {
                        safeMsgs[i] = { ...safeMsgs[i], id: incomingAssistantId };
                        break;
                      }
                    }
                  }
                  return { ...chat, messages: safeMsgs };
                }));
              }

              const textChunk = data.text || data.content || "";
              accumulatedContent += textChunk;
              const displayContent = accumulatedContent.split("<thinking>").pop()?.trim() || accumulatedContent;

              if (ephemeral) {
                setEphemeralMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: displayContent } : m)); // อัปเดตข้อความชั่วคราวในโหมด Ephemeral
              } else {
                setChats(prev => prev.map(chat => {
                  if (chat.id !== currentId) return chat;
                  const safeMsgs = [...chat.messages];

                  if (targetMessageId) {
                    const targetIdx = safeMsgs.findIndex(m => m.id === targetMessageId);
                    if (targetIdx !== -1) {
                      safeMsgs[targetIdx] = { ...safeMsgs[targetIdx], content: displayContent || safeMsgs[targetIdx].content };
                    }
                  } else {
                    const lastIdx = safeMsgs.length - 1;
                    if (lastIdx >= 0 && safeMsgs[lastIdx].role === "assistant") {
                      safeMsgs[lastIdx] = { ...safeMsgs[lastIdx], content: displayContent || safeMsgs[lastIdx].content };
                    } else {
                      safeMsgs.push({ id: `temp_assistant_${Date.now()}`, role: "assistant", content: displayContent });
                    }
                  }
                  return { ...chat, messages: safeMsgs };
                }));
              }

            } catch (e) {
              console.error("JSON Parse Error inside stream", e);
            }
          }
        }
      }

      // ปิดงานสลับไอดีรอบสุดท้ายตอนจบสตรีม
      if (!ephemeral && isNewSession && realIdToSwapLater) {
        setPaginationConfig(prev => ({ ...prev, [realIdToSwapLater as string]: { page: 1, hasMore: false } }));
        setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, id: realIdToSwapLater as string } : chat));
        setActiveChatId(realIdToSwapLater as string);
        const mapStore = useMapStore.getState();
        if (mapStore.apiKeys.gistda) {
          mapStore.setSessionKey(realIdToSwapLater as string, mapStore.apiKeys.gistda);
          mapStore.setcurrentConversationApiKey(mapStore.apiKeys.gistda);
        }
      }
    } catch (error) {
      console.error("Stream failed processing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    suggestions,
    setSuggestions,
    setIsLoading,
    ephemeralMessages,
    setEphemeralMessages
  };
};
