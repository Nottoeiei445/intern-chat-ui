// src/features/map/services/map.service.ts
import { HAZARD_URLS, HAZARD_TMS_URLS, HAZARD_VECTOR_URLS } from '../config/map.config';
import { HazardType, TimeRange, MapMode } from '../types';

export const mapService = {
  /**
   * Retrieves the appropriate tile URLs based on mode and parameters
   */
  getTileUrls: (mode: MapMode, type: HazardType, days: TimeRange): string[] => {
    const urlMap = {
      tms: HAZARD_TMS_URLS,
      vector: HAZARD_VECTOR_URLS,
      wms: HAZARD_URLS
    };

    const urls = urlMap[mode]?.[type]?.[days];
    return urls || [];
  },

  /**
   * Identifies the correct source-layer ID for vector tiles
   */
  getSourceLayer: (type: HazardType, days: TimeRange): string => {
    // Specifically for Vallaris 30-day VIIRS or other vector sources
    if (type === 'viirs' && days === 30) return '69d4508818ed1b4c3857abe0';
    return 'default';
  },

  /**
   * Returns styling configuration based on hazard type
   */
  getLayerStyle: (type: HazardType) => {
    const colors = {
      viirs: '#ef4444', // Red
      flood: '#3b82f6', // Blue
      drought: '#f59e0b' // Orange
    };
    return colors[type] || '#cccccc';
  },

  getProvinces: async () => {
    const url = "https://app.vallarismaps.com/core/api/features/1.1/collections/69e99410cacd2e5010722e28/items?api_key=nFQPAxZz4PAUh1Fo3kK5GE5uRQw8Nsf4M2A0xCb1JaGCmsm4eGTFFba0WiBBd37F";
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch provinces");
      return await response.json();
    } catch (error) {
      console.error("MapService Error:", error);
      return null;
    }
  }

};