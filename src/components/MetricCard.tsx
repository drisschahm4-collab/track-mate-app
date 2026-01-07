import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ icon: Icon, label, value, unit, variant = 'default', className, ...props }, ref) => {
    const variantStyles = {
      default: 'text-foreground',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-destructive',
    };

    const iconVariantStyles = {
      default: 'bg-secondary text-muted-foreground',
      success: 'bg-success/20 text-success',
      warning: 'bg-warning/20 text-warning',
      danger: 'bg-destructive/20 text-destructive',
    };

    return (
      <div ref={ref} className={cn('metric-card animate-slide-up', className)} {...props}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className={cn('p-1.5 md:p-2 rounded-lg', iconVariantStyles[variant])}>
            <Icon className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <span className="text-xs md:text-sm text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="flex items-baseline gap-1 mt-2">
          <span className={cn('text-2xl md:text-3xl font-display font-bold', variantStyles[variant])}>
            {value}
          </span>
          {unit && (
            <span className="text-base md:text-lg text-muted-foreground font-medium">{unit}</span>
          )}
        </div>
      </div>
    );
  }
);
MetricCard.displayName = "MetricCard";

export default MetricCard;
