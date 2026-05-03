import React, { useState } from 'react';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface PanoramaViewerProps {
  imageUrl: string; // This is now a Google Maps embed URL
  onClose: () => void;
  title: string;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ imageUrl, onClose, title }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Extract lat/lng from URL if possible for external link fallback
  const extractLatLng = (url: string) => {
    const match = url.match(/cbll=([-.\d]+),([-.\d]+)/);
    return match ? { lat: match[1], lng: match[2] } : null;
  };

  const coords = extractLatLng(imageUrl);
  const externalMapsUrl = coords 
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="h-16 px-8 bg-zinc-900 border-b border-white/10 flex items-center justify-between z-10 shrink-0 shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Chế Độ Tương Tác Ảo
          </span>
          <h2 className="text-white text-lg font-bold tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href={externalMapsUrl} 
            target="_blank" 
            rel="noreferrer"
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-all"
          >
            Mở Trong Google Maps
            <ExternalLink className="w-3 h-3" />
          </a>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-grow w-full h-full relative bg-zinc-950 overflow-hidden">
        {!imageUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-30 bg-zinc-950 px-8 text-center">
            <div className="p-4 bg-orange-500/10 rounded-full">
              <AlertCircle className="w-12 h-12 text-orange-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Thiếu Dữ Liệu Panorama</h3>
              <p className="text-sm text-white/50 max-w-sm leading-relaxed">
                Không có dữ liệu hình ảnh 360° cho vị trí này.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
            >
              Quay Lại Hành Trình
            </button>
          </div>
        )}

        {imageUrl && loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 bg-zinc-950">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <div className="space-y-1 text-center">
              <p className="text-xs font-bold text-white uppercase tracking-widest">Đang Vào Không Gian Ảo</p>
              <p className="text-[10px] text-white/30 uppercase tracking-tighter">Thiết Lập Đường Truyền Nhúng Bảo Mật</p>
            </div>
          </div>
        )}

        {imageUrl && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-30 bg-zinc-950 px-8 text-center">
            <div className="p-4 bg-orange-500/10 rounded-full">
              <AlertCircle className="w-12 h-12 text-orange-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Xem Trước Bị Hạn Chế</h3>
              <p className="text-sm text-white/50 max-w-sm leading-relaxed">
                Việc nhúng Google Street View bị hạn chế đối với vị trí hoặc tọa độ này.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="px-6 py-3 border border-white/20 hover:border-white/40 text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Quay Lại Hành Trình
              </button>
              <a 
                href={externalMapsUrl} 
                target="_blank" 
                rel="noreferrer"
                className="px-6 py-3 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
              >
                Xem Trên Google Maps
              </a>
            </div>
          </div>
        )}

        {imageUrl && (
          <iframe
            src={imageUrl}
            className={`w-full h-full border-none transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            title={title}
          />
        )}
        
        {/* Subtle Overlay Badge */}
        {imageUrl && !loading && !error && (
          <div className="absolute bottom-8 left-8 p-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl max-w-xs pointer-events-none">
            <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] mb-1 font-bold">Điều Khiển Tương Tác</p>
            <p className="text-xs text-white leading-relaxed font-medium">Sử dụng chuột hoặc cảm ứng để xoay 360° và khám phá xung quanh.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PanoramaViewer;
