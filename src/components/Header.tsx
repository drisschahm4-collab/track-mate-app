import React from 'react';
import { Truck, RefreshCw, Eye, EyeOff, Shield, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

interface HeaderProps {
  isOnline: boolean;
  lastUpdate: Date | null;
  onRefresh: () => void;
  loading?: boolean;
  isPrivate?: boolean;
  onTogglePrivacy?: () => void;
  userEmail?: string;
  onSignOut?: () => Promise<void> | void;
  signingOut?: boolean;
  privacyPending?: boolean;
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ 
    isOnline, 
    lastUpdate, 
    onRefresh, 
    loading,
    isPrivate = false,
    onTogglePrivacy,
    userEmail,
    onSignOut,
    signingOut,
    privacyPending = false
  }, ref) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header ref={ref} className="glass-card p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/20">
          <Truck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-foreground">
            FleetTrack
          </h1>
          <p className="text-sm text-muted-foreground">
            {lastUpdate ? `Mise à jour: ${formatTime(lastUpdate)}` : 'Chargement...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {userEmail && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50">
            <div className="text-left">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Connecté</p>
              <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{userEmail}</p>
            </div>
            {onSignOut && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSignOut}
                disabled={signingOut}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                aria-label="Se déconnecter"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Privacy Mode Toggle */}
        {onTogglePrivacy && (
          <div className="flex items-center gap-2">
            {isPrivate && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/20 border border-accent/30">
                <Shield className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-accent">Privé</span>
              </div>
            )}
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300",
                isPrivate 
                  ? "bg-accent/20 text-accent border border-accent/30" 
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              {isPrivate ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <Switch
                checked={isPrivate}
                onCheckedChange={onTogglePrivacy}
                disabled={privacyPending}
                className="data-[state=checked]:bg-accent"
                aria-label="Mode privé"
              />
            </div>
          </div>
        )}
        
        <StatusBadge isOnline={isOnline} />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
        </Button>
      </div>
    </header>
  );
});
Header.displayName = "Header";

export default Header;
