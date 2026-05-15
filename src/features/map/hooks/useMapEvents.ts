import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/store/useMapStore';

export const useMapEvents = (
  map: maplibregl.Map | null,
  selectedData: any,
  setSelectedData: (data: any) => void
) => {
  const { dynamicLayers } = useMapStore();
  
  const highlightedFeature = useRef<{ id: string | number; source: string; sourceLayer: string } | null>(null);
  const isPopupOpen = useRef(false);

  useEffect(() => {
    isPopupOpen.current = !!selectedData;

    if (!selectedData && highlightedFeature.current && map) {
      if (map.getSource(highlightedFeature.current.source)) {
        map.setFeatureState(highlightedFeature.current, { hover: false });
        highlightedFeature.current = null;
      }
    }
  }, [selectedData, map]);

  useEffect(() => {
    if (!map) return;

    const clearHighlight = () => {
      if (highlightedFeature.current && map.getSource(highlightedFeature.current.source)) {
        map.setFeatureState(highlightedFeature.current, { hover: false });
        highlightedFeature.current = null;
      }
    };

    const targetLayerIds = dynamicLayers.flatMap(layer => [
      `ai-layer-${layer.id}-fill`,
      `ai-layer-${layer.id}-line`,
      `ai-layer-${layer.id}-point`,
      `ai-layer-${layer.id}-fill-extrusion` // <--- เติมลูกพี่ 3D เข้ามาตรงนี้ครับ
    ]);

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const activeLayers = targetLayerIds.filter(id => map.getLayer(id));
      
      if (activeLayers.length === 0) {
        setSelectedData(null);
        return;
      }

      const features = map.queryRenderedFeatures(e.point, { layers: activeLayers });

      if (features.length > 0) {
        const feature = features[0];
        const fId = feature.id ?? feature.properties._id;

        if (fId !== undefined) {
          clearHighlight();
          highlightedFeature.current = { id: fId, source: feature.source, sourceLayer: feature.sourceLayer! };
          map.setFeatureState(highlightedFeature.current, { hover: true });

          setSelectedData({
            properties: feature.properties,
            lngLat: e.lngLat,
            point: e.point 
          });
        }
      } else {
        setSelectedData(null);
        clearHighlight(); 
      }
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (isPopupOpen.current) return;

      const activeLayers = targetLayerIds.filter(id => map.getLayer(id));
      if (activeLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, { layers: activeLayers });

      if (features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        const feature = features[0];
        const fId = feature.id ?? feature.properties._id;

        if (fId !== undefined) {
          if (highlightedFeature.current?.id !== fId) {
            clearHighlight();
            highlightedFeature.current = { id: fId, source: feature.source, sourceLayer: feature.sourceLayer! };
            map.setFeatureState(highlightedFeature.current, { hover: true });
          }
        }
      } else {
        map.getCanvas().style.cursor = '';
        clearHighlight();
      }
    };

    const handleMouseOut = () => {
      if (!isPopupOpen.current) {
        map.getCanvas().style.cursor = '';
        clearHighlight();
      }
    };

    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    map.on('mouseout', handleMouseOut);

    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
    };
  }, [map, dynamicLayers, setSelectedData]); 
};