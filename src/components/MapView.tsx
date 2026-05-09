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

  // Initialize map
  useEffect(() => {
    if (!loaded || !containerRef.current) return
    const L = (window as any).L
    if (!L) return

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
    }).setView([center.lat, center.lng], zoom)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    // Click handler
    if (onMapClick) {
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng)
      })
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [loaded, onMapClick])

  // Update view when center or zoom changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], zoom)
    }
  }, [center.lat, center.lng, zoom])

  // Update markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const L = (window as any).L
    if (!L) return

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer.options && layer.options.icon) {
        map.removeLayer(layer)
      }
    })

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
        html: `<div class="premium-marker" style="
          width:36px;height:36px;border-radius:50%;
          background:rgba(5, 30, 14, 0.8);
          border:2px solid ${c};
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
          box-shadow:0 0 15px ${c};
          position:relative;top:-18px;left:-18px;
        ">
          <div class="marker-pulse" style="
            position:absolute;inset:-4px;border-radius:50%;
            border:2px solid ${c};opacity:0.6;
            animation: marker-pulse 2s infinite;
          "></div>
          ${m.emoji}
        </div>`,
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
  }, [markers, loaded])

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

      <style jsx global>{`
        .leaflet-control-attribution {
          background: rgba(5, 30, 14, 0.8) !important;
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 10px !important;
          backdrop-filter: blur(5px);
        }
        .leaflet-control-attribution a {
          color: #5ec482 !important;
        }
        .leaflet-bar {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: rgba(5, 30, 14, 0.8) !important;
          color: #5ec482 !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-bar a:hover {
          background-color: rgba(10, 50, 20, 0.9) !important;
          color: #fff !important;
        }
        
        @keyframes marker-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
