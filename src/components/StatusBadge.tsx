import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  isOnline: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ isOnline, className }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full font-display font-medium text-sm',
        isOnline
          ? 'bg-success/20 text-success'
          : 'bg-destructive/20 text-destructive',
        className
      )}
    >
      <span
        className={cn(
          'w-2.5 h-2.5 rounded-full',
          isOnline ? 'bg-success animate-pulse-glow' : 'bg-destructive'
        )}
      />
      {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
    </div>
  );
};

export default StatusBadge;
