import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  label,
  value,
  unit,
  variant = 'default',
  className,
}) => {
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
    <div className={cn('metric-card animate-slide-up', className)}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', iconVariantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-2">
        <span className={cn('text-3xl font-display font-bold', variantStyles[variant])}>
          {value}
        </span>
        {unit && (
          <span className="text-lg text-muted-foreground font-medium">{unit}</span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
