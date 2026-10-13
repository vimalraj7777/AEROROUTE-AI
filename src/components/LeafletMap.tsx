import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GraphEdge } from '../types';

interface MapWaypoint {
  iata: string;
  lat: number;
  lon: number;
  name: string;
  weather_risk?: number;
  congestion_index?: number;
}

interface MapProps {
  waypoints?: MapWaypoint[];
  activeRoute?: string[];
  alternativeRoutes?: { name: string; path: string[]; color: string }[];
  corridors?: GraphEdge[];
  legendType?: 'route' | 'network';
  selectedAirport?: string | null;
  onAirportClick?: (iata: string) => void;
  height?: string;
  zoom?: number;
  center?: [number, number];
}

export const LeafletMap: React.FC<MapProps> = ({
  waypoints = [],
  activeRoute = [],
  alternativeRoutes = [],
  corridors = [],
  legendType = 'route',
  selectedAirport,
  onAirportClick,
  height = '420px',
  zoom = 4,
  center = [39.8283, -98.5795],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });
    map.attributionControl.setPosition('topright');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.stop();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Waypoints & Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layersRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const nodeCoords: Record<string, [number, number]> = {};
    waypoints.forEach((wp) => {
      nodeCoords[wp.iata] = [wp.lat, wp.lon];
    });

    corridors.forEach((corridor) => {
      const from = nodeCoords[corridor.from];
      const to = nodeCoords[corridor.to];
      if (!from || !to) return;

      const line = L.polyline([from, to], {
        color: '#475569',
        weight: 1,
        opacity: 0.55,
      });
      line.bindTooltip(`<div class="font-mono text-xs">${corridor.from} → ${corridor.to}</div>`);
      layerGroup.addLayer(line);
    });

    // 1. Plot Waypoint Nodes
    waypoints.forEach((wp) => {
      const isSelected = selectedAirport === wp.iata;
      const isInActiveRoute = activeRoute.includes(wp.iata);

      // Color coding by weather risk
      const riskColor =
        (wp.weather_risk || 0) > 50 ? '#ef4444' : (wp.weather_risk || 0) > 30 ? '#f59e0b' : '#06b6d4';

      const circle = L.circleMarker([wp.lat, wp.lon], {
        radius: isSelected ? 8 : isInActiveRoute ? 7 : 5,
        color: isSelected ? '#ffffff' : isInActiveRoute ? '#38bdf8' : riskColor,
        weight: isSelected ? 2.5 : 1.5,
        fillColor: isInActiveRoute ? '#0284c7' : '#0f172a',
        fillOpacity: 0.85,
      });

      // Tooltip with technical info
      circle.bindTooltip(
        `<div class="font-mono text-xs">
          <strong>${wp.iata}</strong> (${wp.name})<br/>
          METAR Risk: ${wp.weather_risk ?? 'N/A'}/100<br/>
          Congestion: ${wp.congestion_index ?? 'N/A'}%
        </div>`,
        { direction: 'top', className: 'aviation-map-tooltip' }
      );

      circle.on('click', () => {
        if (onAirportClick) onAirportClick(wp.iata);
      });

      layerGroup.addLayer(circle);

      // Node label
      const icon = L.divIcon({
        className: 'custom-map-label',
        html: `<div class="font-mono text-[9px] font-bold text-slate-300 drop-shadow-md select-none pointer-events-none">${wp.iata}</div>`,
        iconSize: [28, 14],
        iconAnchor: [14, -6],
      });
      const marker = L.marker([wp.lat, wp.lon], { icon, interactive: false });
      layerGroup.addLayer(marker);
    });

    // 2. Plot Alternative Routes (Dashed Lines)
    alternativeRoutes.forEach((alt) => {
      const latlngs: [number, number][] = [];
      alt.path.forEach((code) => {
        if (nodeCoords[code]) latlngs.push(nodeCoords[code]);
      });
      if (latlngs.length >= 2) {
        const poly = L.polyline(latlngs, {
          color: alt.color || '#64748b',
          weight: 2,
          opacity: 0.6,
          dashArray: '5, 8',
        });
        poly.bindTooltip(`<div class="font-mono text-xs">${alt.name}</div>`);
        layerGroup.addLayer(poly);
      }
    });

    // 3. Plot Active Recommended Route (Solid Cyan Glow Line)
    if (activeRoute.length >= 2) {
      const activeCoords: [number, number][] = [];
      activeRoute.forEach((code) => {
        if (nodeCoords[code]) activeCoords.push(nodeCoords[code]);
      });

      if (activeCoords.length >= 2) {
        // Outer glow
        const glow = L.polyline(activeCoords, {
          color: '#06b6d4',
          weight: 5,
          opacity: 0.35,
        });
        layerGroup.addLayer(glow);

        // Core line
        const coreLine = L.polyline(activeCoords, {
          color: '#38bdf8',
          weight: 2.5,
          opacity: 0.95,
        });
        layerGroup.addLayer(coreLine);

        // Fit bounds to active route
        try {
          map.fitBounds(coreLine.getBounds(), { padding: [50, 50], maxZoom: 6, animate: false });
        } catch (e) {
          // ignore fit error if coordinates identical
        }
      }
    }
  }, [waypoints, activeRoute, alternativeRoutes, selectedAirport, corridors]);

  return (
    <div className="relative w-full rounded border border-slate-800 bg-[#070a0f] overflow-hidden">
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />
      <div className="absolute bottom-2 right-2 z-10 bg-slate-950/80 border border-slate-800/80 px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 pointer-events-none flex items-center gap-3">
        {legendType === 'network' ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Directed Corridor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Airport Hub
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> High Weather Risk
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Recommended Corridor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Alternative
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> High Weather Risk
            </span>
          </>
        )}
      </div>
    </div>
  );
};
