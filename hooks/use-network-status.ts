"use client";

import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  isOnline: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}

interface NetworkConnection extends EventTarget {
  downlink: number;
  effectiveType: string;
  rtt: number;
  saveData: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  }
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  });

  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastDisconnectTime, setLastDisconnectTime] = useState<number | null>(null);

  const updateNetworkStatus = useCallback(() => {
    const connection = 
      navigator.connection || 
      navigator.mozConnection || 
      navigator.webkitConnection;

    setNetworkStatus({
      isOnline: navigator.onLine,
      downlink: connection?.downlink,
      effectiveType: connection?.effectiveType,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    });
  }, []);

  const handleOnline = useCallback(() => {
    setReconnectAttempts(0);
    setLastDisconnectTime(null);
    updateNetworkStatus();
  }, [updateNetworkStatus]);

  const handleOffline = useCallback(() => {
    setLastDisconnectTime(Date.now());
    updateNetworkStatus();
  }, [updateNetworkStatus]);

  const handleConnectionChange = useCallback(() => {
    updateNetworkStatus();
  }, [updateNetworkStatus]);

  useEffect(() => {
    // Initial status
    updateNetworkStatus();

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const connection = 
      navigator.connection || 
      navigator.mozConnection || 
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener("change", handleConnectionChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      
      if (connection) {
        connection.removeEventListener("change", handleConnectionChange);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange]);

  // Calculate connection quality
  const getConnectionQuality = useCallback((): "excellent" | "good" | "fair" | "poor" => {
    if (!networkStatus.isOnline) return "poor";
    
    const { effectiveType, downlink, rtt } = networkStatus;
    
    if (effectiveType === "4g" && (downlink || 0) > 10 && (rtt || 0) < 100) {
      return "excellent";
    } else if (effectiveType === "4g" || ((downlink || 0) > 5 && (rtt || 0) < 200)) {
      return "good";
    } else if (effectiveType === "3g" || ((downlink || 0) > 1 && (rtt || 0) < 500)) {
      return "fair";
    } else {
      return "poor";
    }
  }, [networkStatus]);

  // Get recommended stream quality based on connection
  const getRecommendedStreamQuality = useCallback((): "high" | "medium" | "low" => {
    const quality = getConnectionQuality();
    
    switch (quality) {
      case "excellent":
        return "high";
      case "good":
        return "medium";
      case "fair":
      case "poor":
        return "low";
    }
  }, [getConnectionQuality]);

  // Check if we should retry connections
  const shouldRetryConnection = useCallback((): boolean => {
    if (!networkStatus.isOnline) return false;
    if (reconnectAttempts >= 5) return false; // Max 5 retry attempts
    
    // Wait longer between retries
    const timeSinceLastDisconnect = lastDisconnectTime 
      ? Date.now() - lastDisconnectTime 
      : 0;
    
    const minWaitTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    return timeSinceLastDisconnect > minWaitTime;
  }, [networkStatus.isOnline, reconnectAttempts, lastDisconnectTime]);

  const incrementReconnectAttempts = useCallback(() => {
    setReconnectAttempts(prev => prev + 1);
  }, []);

  const resetReconnectAttempts = useCallback(() => {
    setReconnectAttempts(0);
    setLastDisconnectTime(null);
  }, []);

  return {
    networkStatus,
    connectionQuality: getConnectionQuality(),
    recommendedStreamQuality: getRecommendedStreamQuality(),
    shouldRetryConnection: shouldRetryConnection(),
    reconnectAttempts,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    isOnline: networkStatus.isOnline,
    downlinkSpeed: networkStatus.downlink,
    latency: networkStatus.rtt,
  };
}
