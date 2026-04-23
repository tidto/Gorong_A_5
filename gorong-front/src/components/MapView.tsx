import React from 'react'
import { MapPin, Navigation } from 'lucide-react'

interface PathPoint {
  lat: number
  lng: number
  label?: string
}

interface MapViewProps {
  path?: PathPoint[]
  center?: PathPoint
  zoom?: number
  markerColor?: string
  className?: string
}

/**
 * MapView Component
 * 
 * Displays a map with event location and path visualization.
 * In a real implementation, this would use Kakao Map API, Google Maps, or Naver Maps.
 * For now, it shows a placeholder map with path visualization capability.
 * 
 * Props:
 * - path: Array of path points to draw curved line or cat paw prints
 * - center: Center coordinates of the map
 * - zoom: Zoom level
 * - markerColor: Color of markers
 * - className: Additional CSS classes
 */
export default function MapView({
  path = [
    { lat: 37.5665, lng: 126.978, label: '출발지' },
    { lat: 37.5572, lng: 126.9944, label: '도착지' },
  ],
  center = { lat: 37.561843, lng: 126.986122 },
  zoom = 15,
  markerColor = 'orange',
  className = '',
}: MapViewProps) {
  // Placeholder map - 실제로는 지도 라이브러리 사용
  return (
    <div className={`map-container bg-gray-100 flex items-center justify-center relative overflow-hidden ${className}`}>
      {/* 배경 격자무늬 효과 */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* 경로 시각화 SVG */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* 경로 선 - 곡선 */}
        {path.length > 1 && (
          <path
            d={`M ${(path[0].lng * 10) % 400} ${(path[0].lat * 10) % 256} Q ${(((path[0].lng + path[1].lng) / 2) * 10) % 400} ${(((path[0].lat + path[1].lat) / 2 - 5) * 10) % 256} ${(path[1].lng * 10) % 400} ${(path[1].lat * 10) % 256}`}
            stroke="#f97316"
            strokeWidth="2"
            fill="none"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        )}

        {/* 마커 포인트들 */}
        {path.map((point, idx) => (
          <g key={idx}>
            {/* 고양이 발자국 효과 */}
            <circle
              cx={(point.lng * 10) % 400}
              cy={(point.lat * 10) % 256}
              r="6"
              fill={markerColor === 'orange' ? '#f97316' : '#0ea5e9'}
              opacity="0.8"
            />
            <circle
              cx={(point.lng * 10) % 400}
              cy={(point.lat * 10) % 256}
              r="8"
              fill="none"
              stroke={markerColor === 'orange' ? '#f97316' : '#0ea5e9'}
              strokeWidth="1"
              opacity="0.4"
            />
          </g>
        ))}
      </svg>

      {/* 중앙에 현재 위치 표시 */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="w-5 h-5 bg-primary-500 rounded-full shadow-lg border-2 border-white"></div>
          <div className="absolute w-8 h-8 border-2 border-primary-400 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
        </div>
      </div>

      {/* 범례 및 정보 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow p-3 z-10 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
          <span className="text-gray-700">경로</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">Zoom: {zoom}</span>
        </div>
      </div>

      {/* 현재 위치 버튼 */}
      <button className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
        <Navigation className="w-5 h-5 text-primary-500" />
      </button>

      {/* 범례 정보 - 경로 포인트 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow p-3 z-10 max-w-xs">
        <div className="text-xs space-y-1">
          {path.map((point, idx) => (
            <div key={idx} className="flex items-center gap-2 text-gray-700">
              <span className="inline-block w-2 h-2 bg-primary-500 rounded-full"></span>
              <span>{point.label || `포인트 ${idx + 1}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
