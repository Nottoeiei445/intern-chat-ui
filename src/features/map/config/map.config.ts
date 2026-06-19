// src/features/map/config/map.config.ts
import { HazardType, TimeRange } from '../types';

export const mapUrlBuilder = {
  tms: (baseUrl: string) => {
    const hasTiles = baseUrl.includes('{z}');
    return hasTiles 
      ? baseUrl 
      : (baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`) + '{z}/{x}/{y}';
  },

  wms: (baseUrl: string, layerId: string) => 
    `${baseUrl}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${layerId}&STYLES=&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`,  
 
  wmts: (baseUrl: string, layerId: string) => {
    if (baseUrl.includes('{z}') || baseUrl.includes('%7Bz%7D')) {
      return decodeURIComponent(baseUrl);
    }
    if (baseUrl.includes('vallaris')) {
      const cleanBase = baseUrl.replace(/\/$/, '');
      return `${cleanBase}/{z}/{x}/{y}.png`;
    }
    return `${baseUrl}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layerId}&STYLE=default&FORMAT=image/png&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;
  },

  vector: (baseUrl: string) => {
    const hasTiles = baseUrl.includes('{z}');
    return hasTiles 
      ? baseUrl 
      : (baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`) + '{z}/{x}/{y}';
  },

  geojson: (baseUrl: string) => baseUrl,

  coverage_tile: (baseUrl: string) => {
    const hasTiles = baseUrl.includes('{z}');
    return hasTiles 
      ? baseUrl 
      : (baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`) + '{z}/{x}/{y}';
  },

  pmtiles: (baseUrl: string) => {
    if (!baseUrl) return '';
    return baseUrl.startsWith('pmtiles://') ? baseUrl : `pmtiles://${baseUrl}`;
  }

};

export const MAP_CONFIG = {
  // API Configuration
  endpoints: {
    analytics: {
      datasources: (connectionId: string) => `/core/api/analytics/1.0/connections/${connectionId}/datasources`,
      columns: (connectionId: string, datasourceId: string) => `/core/api/analytics/1.0/connections/${connectionId}/datasources/${datasourceId}/columns`,
      explore: "/core/api/analytics/1.0/explore"
    }
  },
};
