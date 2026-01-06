import React from 'react';
import Dashboard from '@/components/Dashboard';

const Index = React.forwardRef<HTMLDivElement>((props, ref) => {
  return <Dashboard ref={ref} />;
});
Index.displayName = "Index";

export default Index;
