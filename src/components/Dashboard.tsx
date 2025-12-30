import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFlespiData } from '@/hooks/useFlespiData';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useUserImei } from '@/hooks/useUserImei';
import { assignPrivacyPlugin } from '@/integrations/flespi';
import { fetchDvdByDriverSub } from '@/integrations/amplify/dvd';
import { Battery, Clock, Gauge, MapPin, Navigation, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Header from './Header';
import MetricCard from './MetricCard';
import VehicleMap from './VehicleMap';
const Dashboard: React.FC = () => {
  const {
    userEmail,
    username,
    sub,
    groups,
    attributes,
    signOut
  } = useAuth();
  const {
    imei,
    setImei
  } = useUserImei(username);
  const attributeImei = attributes?.['custom:imei'] || attributes?.imei || attributes?.['custom:device_imei'];
  const preferredImei = imei || attributeImei || (username && /^\d{8,20}$/.test(username) ? username : undefined);
  const [imeiSource, setImeiSource] = useState<'storage' | 'username' | 'cognito' | 'manual' | 'DvD' | undefined>(imei ? 'storage' : attributeImei ? 'cognito' : undefined);
  const [manualImei, setManualImei] = useState('');
  const {
    vehicleData,
    vehicleInfo,
    loading,
    error,
    lastUpdate,
    refresh,
    setImei: setHookImei
  } = useFlespiData(5000, preferredImei);
  const {
    isPrivate,
    setPrivate
  } = usePrivacyMode();
  const [signingOut, setSigningOut] = useState(false);
  const [privacyPending, setPrivacyPending] = useState(false);
  const [dvdImmat, setDvdImmat] = useState<string | undefined>();
  const [dvdVehicleImei, setDvdVehicleImei] = useState<string | undefined>();
  const [dvdVehicleName, setDvdVehicleName] = useState<string | undefined>();
  useEffect(() => {
    setHookImei(imei);
    if (imei && !imeiSource) {
      setImeiSource('storage');
      console.info('[IMEI] Loaded from storage', imei);
    }
  }, [imei, setHookImei]);
  useEffect(() => {
    if (!imei && username && /^\d{8,20}$/.test(username)) {
      setImei(username);
      setHookImei(username);
      setImeiSource('username');
      console.info('[IMEI] Inferred from username', username);
    }
  }, [imei, username, setImei, setHookImei]);
  useEffect(() => {
    if (!imei && attributeImei) {
      setImei(attributeImei);
      setHookImei(attributeImei);
      setImeiSource('cognito');
      console.info('[IMEI] Loaded from Cognito attribute', attributeImei);
    }
  }, [attributeImei, imei, setImei, setHookImei]);

  useEffect(() => {
    const loadDvd = async () => {
      console.log('[Dashboard] 🚀 Loading DvD data...');
      console.log('[Dashboard] 👤 User sub (from context):', sub);
      console.log('[Dashboard] 👥 User groups:', groups);
      console.log('[Dashboard] 📝 User attributes keys:', attributes ? Object.keys(attributes) : 'none');
      console.log('[Dashboard] 📍 Current IMEI state:', imei);

      if (!sub) {
        console.warn('[Dashboard] ⚠️ No user sub found in context, skipping DvD fetch');
        return;
      }

      try {
        console.log('[Dashboard] 📞 Calling fetchDvdByDriverSub with sub:', sub);
        const dvds = await fetchDvdByDriverSub(sub);

        console.log('[Dashboard] 📦 DvD response received, count:', dvds.length);

        if (dvds.length > 0) {
          const dvd = dvds[0];
          console.log('[Dashboard] 🎯 First DvD entry:', JSON.stringify(dvd, null, 2));

          const immat = dvd.dvDVehicleImmat || undefined;
          const vehicleImei = dvd.vehicle?.device?.imei;
          const vehicleName = dvd.vehicle?.nomVehicule || dvd.vehicle?.marque || undefined;

          console.log('[Dashboard] 🚗 Extracted data:', {
            immat,
            vehicleImei,
            vehicleName,
            fullVehicle: dvd.vehicle
          });

          setDvdImmat(immat);
          setDvdVehicleImei(vehicleImei || undefined);
          setDvdVehicleName(vehicleName);

          console.log('[Dashboard] ✅ State updated:', {
            dvdImmat: immat,
            dvdVehicleImei: vehicleImei,
            dvdVehicleName: vehicleName
          });

          // Si on a un IMEI du véhicule et qu'aucun IMEI n'est déjà défini, on l'utilise
          if (vehicleImei && !imei) {
            console.log('[Dashboard] 🎉 Setting IMEI from DvD vehicle:', vehicleImei);
            setImei(vehicleImei);
            setHookImei(vehicleImei);
            setImeiSource('DvD');
            console.info('[IMEI] ✅ Loaded from DvD vehicle', vehicleImei);
          } else {
            console.log('[Dashboard] ℹ️ Not setting IMEI - vehicleImei:', vehicleImei, 'existing imei:', imei);
          }
        } else {
          console.warn('[Dashboard] ⚠️ No DvD entries found for driver:', attributes.sub);
        }
      } catch (err) {
        console.error('[Dashboard] ❌ DvD Fetch error:', err);
      }
    };
    loadDvd();
  }, [sub, groups, imei, setImei, setHookImei]);
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
    if (!imei && !vehicleInfo?.id) return;
    const next = !isPrivate;
    setPrivacyPending(true);
    try {
      await assignPrivacyPlugin({
        deviceId: vehicleInfo?.id,
        imei: imei || vehicleInfo?.imei,
        private: next
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

        {!preferredImei && !vehicleInfo?.imei && !dvdVehicleImei && (
          <Card className="glass-card p-4 border border-destructive/30">
            <div className="mb-3">
              <h3 className="font-semibold text-foreground mb-2">⚠️ Aucun véhicule assigné</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Ce compte n'a pas de véhicule assigné (ni dans DvD, ni dans User.accessibleVehicles).
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Solutions :</strong>
              </p>
              <ul className="text-sm text-muted-foreground list-disc ml-5 mt-1">
                <li>Demandez à un administrateur d'ajouter un véhicule dans User.accessibleVehicles</li>
                <li>Ou créer une entrée dans la table DvD pour ce driver</li>
                <li>Ou saisissez manuellement l'IMEI ci-dessous</li>
              </ul>
            </div>
            <form className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4" onSubmit={handleManualImeiSubmit}>
              <div className="flex-1">
                <p className="text-xs uppercase text-muted-foreground mb-1">IMEI manuel (optionnel)</p>
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
              {vehicleInfo?.imei ?? dvdVehicleImei ?? imei ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Source: {imeiSource ?? (dvdVehicleImei ? 'DvD' : 'inconnue')}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Immatriculation</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {vehicleInfo?.immatriculation ?? dvdImmat ?? '—'}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Véhicule</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {dvdVehicleName ?? '—'}
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
              attributeKeys: attributes ? Object.keys(attributes) : []
            },
            imeiResolution: {
              preferredImei,
              imeiSource: imeiSource ?? 'unknown',
              attributeImei,
              dvdVehicleImei
            },
            dvdResult: {
              immat: dvdImmat,
              vehicleName: dvdVehicleName,
              vehicleImei: dvdVehicleImei
            }
          }, null, 2)}
          </pre>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="text-xs uppercase text-muted-foreground">Log véhicule</p>
            <Badge variant="secondary">IMEI source: {imeiSource ?? 'inconnu'}</Badge>
            {vehicleInfo?.id && <Badge variant="outline">Device ID: {vehicleInfo.id}</Badge>}
            {vehicleInfo?.privacyEnabled !== undefined && <Badge variant={vehicleInfo.privacyEnabled ? 'default' : 'outline'}>
                Vie privée: {vehicleInfo.privacyEnabled ? 'ON' : 'OFF'}
              </Badge>}
          </div>
          <pre className="bg-secondary/50 rounded-lg p-3 text-sm overflow-auto">
          {JSON.stringify({
            imei: imei || vehicleInfo?.imei || dvdVehicleImei,
            imeiSource: imeiSource ?? (dvdVehicleImei ? 'DvD' : undefined),
            immatriculation: vehicleInfo?.immatriculation || dvdImmat,
            vehicleName: dvdVehicleName,
            deviceId: vehicleInfo?.id,
            privacy: vehicleInfo?.privacyEnabled,
            lastUpdate: lastUpdate?.toISOString(),
            coords: vehicleData ? {
              lat: vehicleData.latitude,
              lng: vehicleData.longitude,
              speed: vehicleData.speed,
              heading: vehicleData.heading
            } : null
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
