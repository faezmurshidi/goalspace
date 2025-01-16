'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type Alert = {
  id: string;
  message: string;
  timestamp: number;
};

export function TokenAlert() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const handleTokenAlert = (event: CustomEvent<{ message: string }>) => {
      const newAlert = {
        id: Math.random().toString(36).substring(7),
        message: event.detail.message,
        timestamp: Date.now(),
      };

      setAlerts((prev) => [...prev, newAlert]);

      // Remove alert after 5 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== newAlert.id));
      }, 5000);
    };

    // Add event listener
    window.addEventListener('tokenAlert', handleTokenAlert as EventListener);

    return () => {
      window.removeEventListener('tokenAlert', handleTokenAlert as EventListener);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-h-[80vh] w-96 flex-col gap-2 overflow-auto">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="relative rounded-lg border border-border bg-card p-4 shadow-lg"
          >
            <button
              onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
              className="absolute right-2 top-2 rounded-full p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{alert.message}</pre>
            <div className="mt-2 text-right text-xs text-muted-foreground">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
