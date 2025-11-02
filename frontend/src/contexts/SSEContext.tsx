import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';

interface SSEEvent {
  type: string;
  [key: string]: any;
}

interface SSEContextType {
  subscribe: (callback: (event: SSEEvent) => void) => () => void;
  isConnected: boolean;
}

export const SSEContext = createContext<SSEContextType | null>(null);

export const SSEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const subscribersRef = useRef<Set<(event: SSEEvent) => void>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create SSE connection
    const es = new EventSource("http://localhost:5000/activities/stream");
    
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'connected') {
        // Broadcast to all subscribers
        subscribersRef.current.forEach(callback => callback(data));
      } else if (data.type === 'connected') {
        setIsConnected(true);
      }
    };

    es.onerror = (error) => {
      console.error("SSE connection error:", error);
      setIsConnected(false);
    };

    return () => {
      es.close();
    };
  }, []); // Only create once

  const subscribe = (callback: (event: SSEEvent) => void) => {
    subscribersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback);
    };
  };

  return (
    <SSEContext.Provider value={{ subscribe, isConnected }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE must be used within an SSEProvider');
  }
  return context;
};

