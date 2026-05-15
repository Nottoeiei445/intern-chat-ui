// src/features/map/hooks/useDynamicLayers.ts
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { DynamicLayerPayload } from '../types';
import { mapService } from '../services/map.service';
import { useMapStore } from '@/store/useMapStore';

export const useDynamicLayers = (map: maplibregl.Map | null, dynamicLayers: DynamicLayerPayload[]) => {
  const { apiKeys, hiddenLayers, isBaseMapVisible } = useMapStore();
  const activeLayerIds = useRef<string[]>([]);

  useEffect(() => {
    if (!map) return;

    // ฟังก์ชันล้างเลเยอร์
    const clearLayers = () => {
      if (!map) return; 
      try {
        if (!map.getStyle || !map.getStyle()) return;
        activeLayerIds.current.forEach(id => {
          if (id.startsWith('ai-layer-') && map.getLayer(id)) map.removeLayer(id);
        });
        activeLayerIds.current.forEach(id => {
          if (id.startsWith('ai-source-') && map.getSource(id)) map.removeSource(id);
        });
      } catch (error) {
        console.warn("MapLibre: แผนที่ถูกทำลายไปแล้ว ข้ามการลบเลเยอร์");
      } finally {
        activeLayerIds.current = [];
      }
    };

    // ฟังก์ชันสร้างและวาดเลเยอร์
    const renderLayers = () => {
      if (!map.getStyle()) return; 

      dynamicLayers.forEach(layerConfig => {
        try {
          const sourceId = `ai-source-${layerConfig.id}`;
          const layerId = `ai-layer-${layerConfig.id}`;
          const fullUrl = mapService.buildDynamicUrl(layerConfig, apiKeys);

          if (!map.getSource(sourceId)) {
            if (layerConfig.type === 'wms' || layerConfig.type === 'tms'|| layerConfig.type === 'wmts' || layerConfig.type === 'coverage_tile') {
              const titleSize = layerConfig.type === 'wmts' ? 512 : 256;
              map.addSource(sourceId, { type: 'raster', tiles: [fullUrl], tileSize: titleSize });
            } 
            else if (layerConfig.type === 'vector' || layerConfig.type === 'vector_tile') {
              map.addSource(sourceId, {
                type: 'vector',
                tiles: [fullUrl], 
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

          if (!map.getLayer(layerId) && !map.getLayer(`${layerId}-fill`)) {
            if (layerConfig.type === 'wms' || layerConfig.type === 'tms' || layerConfig.type === 'wmts' || layerConfig.type === 'coverage_tile') {
              map.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: { 'raster-opacity': layerConfig.style?.opacity || 0.8 }
              });
              if (!activeLayerIds.current.includes(layerId)) activeLayerIds.current.push(layerId);
            } 
            else if (layerConfig.type === 'vector' || layerConfig.type === 'vector_tile') {
              const sourceLayerId = layerConfig.layerId || 'default';
              
              const hasAiStyle = layerConfig.renderStyles && layerConfig.renderStyles.length > 0;
              const appliedFlag = `${layerId}-ai-applied`;

              // กรณีมีสไตล์ส่งมาจาก AI
              if (hasAiStyle && !activeLayerIds.current.includes(appliedFlag)) {
                
                // ลบ fallback เดิมทิ้งก่อน
                ['fill', 'line', 'point'].forEach(suffix => {
                  const fId = `${layerId}-${suffix}`;
                  if (map.getLayer(fId)) map.removeLayer(fId);
                });

                // สร้างเลเยอร์ใหม่จากข้อมูล style ที่คัดกรองแล้ว
                layerConfig.renderStyles?.forEach((styleObj: any) => {
                  let suffix = 'fill';
                  if (styleObj.type === 'line') suffix = 'line';
                  else if (['circle', 'symbol', 'heatmap'].includes(styleObj.type)) suffix = 'point';
                  
                  const aiLayerId = `${layerId}-${suffix}`;

                  if (!map.getLayer(aiLayerId)) {
                    // โครงสร้างบังคับใช้ของ Frontend ทั้งหมด
                    const layerParams: any = {
                      id: aiLayerId,
                      type: styleObj.type || 'fill',
                      source: sourceId,
                      'source-layer': sourceLayerId
                    };

                    // รับเฉพาะ paint เท่านั้น ข้อมูลอื่นทิ้ง
                    if (styleObj.paint && Object.keys(styleObj.paint).length > 0) {
                      layerParams.paint = styleObj.paint;
                    }

                    map.addLayer(layerParams);
                    if (!activeLayerIds.current.includes(aiLayerId)) activeLayerIds.current.push(aiLayerId);
                  }
                });

                activeLayerIds.current.push(appliedFlag);
              } 
              // กรณีข้อมูลสตรีมแรก ยังไม่มีสไตล์ 
              else if (!hasAiStyle && !map.getLayer(`${layerId}-fill`)) {
                const fillLayerId = `${layerId}-fill`;
                map.addLayer({
                  id: fillLayerId,
                  type: 'fill',
                  source: sourceId,
                  'source-layer': sourceLayerId,
                  filter: ['==', ['geometry-type'], 'Polygon'],
                  paint: { 
                    'fill-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#facc15', '#069c0b'], 
                    'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.6],   
                    'fill-outline-color': '#ffffff'
                  }
                });

                const lineLayerId = `${layerId}-line`;
                map.addLayer({
                  id: lineLayerId,
                  type: 'line',
                  source: sourceId,
                  'source-layer': sourceLayerId,
                  filter: ['==', ['geometry-type'], 'LineString'],
                  paint: { 
                    'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#facc15', '#3b82f6'],
                    'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 4, 2] 
                  }
                });

                const pointLayerId = `${layerId}-point`;
                map.addLayer({
                  id: pointLayerId,
                  type: 'heatmap',
                  source: sourceId,
                  'source-layer': sourceLayerId,
                  filter: ['==', ['geometry-type'], 'Point'],
                  "paint": {
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

                // ซูมเข้าพื้นที่เมื่อโหลดแบบ fallback
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
          }
        } catch (error) {
          console.error(`[Map] Failed to add dynamic layer ${layerConfig.id}:`, error);
        }
      });
    };

    // เริ่มทำงานครั้งแรกที่ Data มา
    clearLayers();
    renderLayers();

    // ดักจับเวลามีการเปลี่ยน Style ของ Base Map
    const handleStyleData = () => {
      if (!map.getStyle()) return;
      const isMissingSources = dynamicLayers.some(layer => !map.getSource(`ai-source-${layer.id}`));
      if (isMissingSources) renderLayers();
    };
    
    map.on('styledata', handleStyleData);
    return () => {
      map.off('styledata', handleStyleData);
      clearLayers(); 
    };

  }, [map, dynamicLayers, apiKeys]); 


  useEffect(() => {
    // เช็คก่อนว่าแผนที่พร้อมไหม
    if (!map || !map.getStyle()) return;

    dynamicLayers.forEach(layer => {
      const visibility = hiddenLayers.includes(layer.id) ? 'none' : 'visible';
      const targetLayerIds = [
        `ai-layer-${layer.id}`, 
        `ai-layer-${layer.id}-fill`, 
        `ai-layer-${layer.id}-line`, 
        `ai-layer-${layer.id}-point` 
      ];

      targetLayerIds.forEach(targetId => {
        if (map.getLayer(targetId)) {
          map.setLayoutProperty(targetId, 'visibility', visibility);
        }
      });
    });

    const style = map.getStyle();
    if (style && style.layers) {
      style.layers.forEach(layer => {
        if (!layer.id.startsWith('ai-layer-')) {
          const visibility = isBaseMapVisible ? 'visible' : 'none';
          if (map.getLayer(layer.id)) {
            map.setLayoutProperty(layer.id, 'visibility', visibility);
          }
        }
      });
    }

  }, [map, dynamicLayers, hiddenLayers, isBaseMapVisible]);
};