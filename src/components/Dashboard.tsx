import React from 'react';
import { Gauge, Navigation, Clock, MapPin, Battery, Zap } from 'lucide-react';
import { useFlespiData } from '@/hooks/useFlespiData';
import Header from './Header';
import MetricCard from './MetricCard';
import VehicleMap from './VehicleMap';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard: React.FC = () => {
  const { vehicleData, loading, error, lastUpdate, refresh } = useFlespiData(5000);

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCoordinate = (coord: number, type: 'lat' | 'lng') => {
    if (!coord) return '-.----';
    const direction = type === 'lat' 
      ? (coord >= 0 ? 'N' : 'S')
      : (coord >= 0 ? 'E' : 'O');
    return `${Math.abs(coord).toFixed(4)}° ${direction}`;
  };

  if (error && !vehicleData) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="p-4 rounded-full bg-destructive/20 w-fit mx-auto mb-4">
            <Zap className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-display font-bold text-xl text-foreground mb-2">
            Erreur de connexion
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <Header
          isOnline={vehicleData?.isOnline ?? false}
          lastUpdate={lastUpdate}
          onRefresh={refresh}
          loading={loading}
        />

        {/* Map Section */}
        <VehicleMap 
          vehicleData={vehicleData} 
          className="h-[40vh] min-h-[300px] shadow-card"
        />

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && !vehicleData ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl bg-card" />
              ))}
            </>
          ) : (
            <>
              <MetricCard
                icon={Gauge}
                label="Vitesse"
                value={Math.round(vehicleData?.speed ?? 0)}
                unit="km/h"
                variant={
                  (vehicleData?.speed ?? 0) > 120
                    ? 'danger'
                    : (vehicleData?.speed ?? 0) > 80
                    ? 'warning'
                    : 'success'
                }
              />
              <MetricCard
                icon={Navigation}
                label="Direction"
                value={Math.round(vehicleData?.heading ?? 0)}
                unit="°"
              />
              <MetricCard
                icon={Clock}
                label="Dernière trame"
                value={formatTimestamp(vehicleData?.timestamp ?? 0)}
                variant={vehicleData?.isOnline ? 'success' : 'warning'}
              />
              <MetricCard
                icon={Battery}
                label="Batterie"
                value={vehicleData?.batteryLevel ?? '--'}
                unit="%"
                variant={
                  (vehicleData?.batteryLevel ?? 100) < 20
                    ? 'danger'
                    : (vehicleData?.batteryLevel ?? 100) < 50
                    ? 'warning'
                    : 'default'
                }
              />
            </>
          )}
        </div>

        {/* Position Card */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-info/20">
              <MapPin className="h-5 w-5 text-info" />
            </div>
            <h2 className="font-display font-semibold text-foreground">
              Position GPS
            </h2>
          </div>
          {loading && !vehicleData ? (
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 rounded-lg bg-secondary" />
              <Skeleton className="h-12 rounded-lg bg-secondary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                <p className="font-display font-bold text-lg text-foreground">
                  {formatCoordinate(vehicleData?.latitude ?? 0, 'lat')}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                <p className="font-display font-bold text-lg text-foreground">
                  {formatCoordinate(vehicleData?.longitude ?? 0, 'lng')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Connecté à Flespi • Device ID: 5369063
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
