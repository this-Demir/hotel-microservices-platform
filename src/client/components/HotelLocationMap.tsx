'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 15)
  }, [map, lat, lng])
  return null
}

const pinIcon = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#4f46e5;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 10px rgba(79,70,229,0.5)"></div>`,
  className: '',
  iconAnchor: [11, 11],
  iconSize: [22, 22],
})

interface Props {
  lat: number
  lng: number
}

export function HotelLocationMap({ lat, lng }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={false}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <RecenterMap lat={lat} lng={lng} />
      <Marker position={[lat, lng]} icon={pinIcon} />
    </MapContainer>
  )
}
