import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapPoint } from '../types';
import { Map as MapIcon, Navigation, Star, Sparkles, Download, Clock } from 'lucide-react';
import { toPng } from 'html-to-image';

// Fix for default marker icons in Leaflet with Webpack/Vite
// Use CDN for reliable icon loading
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Custom Icons for different categories
const createIcon = (color: string) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const attractionsIcon = createIcon('orange');
const restaurantsIcon = createIcon('green');
const hotelsIcon = createIcon('blue');

const getMarkerIcon = (type: string) => {
  switch (type) {
    case 'attraction': return attractionsIcon;
    case 'restaurant': return restaurantsIcon;
    case 'hotel': return hotelsIcon;
    default: return new L.Icon.Default();
  }
};

interface MapDisplayProps {
  points: MapPoint[];
  onViewPanorama?: (url: string, title: string) => void;
  height?: string;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Custom icons for clusters
const createClusterCustomIcon = (cluster: any) => {
  return L.divIcon({
    html: `<div class="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg font-bold text-xs ring-4 ring-indigo-500/20">${cluster.getChildCount()}</div>`,
    className: 'custom-marker-cluster',
    iconSize: L.point(32, 32, true),
  });
};

export default function MapDisplay({ points, onViewPanorama, height = "500px" }: MapDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  if (points.length === 0) return null;

  const center: [number, number] = [points[0].lat, points[0].lng];

  const handleDownload = async () => {
    if (mapRef.current === null) return;

    try {
      // Find and hide the zoom controls before capture
      const controls = mapRef.current.querySelectorAll('.leaflet-control-container');
      controls.forEach(c => (c as HTMLElement).style.display = 'none');

      const dataUrl = await toPng(mapRef.current, {
        cacheBust: true,
        backgroundColor: '#f8fafc',
      });

      // Restore zoom controls
      controls.forEach(c => (c as HTMLElement).style.display = 'block');

      const link = document.createElement('a');
      link.download = `map-itinerary-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture map:', err);
      alert('Không thể tải ảnh bản đồ. Vui lòng thử lại sau.');
    }
  };

  return (
    <div 
      className="w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 relative group" 
      style={{ height }}
      ref={mapRef}
    >
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <ChangeView center={center} />
        <MarkerClusterGroup 
          chunkedLoading 
          iconCreateFunction={createClusterCustomIcon}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
        >
          {points.map((point, idx) => (
            <Marker 
              key={idx} 
              position={[point.lat, point.lng]}
              icon={getMarkerIcon(point.type)}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                      point.type === 'attraction' ? 'bg-orange-100 text-orange-700' :
                      point.type === 'restaurant' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {point.type}
                    </span>
                    <div className="flex items-center gap-0.5 text-xs font-bold text-slate-900">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {point.rating}
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{point.name}</h3>
                  {point.openingHours && (
                    <p className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 mb-1">
                      <Clock className="w-2.5 h-2.5" />
                      {point.openingHours}
                    </p>
                  )}
                  <p className="text-slate-500 text-[10px] leading-relaxed mb-3">{point.description}</p>
                  {point.userReview && (
                    <div className="mb-3 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-2 h-2 ${star <= point.userReview!.rating ? 'fill-emerald-500 text-emerald-500' : 'text-emerald-200'}`} />
                          ))}
                        </div>
                        <span className="text-[8px] font-bold text-emerald-700">Đánh giá của bạn</span>
                      </div>
                      <p className="text-[9px] text-emerald-800 italic">"{point.userReview.comment}"</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {onViewPanorama && point.preview360Url && (
                      <button 
                        onClick={() => onViewPanorama(point.preview360Url!, point.name)}
                        className="flex items-center justify-center gap-2 w-full py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        Xem Panorama 360°
                      </button>
                    )}
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      Chỉ đường
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      
      {/* Map Actions Overlay */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={handleDownload}
          className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-900 hover:bg-white hover:scale-105 transition-all"
          title="Tải ảnh bản đồ"
        >
          <Download className="w-4 h-4 text-indigo-600" />
          Tải Bản Đồ
        </button>
      </div>
    </div>
  );
}
