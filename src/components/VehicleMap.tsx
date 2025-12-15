import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VehicleData } from '@/hooks/useFlespiData';
import { Loader2 } from 'lucide-react';

interface VehicleMapProps {
  vehicleData: VehicleData | null;
  className?: string;
}

// Component to update map center when vehicle moves
const MapUpdater: React.FC<{ position: [number, number] }> = ({ position }) => {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(position, map.getZoom(), { duration: 1 });
  }, [position, map]);
  
  return null;
};

// Create custom animated marker icon
const createVehicleIcon = (isOnline: boolean, heading: number = 0) => {
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

const VehicleMap: React.FC<VehicleMapProps> = ({ vehicleData, className = '' }) => {
  const markerRef = useRef<L.Marker | null>(null);

  const defaultPosition: [number, number] = [48.8566, 2.3522]; // Paris default
  const position: [number, number] = vehicleData 
    ? [vehicleData.latitude, vehicleData.longitude]
    : defaultPosition;

  // Update marker icon when vehicle data changes
  useEffect(() => {
    if (markerRef.current && vehicleData) {
      const icon = createVehicleIcon(vehicleData.isOnline, vehicleData.heading);
      markerRef.current.setIcon(icon);
    }
  }, [vehicleData?.isOnline, vehicleData?.heading]);

  const icon = createVehicleIcon(vehicleData?.isOnline ?? false, vehicleData?.heading ?? 0);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <MapContainer
        center={position}
        zoom={14}
        className="absolute inset-0 z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <Marker 
          position={position} 
          icon={icon}
          ref={markerRef}
        />
        <MapUpdater position={position} />
      </MapContainer>
      <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-border/30 z-10" />
    </div>
  );
};

export default VehicleMap;
