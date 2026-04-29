// src/features/map/services/map.service.ts
import { HAZARD_URLS, HAZARD_TMS_URLS, HAZARD_VECTOR_URLS } from '../config/map.config';
import { HazardType, TimeRange, MapMode } from '../types';

export const mapService = {

  getTileUrls: (mode: MapMode, type: HazardType, days: TimeRange): string[] => {
    const urlMap = {
      tms: HAZARD_TMS_URLS,
      vector: HAZARD_VECTOR_URLS,
      wms: HAZARD_URLS
    };

    const urls = urlMap[mode]?.[type]?.[days];
    return urls || [];
  },


  getSourceLayer: (type: HazardType, days: TimeRange): string => {
    if (type === 'viirs' && days === 30) return '69d4508818ed1b4c3857abe0';
    return 'default';
  },

  getLayerStyle: (type: HazardType) => {
    const colors = {
      viirs: '#ef4444', // Red
      flood: '#3b82f6', // Blue
      drought: '#f59e0b' // Orange
    };
    return colors[type] || '#cccccc';
  },
};