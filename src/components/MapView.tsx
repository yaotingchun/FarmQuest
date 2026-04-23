'use client'

import { useEffect, useRef, useState } from 'react'

export interface MapMarker {
  lat: number
  lng: number
  label: string
  emoji: string
  popup?: string
  color?: 'green' | 'blue' | 'orange' | 'red' | 'gold'
}

interface MapViewProps {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  height?: string
  onMapClick?: (lat: number, lng: number) => void
}

/**
 * Leaflet map loaded via CDN — no npm install needed.
 * Works with Next.js SSR by only running in the browser.
 */
export default function MapView({ center, zoom = 13, markers = [], height = '300px', onMapClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)

  // Load Leaflet CSS + JS from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already loaded
    if ((window as any).L) {
      setLoaded(true)
      return
    }

    // Load CSS
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    // Load JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)

    return () => {
      // Don't remove — other instances may use it
    }
  }, [])

  // Initialize / update map
  useEffect(() => {
    if (!loaded || !containerRef.current) return
    const L = (window as any).L
    if (!L) return

    // Destroy previous map
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
    }).setView([center.lat, center.lng], zoom)

    // Dark-themed tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)

    // Add markers
    markers.forEach(m => {
      const colorMap: Record<string, string> = {
        green: '#5ec482',
        blue: '#60a5fa',
        orange: '#f97316',
        red: '#f87171',
        gold: '#fbbf24',
      }
      const c = colorMap[m.color || 'green'] || '#5ec482'

      const icon = L.divIcon({
        className: 'fq-map-marker',
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:${c};
          border:3px solid rgba(255,255,255,0.9);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
          box-shadow:0 2px 8px rgba(0,0,0,0.4), 0 0 12px ${c}55;
          position:relative;top:-16px;left:-16px;
        ">${m.emoji}</div>`,
        iconSize: [0, 0],
      })

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map)
      if (m.popup || m.label) {
        marker.bindPopup(`
          <div style="font-family:Satoshi,sans-serif;font-size:13px;color:#1a1a2e;min-width:120px;">
            <strong>${m.emoji} ${m.label}</strong>
            ${m.popup ? `<br/><span style="color:#555;font-size:12px;">${m.popup}</span>` : ''}
          </div>
        `)
      }
    })

    // Click handler
    if (onMapClick) {
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng)
      })
    }

    mapRef.current = map

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [loaded, center.lat, center.lng, zoom, markers, onMapClick])

  return (
    <div style={{
      borderRadius: '14px',
      overflow: 'hidden',
      border: '1px solid var(--glass-border)',
      background: 'var(--bg-deep)',
      position: 'relative',
      zIndex: 0,
    }}>
      <div ref={containerRef} style={{ height, width: '100%' }} />
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: '0.85rem',
          background: 'var(--glass-bg)',
        }}>
          Loading map...
        </div>
      )}
    </div>
  )
}
