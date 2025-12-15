import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { VehicleData } from '@/hooks/useFlespiData';
import { Loader2 } from 'lucide-react';

interface VehicleMapProps {
  vehicleData: VehicleData | null;
  className?: string;
}

const VehicleMap: React.FC<VehicleMapProps> = ({ vehicleData, className = '' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const { token, loading: tokenLoading, error: tokenError } = useMapboxToken();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;

    const initialCenter: [number, number] = vehicleData 
      ? [vehicleData.longitude, vehicleData.latitude]
      : [2.3522, 48.8566]; // Paris default

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: 14,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'vehicle-marker';
    el.innerHTML = `
      <div class="marker-pulse"></div>
      <div class="marker-dot"></div>
    `;
    el.style.cssText = `
      position: relative;
      width: 40px;
      height: 40px;
    `;

    const pulseStyle = el.querySelector('.marker-pulse') as HTMLElement;
    if (pulseStyle) {
      pulseStyle.style.cssText = `
        position: absolute;
        width: 40px;
        height: 40px;
        background: rgba(34, 197, 94, 0.3);
        border-radius: 50%;
        animation: pulse-ring 2s ease-out infinite;
      `;
    }

    const dotStyle = el.querySelector('.marker-dot') as HTMLElement;
    if (dotStyle) {
      dotStyle.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(34, 197, 94, 0.5);
      `;
    }

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse-ring {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    marker.current = new mapboxgl.Marker({ element: el })
      .setLngLat(initialCenter)
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Update marker position
  useEffect(() => {
    if (!vehicleData || !marker.current || !map.current) return;

    const newPos: [number, number] = [vehicleData.longitude, vehicleData.latitude];
    
    marker.current.setLngLat(newPos);
    
    // Smooth pan to new position
    map.current.easeTo({
      center: newPos,
      duration: 1000,
    });

    // Update marker color based on online status
    const markerEl = marker.current.getElement();
    const dot = markerEl.querySelector('.marker-dot') as HTMLElement;
    const pulse = markerEl.querySelector('.marker-pulse') as HTMLElement;
    
    if (dot && pulse) {
      if (vehicleData.isOnline) {
        dot.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        pulse.style.background = 'rgba(34, 197, 94, 0.3)';
      } else {
        dot.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        pulse.style.background = 'rgba(239, 68, 68, 0.3)';
      }
    }

    // Rotate marker based on heading
    if (vehicleData.heading) {
      markerEl.style.transform = `rotate(${vehicleData.heading}deg)`;
    }
  }, [vehicleData]);

  if (tokenLoading) {
    return (
      <div className={`flex items-center justify-center bg-card rounded-xl ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className={`flex items-center justify-center bg-card rounded-xl ${className}`}>
        <p className="text-destructive text-sm">Erreur carte: {tokenError}</p>
      </div>
    );
  }

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
