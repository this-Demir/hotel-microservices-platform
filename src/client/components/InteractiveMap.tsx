'use client'

import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SearchResultItem } from '@/lib/types'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>'

function groupByHotel(items: SearchResultItem[]) {
  const map = new Map<string, { item: SearchResultItem; lat: number; lng: number }>()
  for (const item of items) {
    if (item.latitude == null || item.longitude == null) continue
    const existing = map.get(item.hotelId)
    if (!existing || item.price < existing.item.price)
      map.set(item.hotelId, { item, lat: item.latitude, lng: item.longitude })
  }
  return [...map.values()]
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export interface InteractiveMapProps {
  items: SearchResultItem[]
  hoveredId: string | null
  selectedId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string | null) => void
  isLoggedIn: boolean
  onView: (hotelId: string) => void
}

export function InteractiveMap({
  items, hoveredId, selectedId,
  onHover, onSelect, isLoggedIn, onView,
}: InteractiveMapProps) {
  const elRef    = useRef<HTMLDivElement>(null)
  const mapRef   = useRef<L.Map | null>(null)
  const mrkRef   = useRef<Record<string, L.Marker>>({})
  const popRef   = useRef<L.Popup | null>(null)

  // keep latest callbacks in refs so marker event handlers never cause map re-init
  const onHoverRef    = useRef(onHover)
  const onSelectRef   = useRef(onSelect)
  const onViewRef     = useRef(onView)
  const loggedInRef   = useRef(isLoggedIn)
  useEffect(() => { onHoverRef.current  = onHover   }, [onHover])
  useEffect(() => { onSelectRef.current = onSelect  }, [onSelect])
  useEffect(() => { onViewRef.current   = onView    }, [onView])
  useEffect(() => { loggedInRef.current = isLoggedIn }, [isLoggedIn])

  // ── 1. create map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { zoomControl: true, scrollWheelZoom: true, worldCopyJump: true })
    map.setView([25, 10], 2)
    L.tileLayer(TILE_URL, { subdomains: 'abcd', maxZoom: 19, attribution: TILE_ATTR }).addTo(map)
    map.on('click', () => onSelectRef.current(null))
    mapRef.current = map

    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }))
    ro.observe(elRef.current!)
    const t = setTimeout(() => map.invalidateSize({ animate: false }), 250)
    return () => {
      clearTimeout(t)
      ro.disconnect()
      map.remove()
      mapRef.current = null
      mrkRef.current = {}
      popRef.current = null
    }
  }, [])

  // ── 2. render markers when items / login state change ──────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.values(mrkRef.current).forEach((m) => map.removeLayer(m))
    mrkRef.current = {}

    const grouped = groupByHotel(items)
    const coords: [number, number][] = []

    grouped.forEach(({ item, lat, lng }) => {
      coords.push([lat, lng])
      const displayPrice = isLoggedIn ? Math.round(item.price * 0.85) : item.price
      const icon = L.divIcon({
        className: 'price-pin-wrap',
        html: `<div class="price-pin">${fmt(displayPrice)}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })
      const marker = L.marker([lat, lng], { icon, riseOnHover: true }).addTo(map)
      const id = item.hotelId
      marker.on('click', (e) => { e.originalEvent?.stopPropagation(); onSelectRef.current(id) })
      marker.on('mouseover', () => onHoverRef.current(id))
      marker.on('mouseout',  () => onHoverRef.current(null))
      mrkRef.current[id] = marker
    })

    if (coords.length > 1) {
      const b = L.latLngBounds(coords)
      if (b.isValid()) map.fitBounds(b, { padding: [70, 70], maxZoom: 6, animate: true })
    } else if (coords.length === 1) {
      map.flyTo(coords[0], 11, { duration: 0.8 })
    }
  }, [items, isLoggedIn])

  // ── 3. hover state → CSS class on pin DOM ─────────────────────────────
  useEffect(() => {
    Object.entries(mrkRef.current).forEach(([id, marker]) => {
      marker.getElement()?.querySelector('.price-pin')?.classList.toggle('is-hovered', hoveredId === id)
    })
  }, [hoveredId])

  // ── 4. selected state → CSS class + popup ────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.entries(mrkRef.current).forEach(([id, marker]) => {
      marker.getElement()?.querySelector('.price-pin')?.classList.toggle('is-selected', selectedId === id)
    })

    if (popRef.current) { map.closePopup(popRef.current); popRef.current = null }
    if (!selectedId) return

    const entry = groupByHotel(items).find((g) => g.item.hotelId === selectedId)
    if (!entry) return

    const { item, lat, lng } = entry
    const memberPrice = Math.round(item.price * 0.85)
    const priceHtml = isLoggedIn
      ? `<div class="stay-pop-price-strike">${fmt(item.price)}</div>
         <div class="stay-pop-price-main is-member">${fmt(memberPrice)}</div>`
      : `<div class="stay-pop-price-main">${fmt(item.price)}</div>`
    const imgHtml = item.hotelImageUrl
      ? `<img src="${item.hotelImageUrl}" alt="" />`
      : `<div style="width:100%;height:130px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px">No image</div>`

    const content = `
      <div class="stay-pop">
        ${imgHtml}
        <div class="stay-pop-body">
          <div class="stay-pop-row"><div class="stay-pop-name">${item.hotelName}</div></div>
          <div class="stay-pop-loc">📍 ${item.location}</div>
          <div class="stay-pop-foot">
            <div>${priceHtml}<div class="stay-pop-per">per night</div></div>
            <button type="button" class="stay-pop-view">View details</button>
          </div>
        </div>
      </div>`

    map.panTo([lat, lng], { animate: true, duration: 0.4 })
    const popup = L.popup({
      closeButton: true, autoClose: false, closeOnClick: false,
      className: 'stayease-popup', offset: [0, -10],
      maxWidth: 260, minWidth: 260,
    }).setLatLng([lat, lng]).setContent(content).openOn(map)
    popRef.current = popup

    setTimeout(() => {
      const btn = popup.getElement()?.querySelector('.stay-pop-view') as HTMLButtonElement | null
      if (btn) btn.onclick = (e) => { e.stopPropagation(); onViewRef.current(selectedId) }
    }, 0)
    popup.on('remove', () => {
      if (popRef.current === popup) popRef.current = null
      onSelectRef.current(null)
    })
  }, [selectedId, items, isLoggedIn])

  const pinCount = useMemo(() => groupByHotel(items).length, [items])

  return (
    <div className="relative w-full h-full">
      <div ref={elRef} className="absolute inset-0 rounded-2xl ring-1 ring-slate-200 overflow-hidden z-0" />

      {pinCount > 0 && (
        <div className="absolute top-4 right-16 z-[400] pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-md text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {pinCount} {pinCount === 1 ? 'stay' : 'stays'} on map
          </div>
        </div>
      )}

      {items.length > 0 && pinCount === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 text-slate-500 text-sm pointer-events-none z-[1000] rounded-2xl">
          <div className="text-3xl mb-2">📍</div>
          No location data — add coordinates via the admin panel
        </div>
      )}
    </div>
  )
}
