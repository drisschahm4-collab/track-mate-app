import React, { useMemo, useState, useEffect } from 'react';
import { Gauge, Navigation, Clock, MapPin, Battery, Zap, Car, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { useFlespiData } from '@/hooks/useFlespiData';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useAuth } from '@/hooks/useAuth';
import { useUserImei } from '@/hooks/useUserImei';
import { useVehicleResolver } from '@/hooks/useVehicleResolver';
import Header from './Header';
import MetricCard from './MetricCard';
import VehicleMap from './VehicleMap';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { assignPrivacyPlugin } from '@/integrations/flespi';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Dashboard = React.forwardRef<HTMLDivElement>((props, ref) => {
  const {
    userEmail,
    username,
    userSub,
    attributes,
    signOut
  } = useAuth();
  const {
    imei,
    setImei
  } = useUserImei(username);

  // Résolution des véhicules via DvD avec pagination - utilise le sub Cognito ET username
  const {
    vehicles: dvdVehicles,
    imeis: dvdImeis,
    loading: dvdLoading,
    error: dvdError,
    totalFetched: dvdTotalFetched,
    refresh: refreshDvd,
  } = useVehicleResolver(userSub, username);

  const [selectedVehicleImmat, setSelectedVehicleImmat] = useState<string | undefined>();
  const [imeiDraft, setImeiDraft] = useState<string>(imei ?? '');
  const [imeiSource, setImeiSource] = useState<'storage' | 'username' | 'cognito' | 'manual' | 'dvd' | undefined>(imei ? 'storage' : undefined);
  const {
    vehicleData,
    vehicleInfo,
    loading,
    error,
    lastUpdate,
    refresh,
    setImei: setHookImei,
    missingImei
  } = useFlespiData(30000);
  const {
    isPrivate,
    setPrivate
  } = usePrivacyMode();
  const [signingOut, setSigningOut] = useState(false);
  const [privacyPending, setPrivacyPending] = useState(false);
  useEffect(() => {
    setImeiDraft(imei ?? '');
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
      setImeiDraft(username);
      setImeiSource('username');
      console.info('[IMEI] Inferred from username', username);
    }
  }, [imei, username, setImei, setHookImei]);
  useEffect(() => {
    const attrImei = attributes?.['custom:imei'] || attributes?.imei || attributes?.['custom:device_imei'];
    if (!imei && attrImei) {
      setImei(attrImei);
      setHookImei(attrImei);
      setImeiDraft(attrImei);
      setImeiSource('cognito');
      console.info('[IMEI] Loaded from Cognito attribute', attrImei);
    }
  }, [attributes, imei, setImei, setHookImei]);

  // Auto-set IMEI depuis DvD resolution
  useEffect(() => {
    if (!imei && dvdImeis.length > 0) {
      const resolvedImei = dvdImeis[0];
      setImei(resolvedImei);
      setHookImei(resolvedImei);
      setImeiDraft(resolvedImei);
      setImeiSource('dvd');
      console.info('[IMEI] Resolved from DvD:', resolvedImei);

      // Si plusieurs véhicules, sélectionner le premier par défaut
      if (dvdVehicles.length > 0) {
        setSelectedVehicleImmat(dvdVehicles[0].immat);
      }
    }
  }, [dvdImeis, dvdVehicles, imei, setImei, setHookImei]);

  // Priorité: immat DvD > immat Flespi (qui affiche le nom device)
  const displayImmat = useMemo(() => {
    if (selectedVehicleImmat) return selectedVehicleImmat;
    if (dvdVehicles.length > 0) return dvdVehicles[0].immat;
    return vehicleInfo?.immatriculation;
  }, [selectedVehicleImmat, dvdVehicles, vehicleInfo?.immatriculation]);

  // Changement de véhicule sélectionné
  const handleVehicleChange = (immat: string) => {
    setSelectedVehicleImmat(immat);
    const selectedVehicle = dvdVehicles.find(v => v.immat === immat);
    if (selectedVehicle?.vehicleDeviceImei) {
      setImei(selectedVehicle.vehicleDeviceImei);
      setHookImei(selectedVehicle.vehicleDeviceImei);
      setImeiDraft(selectedVehicle.vehicleDeviceImei);
      setImeiSource('dvd');
      console.info('[IMEI] Changed via vehicle selector:', selectedVehicle.vehicleDeviceImei);
      refresh();
    }
  };

  useEffect(() => {
    if (vehicleInfo?.privacyEnabled !== undefined) {
      setPrivate(vehicleInfo.privacyEnabled);
    }
  }, [vehicleInfo?.privacyEnabled, setPrivate]);
  const handleImeiSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = imeiDraft.trim();
    setImei(trimmed || undefined);
    setHookImei(trimmed || undefined);
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
      // Refresh après 1s pour mettre à jour l'état du device
      setTimeout(() => refresh(), 1000);
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
    if (!coord) return '-.----';
    const direction = type === 'lat' ? coord >= 0 ? 'N' : 'S' : coord >= 0 ? 'E' : 'O';
    return `${Math.abs(coord).toFixed(4)}° ${direction}`;
  };
  // Pendant le chargement DvD - afficher UNIQUEMENT le loader plein écran
  if (missingImei && dvdLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h2 className="font-display font-bold text-xl text-foreground">
            Recherche de vos véhicules...
          </h2>
          <p className="text-muted-foreground">
            Résolution en cours ({dvdTotalFetched} affectations analysées)
          </p>
        </div>
      </div>
    );
  }

  // Après chargement: erreur ou aucun véhicule trouvé
  if (missingImei) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="glass-card p-6 md:p-8 text-center max-w-md space-y-4">
          {dvdError ? (
            <>
              <Zap className="h-8 w-8 text-destructive mx-auto" />
              <h2 className="font-display font-bold text-lg md:text-xl text-foreground">
                Erreur de résolution
              </h2>
              <p className="text-muted-foreground text-sm">{dvdError}</p>
              <Button onClick={refreshDvd} variant="outline">
                Réessayer
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin mx-auto text-primary" />
              <h2 className="font-display font-bold text-lg md:text-xl text-foreground">
                Recherche de vos véhicules...
              </h2>
              <p className="text-muted-foreground text-sm">
                Veuillez patienter pendant la résolution
              </p>
            </>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }
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
  return <div ref={ref} className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-3 md:p-4 space-y-3 md:space-y-4">
        <Header isOnline={vehicleData?.isOnline ?? false} lastUpdate={lastUpdate} onRefresh={refresh} loading={loading} isPrivate={isPrivate} onTogglePrivacy={handleTogglePrivacyRemote} userEmail={userEmail} onSignOut={handleSignOut} signingOut={signingOut} privacyPending={privacyPending} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sélecteur de véhicule DvD si plusieurs véhicules */}
          {dvdVehicles.length > 1 && (
            <Card className="glass-card p-4 lg:col-span-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
                <div className="flex-1">
                  <p className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Véhicules assignés ({dvdVehicles.length})
                  </p>
                  <Select value={selectedVehicleImmat} onValueChange={handleVehicleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      {dvdVehicles.map((v) => (
                        <SelectItem key={v.immat} value={v.immat}>
                          {v.nomVehicule || v.immat} - {v.marque || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="secondary" className="h-fit">
                  {dvdLoading ? 'Résolution...' : `${dvdTotalFetched} DvD trouvés`}
                </Badge>
              </div>
            </Card>
          )}

          <div className="glass-card p-3 md:p-4 border border-primary/30">
            <p className="text-xs uppercase text-muted-foreground mb-1">IMEI</p>
            <p className="font-display text-sm md:text-lg font-semibold text-foreground truncate">
              {vehicleInfo?.imei ?? '—'}
            </p>
          </div>
          <div className="glass-card p-3 md:p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Immatriculation</p>
            <p className="font-display text-sm md:text-lg font-semibold text-foreground">
              {displayImmat ?? '—'}
            </p>
          </div>
          <div className="glass-card p-3 md:p-4 lg:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase text-muted-foreground">Adresse</p>
              <Button size="sm" variant="ghost" onClick={refresh} className="h-6 w-6 p-0">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="font-display text-sm md:text-lg font-semibold text-foreground truncate">
              {vehicleData?.address ?? `[Aucune adresse - lat: ${vehicleData?.latitude?.toFixed(4) ?? '?'}]`}
            </p>
          </div>
        </div>

        {/* Map Section */}
        <VehicleMap vehicleData={vehicleData} className="h-[35vh] md:h-[40vh] min-h-[250px] md:min-h-[300px] shadow-card" isPrivate={isPrivate} />

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
            Connecté à Flespi • Actualisation : 30s
          </p>
        </footer>
      </div>
    </div>;
});
Dashboard.displayName = "Dashboard";

export default Dashboard;