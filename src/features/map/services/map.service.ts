// src/features/map/services/map.service.ts
import { HAZARD_URLS, HAZARD_TMS_URLS, HAZARD_VECTOR_URLS, mapUrlBuilder } from '../config/map.config';
import { HazardType, TimeRange, MapMode, DynamicLayerPayload } from '../types';

const appendApiKey = (url: string, key?: string) => {
  if (!key) return url;
  return url.includes('?') ? `${url}&api_key=${key}` : `${url}?api_key=${key}`;
};

export const mapService = {
  buildDynamicUrl: (payload: DynamicLayerPayload, userKeys: Record<string, string>): string => {
    const { type, baseUrl, styleId, layerId, apiProvider } = payload;
    
    let key = userKeys.gistda; // ค่าเริ่มต้น
    if (apiProvider === 'vallaris' || baseUrl.includes('vallaris')) {
      key = userKeys.vallaris || userKeys.gistda; 
    }

    const decodedBaseUrl = baseUrl ? decodeURIComponent(baseUrl) : '';

    if (type === 'wms') {
      const targetLayer = layerId || styleId || 'default';
      return `${decodedBaseUrl}?api_key=${key}&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${targetLayer}&STYLES=&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`;
    }

    let cleanUrl = decodedBaseUrl;
    switch (type) {
      case 'tms':     cleanUrl = mapUrlBuilder.tms(decodedBaseUrl); break;
      case 'wmts':    cleanUrl = mapUrlBuilder.wmts(decodedBaseUrl, layerId || styleId || 'default'); break;
      case 'vector':  cleanUrl = mapUrlBuilder.vector(decodedBaseUrl); break;
      case 'geojson': cleanUrl = mapUrlBuilder.geojson(decodedBaseUrl); break;
    }

    return appendApiKey(cleanUrl, key);
  }
};