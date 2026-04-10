export type TimeRange = 1 | 3 | 7 | 30;
export type HazardType = 'fire' | 'flood' | 'drought';

const API_KEY = "cqMfCJJVIxufW1IRd4zQhWyHPhVGIEnk6KRAzdXlXtgedEb7OlqSLcsm8tV5mhsi";

const getWmsUrl = (baseUrl: string, layerId: string) => {
  // 🚀 ใช้ตัวพิมพ์ใหญ่ทั้งหมด (SERVICE, REQUEST, LAYERS) ตามมาตรฐานที่ QGIS ใช้
  return `${baseUrl}?api_key=${API_KEY}&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${layerId}&STYLES=&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`;
};

export const HAZARD_URLS: Record<HazardType, Record<TimeRange, string[]>> = {
  fire: {
    // ใช้รหัสที่เฮียหามาได้จาก QGIS/XML (66c9a62bb16bb6c473603222)
    1: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/1days/wms", "66c9a32c6f57db87573b8035")],
    3: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/3days/wms", "66c9a4cf1096e529d686a3d2")],
    7: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/7days/wms", "66c9a588ef0689bff43a581b")],
    30: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/viirs/30days/wms", "66c9a62bb16bb6c473603222")],
  },
  flood: {
    1: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/1days/wms", "0")],
    3: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/3days/wms", "0")],
    7: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/7days/wms", "0")],
    30: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/flood/30days/wms", "0")],
  },
  drought: {
    1: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/1days/wms", "0")],
    3: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/3days/wms", "0")],
    7: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/7days/wms", "0")],
    30: [getWmsUrl("https://api-gateway.gistda.or.th/api/2.0/resources/maps/drought/30days/wms", "0")],
  }
};