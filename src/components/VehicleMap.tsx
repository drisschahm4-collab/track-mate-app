import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VehicleData } from '@/hooks/useFlespiData';
import { Loader2 } from 'lucide-react';

interface VehicleMapProps {
  vehicleData: VehicleData | null;
  className?: string;
}

const VehicleMap: React.FC<VehicleMapProps> = ({ vehicleData, className = '' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const defaultPosition: L.LatLngExpression = [48.8566, 2.3522]; // Paris default

  // Create custom icon
  const createIcon = (isOnline: boolean, heading: number = 0) => {
    const color = isOnline ? '#22c55e' : '#ef4444';
    const colorLight = isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    
    return L.divIcon({
      className: 'vehicle-marker-container',
      html: `
        <div class="vehicle-marker" style="transform: rotate(${heading}deg);">
          <div class="marker-pulse" style="background: ${colorLight};"></div>
          <div class="marker-dot" style="background: linear-gradient(135deg, ${color}, ${isOnline ? '#16a34a' : '#dc2626'});"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initialPosition: L.LatLngExpression = vehicleData 
      ? [vehicleData.latitude, vehicleData.longitude]
      : defaultPosition;

    map.current = L.map(mapContainer.current, {
      center: initialPosition,
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    // CartoDB Dark tiles (free, no token needed)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map.current);

    // Create initial marker
    const icon = createIcon(vehicleData?.isOnline ?? false, vehicleData?.heading ?? 0);
    marker.current = L.marker(initialPosition, { icon }).addTo(map.current);

    map.current.whenReady(() => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update marker position and icon when vehicle data changes
  useEffect(() => {
    if (!vehicleData || !marker.current || !map.current) return;

    const newPosition: L.LatLngExpression = [vehicleData.latitude, vehicleData.longitude];
    
    // Update marker position
    marker.current.setLatLng(newPosition);
    
    // Update marker icon
    const icon = createIcon(vehicleData.isOnline, vehicleData.heading ?? 0);
    marker.current.setIcon(icon);
    
    // Smooth pan to new position
    map.current.flyTo(newPosition, map.current.getZoom(), {
      duration: 1,
    });
  }, [vehicleData]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-border/30" />
    </div>
  );
};

export default VehicleMap;
