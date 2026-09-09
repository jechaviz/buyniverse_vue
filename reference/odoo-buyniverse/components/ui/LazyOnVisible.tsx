import React, { useState, useRef, useEffect } from 'react';

interface LazyOnVisibleProps {
  load: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  [key: string]: any; // To pass through other props
}

const LazyOnVisible: React.FC<LazyOnVisibleProps> = ({ load, fallback = null, ...props }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(async ([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        const LoadedComponentModule = await load();
        setComponent(() => LoadedComponentModule.default);
      }
    });

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if(currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [load]);

  return <div ref={ref} style={{ minHeight: '200px' }}>{Component ? <Component {...props} /> : fallback}</div>;
};

export default LazyOnVisible;
