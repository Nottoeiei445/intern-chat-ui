// src/features/map/services/map.service.ts
import { HAZARD_URLS, HAZARD_TMS_URLS, HAZARD_VECTOR_URLS, mapUrlBuilder } from '../config/map.config';
import { HazardType, TimeRange, MapMode, DynamicLayerPayload } from '../types';

const appendApiKey = (url: string, key?: string) => {
  if (!key) return url;
  return url.includes('?') ? `${url}&api_key=${key}` : `${url}?api_key=${key}`;
};

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

  buildDynamicUrl: (payload: DynamicLayerPayload, userKeys: Record<string, string>): string => {
    const { type, baseUrl, layerId, apiProvider } = payload;
    
    let key = userKeys.gistda; // ค่าเริ่มต้น
    if (apiProvider === 'vallaris' || baseUrl.includes('vallaris')) {
      key = userKeys.vallaris || userKeys.gistda; 
    }

    if (type === 'wms') {
      return `${baseUrl}?api_key=${key}&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${layerId || ''}&STYLES=&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`;
    }

    let cleanUrl = baseUrl;
    switch (type) {
      case 'tms':     cleanUrl = mapUrlBuilder.tms(baseUrl); break;
      case 'vector':  cleanUrl = mapUrlBuilder.vector(baseUrl); break;
      case 'geojson': cleanUrl = mapUrlBuilder.geojson(baseUrl); break;
    }

    return appendApiKey(cleanUrl, key);
  }
};