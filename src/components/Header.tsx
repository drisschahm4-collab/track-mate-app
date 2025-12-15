import React from 'react';
import { Truck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';

interface HeaderProps {
  isOnline: boolean;
  lastUpdate: Date | null;
  onRefresh: () => void;
  loading?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isOnline, lastUpdate, onRefresh, loading }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header className="glass-card p-4 flex items-center justify-between">
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
};

// Import cn for the refresh button
import { cn } from '@/lib/utils';

export default Header;
