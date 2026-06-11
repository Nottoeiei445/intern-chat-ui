// src/features/map/hooks/useDynamicLayers.ts
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { DynamicLayerPayload } from '../types';
import { mapService } from '../services/map.service';
import { useMapStore } from '@/store/useMapStore';

export const useDynamicLayers = (map: maplibregl.Map | null, dynamicLayers: DynamicLayerPayload[]) => {
  const { apiKeys, hiddenLayers, isBaseMapVisible , currentConversationApiKey} = useMapStore();
  const activeLayerIds = useRef<string[]>([]);

  const hiddenLayersRef = useRef(hiddenLayers);
  const isBaseMapVisibleRef = useRef(isBaseMapVisible);
  
  useEffect(() => { hiddenLayersRef.current = hiddenLayers; }, [hiddenLayers]);
  useEffect(() => { isBaseMapVisibleRef.current = isBaseMapVisible; }, [isBaseMapVisible]);

  useEffect(() => {
    if (!map) return;

    const masterApiKey = currentConversationApiKey || apiKeys.vallaris || apiKeys.gistda;

    const renderLayers = () => {
      if (!map.getStyle()) {
        return; 
      }

      dynamicLayers.forEach(layerConfig => {
        try {
          const sourceId = `ai-source-${layerConfig.id}`;
          const layerId = `ai-layer-${layerConfig.id}`;
          
          const isVallarisLayer = layerConfig.apiProvider === 'vallaris' || layerConfig.baseUrl.includes('vallaris');
          
          if (isVallarisLayer && !masterApiKey) {
            return; 
          }

          const effectiveApiKeys = {
            ...apiKeys,
            vallaris: masterApiKey,
            gistda: masterApiKey
          };

          const fullUrl = mapService.buildDynamicUrl(layerConfig, effectiveApiKeys);

          if (!map.getSource(sourceId)) {
            if (layerConfig.type === 'wms' || layerConfig.type === 'tms'|| layerConfig.type === 'wmts' || layerConfig.type === 'coverage_tile') {
              const titleSize = layerConfig.type === 'wmts' ? 512 : 256;
              map.addSource(sourceId, { type: 'raster', tiles: [fullUrl], tileSize: titleSize });
            } 
            else if (layerConfig.type === 'vector' || layerConfig.type === 'vector_tile' || layerConfig.type === 'pmtiles') {
              const isPmtiles = layerConfig.type === 'pmtiles';

              map.addSource(sourceId, {
                type: 'vector',
                ...(isPmtiles 
                  ? { url: fullUrl } 
                  : { tiles: [fullUrl] }
                ),
                promoteId: '_id', 
                ...(layerConfig.minzoom !== undefined && { minzoom: layerConfig.minzoom }),
                ...(layerConfig.maxzoom !== undefined && { maxzoom: layerConfig.maxzoom }),
                ...(layerConfig.bounds && { bounds: layerConfig.bounds })
              });
            }
            else if (layerConfig.type === 'geojson') {
              map.addSource(sourceId, { type: 'geojson', data: fullUrl });
            }
            if (!activeLayerIds.current.includes(sourceId)) activeLayerIds.current.push(sourceId);
          } 

          // แอด Layer ปกติ 
          if (layerConfig.type === 'wms' || layerConfig.type === 'tms' || layerConfig.type === 'wmts' || layerConfig.type === 'coverage_tile') {
            if (!map.getLayer(layerId)) {
              map.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: { 'raster-opacity': layerConfig.style?.opacity || 0.8 }
              });
              if (!activeLayerIds.current.includes(layerId)) activeLayerIds.current.push(layerId);
            }
          } 
          else if (layerConfig.type === 'vector' || layerConfig.type === 'vector_tile' || layerConfig.type === 'pmtiles') {
            const sourceLayerId = layerConfig.layerId || 'default';
            const hasAvailableStyles = layerConfig.availableStyles && layerConfig.availableStyles.length > 0;
            const hasAiStyle = hasAvailableStyles || (layerConfig.renderStyles && layerConfig.renderStyles.length > 0);
            const currentStyleKey = layerConfig.activeStyleKey || 'default';

            let stylesToRender: any[] = [];
            if (layerConfig.renderStyles && layerConfig.renderStyles.length > 0) {
              stylesToRender = layerConfig.renderStyles;
            } else if (hasAvailableStyles) {
              const selected = layerConfig.availableStyles?.find(s => s.styleKey === currentStyleKey) 
                               || layerConfig.availableStyles?.[0];
              if (selected) {
                stylesToRender = Array.isArray(selected.layers) ? selected.layers 
                               : Array.isArray(selected.renderConfig) ? selected.renderConfig 
                               : [selected.renderConfig].filter(Boolean);
              }
            }

            if (hasAiStyle && stylesToRender.length > 0) {
              const styleSignature = JSON.stringify(stylesToRender);
              const appliedFlag = `${layerId}-ai-applied-${currentStyleKey}-${styleSignature}`;

              if (!activeLayerIds.current.includes(appliedFlag)) {
                ['fill', 'line', 'point', 'fill-extrusion'].forEach(suffix => {
                  const fId = `${layerId}-${suffix}`;
                  if (map.getLayer(fId)) map.removeLayer(fId);
                });
                if (map.getLayer(`${layerId}-fill`)) map.removeLayer(`${layerId}-fill`);
                if (map.getLayer(`${layerId}-line`)) map.removeLayer(`${layerId}-line`);
                if (map.getLayer(`${layerId}-point`)) map.removeLayer(`${layerId}-point`);

                activeLayerIds.current = activeLayerIds.current.filter(id => 
                  id !== `${layerId}-fill` && 
                  id !== `${layerId}-line` && 
                  id !== `${layerId}-point` && 
                  id !== `${layerId}-fill-extrusion` &&
                  !id.startsWith(`${layerId}-ai-applied-`)
                );

                stylesToRender.forEach((styleObj: any) => {
                  let suffix = 'fill';
                  if (styleObj.type === 'line' || styleObj.layerType === 'line') suffix = 'line';
                  else if (['circle', 'symbol', 'heatmap'].includes(styleObj.type || styleObj.layerType)) suffix = 'point';
                  else if (styleObj.type === 'fill-extrusion' || styleObj.layerType === 'fill-extrusion') suffix = 'fill-extrusion';
                  
                  const aiLayerId = `${layerId}-${suffix}`;

                  if (!map.getLayer(aiLayerId)) {
                    const layerParams: any = {
                      id: aiLayerId,
                      type: styleObj.type || styleObj.layerType || 'fill',
                      source: sourceId,
                      'source-layer': sourceLayerId
                    };
                    if (styleObj.paint && Object.keys(styleObj.paint).length > 0) layerParams.paint = styleObj.paint;
                    if (styleObj.layout && Object.keys(styleObj.layout).length > 0) layerParams.layout = styleObj.layout;
                    if (styleObj.filter) layerParams.filter = styleObj.filter;

                    map.addLayer(layerParams);
                    if (!activeLayerIds.current.includes(aiLayerId)) activeLayerIds.current.push(aiLayerId);
                  }
                });

                activeLayerIds.current.push(appliedFlag);
              } 

              stylesToRender.forEach((styleObj: any) => {
                let suffix = 'fill';
                if (styleObj.type === 'line' || styleObj.layerType === 'line') suffix = 'line';
                else if (['circle', 'symbol', 'heatmap'].includes(styleObj.type || styleObj.layerType)) suffix = 'point';
                else if (styleObj.type === 'fill-extrusion' || styleObj.layerType === 'fill-extrusion') suffix = 'fill-extrusion';
                
                const aiLayerId = `${layerId}-${suffix}`;
                if (map.getLayer(aiLayerId)) {
                  map.setFilter(aiLayerId, styleObj.filter || null);
                }
              });
            } 
            else if (!map.getLayer(`${layerId}-fill`) && !map.getLayer(`${layerId}-line`) && !map.getLayer(`${layerId}-point`)) {
              const fillLayerId = `${layerId}-fill`;
              map.addLayer({
                id: fillLayerId, type: 'fill', source: sourceId, 'source-layer': sourceLayerId,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: { 
                  'fill-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#facc15', '#069c0b'], 
                  'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.6],   
                  'fill-outline-color': '#ffffff'
                }
              });

              const lineLayerId = `${layerId}-line`;
              map.addLayer({
                id: lineLayerId, type: 'line', source: sourceId, 'source-layer': sourceLayerId,
                filter: ['==', ['geometry-type'], 'LineString'],
                paint: { 
                  'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#facc15', '#3b82f6'],
                  'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 4, 2] 
                }
              });

              const pointLayerId = `${layerId}-point`;
              map.addLayer({
                id: pointLayerId, type: 'heatmap', source: sourceId, 'source-layer': sourceLayerId,
                filter: ['==', ['geometry-type'], 'Point'],
                paint: {
                  "heatmap-weight": 1,
                  "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
                  "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(255,255,255,0)", 0.2, "rgb(254,204,92)", 0.5, "rgb(240,59,32)", 1, "rgb(189,0,38)"],
                  "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 5, 9, 15],
                  "heatmap-opacity": 0.8
                }
              });

              if (!activeLayerIds.current.includes(fillLayerId)) activeLayerIds.current.push(fillLayerId);
              if (!activeLayerIds.current.includes(lineLayerId)) activeLayerIds.current.push(lineLayerId);
              if (!activeLayerIds.current.includes(pointLayerId)) activeLayerIds.current.push(pointLayerId);

              if (layerConfig.bounds) map.fitBounds(layerConfig.bounds, { padding: 50, duration: 1500 });
            }
          }
          else if (layerConfig.type === 'geojson') {
            map.addLayer({
              id: layerId,
              type: 'line', 
              source: sourceId,
              paint: { 'line-color': '#0000ff', 'line-width': 2 }
            });
            if (!activeLayerIds.current.includes(layerId)) activeLayerIds.current.push(layerId);
          }
        } catch (error) {
          console.error(`[Map Exception Block] Failed to add dynamic layer ${layerConfig.id}:`, error);
        }
      });
    };

    const reorderMapLayers = () => {
      if (!map.getStyle()) return;
      for (let i = dynamicLayers.length - 1; i >= 0; i--) {
        const layerConfig = dynamicLayers[i];
        const layerId = `ai-layer-${layerConfig.id}`;
        
        const targetLayerIds = [layerId, `${layerId}-fill`, `${layerId}-line`, `${layerId}-point`, `${layerId}-fill-extrusion`];
        targetLayerIds.forEach(targetId => {
          if (map.getLayer(targetId)) map.moveLayer(targetId); 
        });
      }
    };

    // Garbage Collection 
    const currentConfigIds = dynamicLayers.map(l => l.id);
    const idsToRemove = activeLayerIds.current.filter(id => {
      const configId = id.replace('ai-layer-', '').replace('ai-source-', '').split('-')[0];
      return configId && !currentConfigIds.includes(configId);
    });

    idsToRemove.forEach(id => {
      if (id.startsWith('ai-layer-') && map.getLayer(id)) map.removeLayer(id);
    });
    idsToRemove.forEach(id => {
      if (id.startsWith('ai-source-') && map.getSource(id)) map.removeSource(id);
    });

    activeLayerIds.current = activeLayerIds.current.filter(id => !idsToRemove.includes(id));

    renderLayers();
    reorderMapLayers();

    const handleStyleData = () => {
      if (!map.getStyle()) return;
      const isMissingSources = dynamicLayers.some(layer => !map.getSource(`ai-source-${layer.id}`));
      
      if (isMissingSources) {
        activeLayerIds.current = [];
        renderLayers();
        reorderMapLayers();

        dynamicLayers.forEach(layer => {
          const visibility = hiddenLayersRef.current.includes(layer.id) ? 'none' : 'visible';
          const targetLayerIds = [`ai-layer-${layer.id}`, `ai-layer-${layer.id}-fill`, `ai-layer-${layer.id}-line`, `ai-layer-${layer.id}-point`, `ai-layer-${layer.id}-fill-extrusion`];
          targetLayerIds.forEach(targetId => {
            if (map.getLayer(targetId)) map.setLayoutProperty(targetId, 'visibility', visibility);
          });
        });

        const style = map.getStyle();
        if (style && style.layers) {
          style.layers.forEach(l => {
            if (!l.id.startsWith('ai-layer-')) {
              const visibility = isBaseMapVisibleRef.current ? 'visible' : 'none';
              if (map.getLayer(l.id)) map.setLayoutProperty(l.id, 'visibility', visibility);
            }
          });
        }
      }
    };
    
    map.on('styledata', handleStyleData);
    return () => { map.off('styledata', handleStyleData); };

  }, [map, dynamicLayers, apiKeys, currentConversationApiKey]); 

  // ควบคุมการแสดงผล/ซ่อนเลเยอร์ ปกติ
  useEffect(() => {
    if (!map || !map.getStyle()) return;

    dynamicLayers.forEach(layer => {
      const visibility = hiddenLayers.includes(layer.id) ? 'none' : 'visible';
      const targetLayerIds = [`ai-layer-${layer.id}`, `ai-layer-${layer.id}-fill`, `ai-layer-${layer.id}-line`, `ai-layer-${layer.id}-point`, `ai-layer-${layer.id}-fill-extrusion`];
      targetLayerIds.forEach(targetId => {
        if (map.getLayer(targetId)) map.setLayoutProperty(targetId, 'visibility', visibility);
      });
    });

    const style = map.getStyle();
    if (style && style.layers) {
      style.layers.forEach(layer => {
        if (!layer.id.startsWith('ai-layer-')) {
          const visibility = isBaseMapVisible ? 'visible' : 'none';
          if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, 'visibility', visibility);
        }
      });
    }
  }, [map, dynamicLayers, hiddenLayers, isBaseMapVisible]);
};