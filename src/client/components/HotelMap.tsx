'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SearchResultItem } from '@/lib/types'

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!coords.length) return
    if (coords.length === 1) {
      map.setView(coords[0], 13)
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] })
    }
  }, [map, coords])
  return null
}

function createPriceIcon(price: number) {
  return L.divIcon({
    html: `<div style="background:#4f46e5;color:#fff;padding:5px 11px;border-radius:20px;font-size:13px;font-weight:700;white-space:nowrap;box-shadow:0 2px 10px rgba(79,70,229,0.45);border:2px solid #fff;cursor:pointer">$${Math.round(price)}</div>`,
    className: '',
    iconAnchor: [35, 16],
    iconSize: [70, 32],
  })
}

interface Props {
  items: SearchResultItem[]
  onPick?: (hotelId: string) => void
}

export function HotelMap({ items, onPick }: Props) {
  const hotels = useMemo(() => {
    const map = new Map<string, { item: SearchResultItem; lat: number; lng: number }>()
    for (const item of items) {
      if (item.latitude == null || item.longitude == null) continue
      const existing = map.get(item.hotelId)
      if (!existing || item.price < existing.item.price)
        map.set(item.hotelId, { item, lat: item.latitude, lng: item.longitude })
    }
    return [...map.values()]
  }, [items])

  const coords: [number, number][] = hotels.map((h) => [h.lat, h.lng])

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden ring-1 ring-slate-200">
      <MapContainer
        center={[20, 20]}
        zoom={2}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FitBounds coords={coords} />
        {hotels.map(({ item, lat, lng }) => (
          <Marker
            key={item.hotelId}
            position={[lat, lng]}
            icon={createPriceIcon(item.price)}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{item.hotelName}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.roomType}</div>
                <div style={{ fontWeight: 700, color: '#4f46e5', marginTop: 4 }}>${item.price}<span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11 }}>/night</span></div>
                {onPick && (
                  <button
                    onClick={() => onPick(item.hotelId)}
                    style={{ marginTop: 8, width: '100%', padding: '6px 0', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    View Hotel
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {items.length > 0 && hotels.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 text-slate-500 text-sm pointer-events-none z-[1000]">
          <div className="text-3xl mb-2">📍</div>
          No location data yet — add coordinates via the admin panel
        </div>
      )}

      {hotels.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000] px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-md text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          {hotels.length} hotel{hotels.length !== 1 ? 's' : ''} on map
        </div>
      )}
    </div>
  )
}
