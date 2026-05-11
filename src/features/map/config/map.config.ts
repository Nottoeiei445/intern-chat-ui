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

  geojson: (baseUrl: string) => baseUrl
};

const getTmsUrl = (baseUrl: string, _layerId: string) => mapUrlBuilder.tms(baseUrl);
const getWmsUrl = (baseUrl: string, layerId: string) => mapUrlBuilder.wms(baseUrl, layerId);
const getVectorUrl = (baseUrl: string) => mapUrlBuilder.vector(baseUrl);

export const HAZARD_TMS_URLS: Record<HazardType, Record<TimeRange, string[]>> = {
  viirs: {
    1: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/1day/tms", "66c9a32c6f57db87573b8035")],
    3: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/3days/tms", "66c9a4cf1096e529d686a3d2")],
    7: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/7days/tms", "66c9a588ef0689bff43a581b")],
    30: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/30days/tms", "66c9a62bb16bb6c473603222")],
  },
  flood: {
    1: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood-freq/tms", "676e3c965e01949dda35fa23")],
    3: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/3days/tms", "676e3d66d710b3b9a64a503e")],
    7: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/7days/tms", "673bffd740c0fc078a820adb")],
    30: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/30days/tms", "673c0081a9d1a551eebff626")],
  },
  drought: {
    1: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/1day/tms", "0")],
    3: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/ndwi/7days/tms", "6799acf27966ebcdded074a8")],
    7: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/dri/7days/tms", "6799acce8d739fff9dacee2f")],
    30: [getTmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/30days/tms", "0")],
  }
};

export const HAZARD_URLS: Record<HazardType, Record<TimeRange, string[]>> = {
  viirs: {
    1: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/1day/wms", "66c9a32c6f57db87573b8035")],
    3: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/3days/wms", "66c9a4cf1096e529d686a3d2")],
    7: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/7days/wms", "66c9a588ef0689bff43a581b")],
    30: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/30days/wms", "66c9a62bb16bb6c473603222")],
  },
  flood: {
    1: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood-freq/wms", "6799ab8c6f832362f99030e6")],
    3: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/3days/wms", "676e3d66d710b3b9a64a503e")],
    7: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/7days/wms", "673bffd740c0fc078a820adb")],
    30: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/30days/wms", "673c0081a9d1a551eebff626")],
  },
  drought: {
    1: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/1day/wms", "0")],
    3: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/ndwi/7days/wms", "6799acf27966ebcdded074a8")],
    7: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/dri/7days/wms", "6799acce8d739fff9dacee2f")],
    30: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/30days/wms", "0")],
  }
};

export const HAZARD_VECTOR_URLS: Record<HazardType, Record<TimeRange, string[]>> = {
  viirs: {
    1: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/1day/tiles')],
    3: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/3days/tiles')],
    7: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/7days/tiles')],
    30: [getVectorUrl('https://vallaris.dragonfly.gistda.or.th/core/api/tiles/1.0-beta/tiles/69d4508818ed1b4c3857abe0')],
  },
  flood: {
    1: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood-freq/tiles')],
    3: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/3days/tiles')],
    7: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/7days/tiles')],
    30: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/30days/tiles')],
  },
  drought: {
    1: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/1day/tiles')],
    3: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/ndwi/7days/tiles')],
    7: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/dri/7days/tiles')],
    30: [getVectorUrl('https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/30days/tiles')],
  },
};

export const PROVINCE_GEOJSON_URL = `https://app.vallarismaps.com/core/api/features/1.1/collections/69e99410cacd2e5010722e28/items`;
export const DISTRICT_GEOJSON_URL = `https://app.vallarismaps.com/core/api/features/1.1/collections/69e9a9c0da828e8ffc6d535e/items`;