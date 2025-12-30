import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFlespiData } from '@/hooks/useFlespiData';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useUserImei } from '@/hooks/useUserImei';
import { useVehicleResolver } from '@/hooks/useVehicleResolver';
import { assignPrivacyPlugin } from '@/integrations/flespi';
import { Battery, Clock, Gauge, MapPin, Navigation, Zap, Car, Building2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from './Header';
import MetricCard from './MetricCard';
import VehicleMap from './VehicleMap';

const Dashboard: React.FC = () => {
  const { userEmail, username, sub, groups, attributes, signOut } = useAuth();
  const { imei, setImei } = useUserImei(username);

  // ===== Vehicle Resolver (DvD -> User -> Company) =====
  const {
    loading: vehicleResolverLoading,
    vehicles: resolvedVehicles,
    selectedVehicle,
    selectVehicle,
    diagnostics,
    resolve: refreshVehicleResolver,
  } = useVehicleResolver(sub, groups);

  const attributeImei = attributes?.['custom:imei'] || attributes?.imei || attributes?.['custom:device_imei'];
  
  // Priority: selectedVehicle.imei > localStorage imei > cognito attribute > numeric username
  const resolvedImei = selectedVehicle?.imei || imei || attributeImei || (username && /^\d{8,20}$/.test(username) ? username : undefined);
  
  const [imeiSource, setImeiSource] = useState<'storage' | 'username' | 'cognito' | 'manual' | 'DvD' | 'accessibleVehicles' | 'company' | undefined>();
  const [manualImei, setManualImei] = useState('');

  const {
    vehicleData,
    vehicleInfo,
    loading,
    error,
    lastUpdate,
    refresh,
    setImei: setHookImei,
  } = useFlespiData(5000, resolvedImei);

  const { isPrivate, setPrivate } = usePrivacyMode();
  const [signingOut, setSigningOut] = useState(false);
  const [privacyPending, setPrivacyPending] = useState(false);
  // Update IMEI source when selectedVehicle changes
  useEffect(() => {
    if (selectedVehicle?.imei) {
      setImeiSource(selectedVehicle.source);
      setHookImei(selectedVehicle.imei);
      console.info('[IMEI] ✅ Set from VehicleResolver:', selectedVehicle.imei, 'source:', selectedVehicle.source);
    }
  }, [selectedVehicle, setHookImei]);

  // Fallback: storage IMEI
  useEffect(() => {
    if (imei && !selectedVehicle?.imei && !imeiSource) {
      setImeiSource('storage');
      setHookImei(imei);
      console.info('[IMEI] Loaded from storage', imei);
    }
  }, [imei, selectedVehicle, imeiSource, setHookImei]);

  // Fallback: numeric username as IMEI
  useEffect(() => {
    if (!resolvedImei && username && /^\d{8,20}$/.test(username)) {
      setImei(username);
      setHookImei(username);
      setImeiSource('username');
      console.info('[IMEI] Inferred from username', username);
    }
  }, [resolvedImei, username, setImei, setHookImei]);

  // Fallback: Cognito attribute
  useEffect(() => {
    if (!resolvedImei && attributeImei) {
      setImei(attributeImei);
      setHookImei(attributeImei);
      setImeiSource('cognito');
      console.info('[IMEI] Loaded from Cognito attribute', attributeImei);
    }
  }, [resolvedImei, attributeImei, setImei, setHookImei]);
  useEffect(() => {
    if (vehicleInfo?.privacyEnabled !== undefined) {
      setPrivate(vehicleInfo.privacyEnabled);
    }
  }, [vehicleInfo?.privacyEnabled, setPrivate]);
  // Manual IMEI update UI removed per request; relies on username/attrs/local storage.
  const handleManualImeiSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = manualImei.trim();
    if (!trimmed) return;
    setImei(trimmed);
    setHookImei(trimmed);
    setImeiSource('manual');
    console.info('[IMEI] Set manually', trimmed);
    refresh();
  };
  const handleTogglePrivacyRemote = async () => {
    if (!resolvedImei && !vehicleInfo?.id) return;
    const next = !isPrivate;
    setPrivacyPending(true);
    try {
      await assignPrivacyPlugin({
        deviceId: vehicleInfo?.id,
        imei: resolvedImei || vehicleInfo?.imei,
        private: next,
      });
      setPrivate(next);
    } catch (err) {
      console.error('[Dashboard] Privacy toggle error:', err);
    } finally {
      setPrivacyPending(false);
    }
  };
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (signOutError) {
      console.error('[Dashboard] Sign out error:', signOutError);
    } finally {
      setSigningOut(false);
    }
  };
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const formatCoordinate = (coord: number, type: 'lat' | 'lng') => {
    if (isPrivate) return '****';
    if (!coord) return '-.----';
    const direction = type === 'lat' ? coord >= 0 ? 'N' : 'S' : coord >= 0 ? 'E' : 'O';
    return `${Math.abs(coord).toFixed(4)}° ${direction}`;
  };
  if (error && !vehicleData) {
    return <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="p-4 rounded-full bg-destructive/20 w-fit mx-auto mb-4">
            <Zap className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-display font-bold text-xl text-foreground mb-2">
            Erreur de connexion
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={refresh} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Réessayer
          </button>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <Header isOnline={vehicleData?.isOnline ?? false} lastUpdate={lastUpdate} onRefresh={refresh} loading={loading} isPrivate={isPrivate} onTogglePrivacy={handleTogglePrivacyRemote} userEmail={userEmail} onSignOut={handleSignOut} signingOut={signingOut} privacyPending={privacyPending} />

        {/* Vehicle Selection (if multiple found) */}
        {resolvedVehicles.length > 1 && !selectedVehicle && (
          <Card className="glass-card p-4 border border-warning/30">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-5 w-5 text-warning" />
              <h3 className="font-semibold text-foreground">Plusieurs véhicules disponibles</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {resolvedVehicles.length} véhicules trouvés via {resolvedVehicles[0]?.source}. Sélectionnez celui à suivre :
            </p>
            <Select onValueChange={selectVehicle}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Choisir un véhicule..." />
              </SelectTrigger>
              <SelectContent>
                {resolvedVehicles.map((v) => (
                  <SelectItem key={v.immat} value={v.immat}>
                    <span className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      {v.immat} {v.nomVehicule && `- ${v.nomVehicule}`}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        )}

        {/* No vehicle found */}
        {!resolvedImei && !vehicleInfo?.imei && resolvedVehicles.length === 0 && !vehicleResolverLoading && (
          <Card className="glass-card p-4 border border-destructive/30">
            <div className="mb-3">
              <h3 className="font-semibold text-foreground mb-2">⚠️ Aucun véhicule assigné</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Ce compte n'a pas de véhicule assigné (DvD, User.accessibleVehicles, ou Company).
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Solutions :</strong>
              </p>
              <ul className="text-sm text-muted-foreground list-disc ml-5 mt-1">
                <li>Demandez à un administrateur d'ajouter un véhicule</li>
                <li>Ou saisissez manuellement l'IMEI ci-dessous</li>
              </ul>
            </div>
            <form className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4" onSubmit={handleManualImeiSubmit}>
              <div className="flex-1">
                <p className="text-xs uppercase text-muted-foreground mb-1">IMEI manuel</p>
                <Input
                  value={manualImei}
                  onChange={(e) => setManualImei(e.target.value)}
                  placeholder="Saisissez l'IMEI pour charger le boîtier"
                  required
                />
              </div>
              <Button type="submit" className="md:w-auto w-full">
                Associer
              </Button>
            </form>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 border border-primary/30">
            <p className="text-xs uppercase text-muted-foreground mb-1">IMEI détecté</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {vehicleInfo?.imei ?? selectedVehicle?.imei ?? imei ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Source: {imeiSource ?? 'inconnue'}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Immatriculation</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {vehicleInfo?.immatriculation ?? selectedVehicle?.immat ?? '—'}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Véhicule</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {selectedVehicle?.nomVehicule ?? selectedVehicle?.marque ?? '—'}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Position actuelle</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {vehicleData ? `${formatCoordinate(vehicleData.latitude, 'lat')} / ${formatCoordinate(vehicleData.longitude, 'lng')}` : '—'}
            </p>
          </div>
        </div>

        {/* Debug Card - Auth & DvD diagnostics */}
        <Card className="glass-card p-4 border border-info/30">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="text-xs uppercase text-muted-foreground">🔍 Debug Auth & DvD</p>
            <Badge variant="secondary">sub: {sub ? `${sub.substring(0, 8)}...` : '❌ MISSING'}</Badge>
            <Badge variant={groups?.includes('guest') ? 'default' : 'destructive'}>
              groups: {groups?.join(', ') || '❌ NONE'}
            </Badge>
          </div>
          <pre className="bg-secondary/50 rounded-lg p-3 text-sm overflow-auto max-h-40">
          {JSON.stringify({
            auth: {
              username,
              sub: sub || 'MISSING',
              groups: groups || [],
              attributeKeys: attributes ? Object.keys(attributes) : [],
            },
            imeiResolution: {
              resolvedImei,
              imeiSource: imeiSource ?? 'unknown',
              attributeImei,
              selectedVehicleImei: selectedVehicle?.imei,
            },
            vehicleResolver: {
              loading: vehicleResolverLoading,
              vehicleCount: resolvedVehicles.length,
              vehicles: resolvedVehicles.map((v) => ({ immat: v.immat, imei: v.imei, source: v.source })),
              selectedVehicle: selectedVehicle ? { immat: selectedVehicle.immat, imei: selectedVehicle.imei } : null,
              diagnostics,
            },
          }, null, 2)}
          </pre>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="text-xs uppercase text-muted-foreground">Log véhicule</p>
            <Badge variant="secondary">IMEI source: {imeiSource ?? 'inconnu'}</Badge>
            {vehicleInfo?.id && <Badge variant="outline">Device ID: {vehicleInfo.id}</Badge>}
            {vehicleInfo?.privacyEnabled !== undefined && (
              <Badge variant={vehicleInfo.privacyEnabled ? 'default' : 'outline'}>
                Vie privée: {vehicleInfo.privacyEnabled ? 'ON' : 'OFF'}
              </Badge>
            )}
          </div>
          <pre className="bg-secondary/50 rounded-lg p-3 text-sm overflow-auto">
          {JSON.stringify({
            imei: resolvedImei || vehicleInfo?.imei,
            imeiSource: imeiSource ?? undefined,
            immatriculation: vehicleInfo?.immatriculation || selectedVehicle?.immat,
            vehicleName: selectedVehicle?.nomVehicule,
            deviceId: vehicleInfo?.id,
            privacy: vehicleInfo?.privacyEnabled,
            lastUpdate: lastUpdate?.toISOString(),
            coords: vehicleData
              ? {
                  lat: vehicleData.latitude,
                  lng: vehicleData.longitude,
                  speed: vehicleData.speed,
                  heading: vehicleData.heading,
                }
              : null,
          }, null, 2)}
          </pre>
        </Card>

        {/* Map Section */}
        <VehicleMap vehicleData={vehicleData} className="h-[40vh] min-h-[300px] shadow-card" isPrivate={isPrivate} />

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && !vehicleData ? <>
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-card" />)}
            </> : <>
              <MetricCard icon={Gauge} label="Vitesse" value={Math.round(vehicleData?.speed ?? 0)} unit="km/h" variant={(vehicleData?.speed ?? 0) > 120 ? 'danger' : (vehicleData?.speed ?? 0) > 80 ? 'warning' : 'success'} />
              <MetricCard icon={Navigation} label="Direction" value={Math.round(vehicleData?.heading ?? 0)} unit="°" />
              <MetricCard icon={Clock} label="Dernière trame" value={formatTimestamp(vehicleData?.timestamp ?? 0)} variant={vehicleData?.isOnline ? 'success' : 'warning'} />
              <MetricCard icon={Battery} label="Batterie" value={vehicleData?.batteryLevel ?? '--'} unit="%" variant={(vehicleData?.batteryLevel ?? 100) < 20 ? 'danger' : (vehicleData?.batteryLevel ?? 100) < 50 ? 'warning' : 'default'} />
            </>}
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
          {loading && !vehicleData ? <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 rounded-lg bg-secondary" />
              <Skeleton className="h-12 rounded-lg bg-secondary" />
            </div> : <div className="grid grid-cols-2 gap-4">
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
            </div>}
        </div>

        {/* Footer */}
        <footer className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Connecté à Flespi • 
          </p>
        </footer>
      </div>
    </div>;
};
export default Dashboard;
