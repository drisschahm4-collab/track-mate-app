import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  isOnline: boolean;
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ isOnline, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-full font-display font-medium text-sm',
          isOnline
            ? 'bg-success/20 text-success'
            : 'bg-destructive/20 text-destructive',
          className
        )}
        {...props}
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
  }
);
StatusBadge.displayName = "StatusBadge";

export default StatusBadge;
