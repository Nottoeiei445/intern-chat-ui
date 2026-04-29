import { HAZARD_URLS, HAZARD_TMS_URLS, HAZARD_VECTOR_URLS, mapUrlBuilder, MAP_KEYS } from '../config/map.config';
import { HazardType, TimeRange, MapMode, DynamicLayerPayload } from '../types';

export const mapService = {
  getTileUrls: (mode: MapMode, type: HazardType, days: TimeRange): string[] => {
    const urlMap: any = {
      tms: HAZARD_TMS_URLS,
      vector: HAZARD_VECTOR_URLS,
      wms: HAZARD_URLS
    };
    return urlMap[mode]?.[type]?.[days] || [];
  },

  getSourceLayer: (type: HazardType, days: TimeRange): string => {
    if (type === 'viirs' && days === 30) return '69d4508818ed1b4c3857abe0';
    return 'default';
  },

  getLayerStyle: (type: HazardType) => {
    const colors: Record<string, string> = {
      viirs: '#ef4444', 
      flood: '#3b82f6', 
      drought: '#f59e0b' 
    };
    return colors[type] || '#cccccc';
  },

  buildDynamicUrl: (payload: DynamicLayerPayload): string => {
    const { type, baseUrl, layerId, apiProvider } = payload;
    
    // เลือกกุญแจตาม Provider
    let key = MAP_KEYS.gistda;
    if (apiProvider === 'vallaris') key = MAP_KEYS.vallaris;
    else if (type === 'vector') key = MAP_KEYS.vector;

    switch (type) {
      case 'tms':     return mapUrlBuilder.tms(baseUrl, key);
      case 'wms':     return mapUrlBuilder.wms(baseUrl, layerId || '', key);
      case 'vector':  return mapUrlBuilder.vector(baseUrl, key);
      case 'geojson': return mapUrlBuilder.geojson(baseUrl, key);
      default:        return baseUrl;
    }
  }
};