"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Camera as CameraType } from "@/types/camera";
import {
  Expand,
  VideoOff,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { streamManager, type StreamConfig } from "@/lib/stream-manager";
import { useNetworkStatus } from "@/hooks/use-network-status";

interface OptimizedCameraFeedProps {
  camera: CameraType;
  onExpand?: (camera: CameraType) => void;
  className?: string;
  priority?: boolean;
  isVisible?: boolean; // For intersection observer optimization
}

export function OptimizedCameraFeed({
  camera,
  onExpand,
  className,
  priority = false,
  isVisible = true,
}: OptimizedCameraFeedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  // Network status for adaptive behavior
  const {
    isOnline,
    connectionQuality,
    shouldRetryConnection,
    incrementReconnectAttempts,
    resetReconnectAttempts,
  } = useNetworkStatus();

  // Get stream URL
  const getStreamUrl = useCallback(async () => {
    if (!camera.ip_address || isUnmountedRef.current) return "";

    try {
      const response = await fetch(`/api/stream/${camera.id}`);
      if (!response.ok) throw new Error("Failed to get stream URL");
      const data = await response.json();
      return data.url || data.streamUrl;
    } catch (error) {
      console.error("Error getting stream URL:", error);
      return "";
    }
  }, [camera.id, camera.ip_address]);

  // Handle retry logic with network awareness
  const handleRetry = useCallback(() => {
    if (!isOnline) {
      console.log(`Camera ${camera.name}: Network offline, skipping retry`);
      return;
    }

    if (
      retryCount < MAX_RETRIES &&
      !isUnmountedRef.current &&
      shouldRetryConnection
    ) {
      setRetryCount((prev) => prev + 1);
      setHasError(false);
      setConnectionStatus("connecting");
      incrementReconnectAttempts();

      // Adaptive retry delay based on connection quality
      const baseDelay =
        connectionQuality === "poor" ? RETRY_DELAY * 2 : RETRY_DELAY;
      const retryDelay = baseDelay * Math.pow(2, retryCount); // Exponential backoff

      retryTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          initializeStream();
        }
      }, retryDelay);
    }
  }, [
    retryCount,
    isOnline,
    shouldRetryConnection,
    connectionQuality,
    camera.name,
    incrementReconnectAttempts,
  ]);

  // Initialize stream using stream manager
  const initializeStream = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement || isUnmountedRef.current || !isVisible) {
      return;
    }

    try {
      setIsLoading(true);
      setConnectionStatus("connecting");

      const streamUrl = await getStreamUrl();
      if (!streamUrl || isUnmountedRef.current) return;

      const streamConfig: StreamConfig = {
        cameraId: camera.id,
        videoElement,
        streamUrl,
        priority,
        onStatusChange: (status) => {
          if (!isUnmountedRef.current) {
            setConnectionStatus(status);
            if (status === "connected") {
              setIsLoading(false);
              setRetryCount(0);
              setHasError(false);
            } else if (status === "disconnected") {
              setHasError(true);
            }
          }
        },
        onError: (error) => {
          if (!isUnmountedRef.current) {
            console.error(`Stream error for camera ${camera.name}:`, error);
            setHasError(true);
            setConnectionStatus("disconnected");
            handleRetry();
          }
        },
      };

      const success = await streamManager.addStream(streamConfig);
      if (!success && !isUnmountedRef.current) {
        setHasError(true);
        setConnectionStatus("disconnected");
        handleRetry();
      }
    } catch (error) {
      console.error("Error initializing stream:", error);
      if (!isUnmountedRef.current) {
        setHasError(true);
        setConnectionStatus("disconnected");
        handleRetry();
      }
    }
  }, [
    camera.id,
    camera.status,
    camera.name,
    priority,
    isVisible,
    getStreamUrl,
    handleRetry,
  ]);

  // Initialize stream when component mounts or becomes visible
  useEffect(() => {
    isUnmountedRef.current = false;

    if (isVisible && isOnline) {
      initializeStream();
    }

    return () => {
      isUnmountedRef.current = true;

      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Remove stream from manager
      streamManager.removeStream(camera.id);
    };
  }, [camera.id, isVisible, isOnline, initializeStream]);

  // Handle network recovery
  useEffect(() => {
    if (isOnline && hasError && isVisible) {
      console.log(
        `Camera ${camera.name}: Network recovered, attempting reconnection`
      );
      resetReconnectAttempts();
      setRetryCount(0);
      setHasError(false);
      initializeStream();
    }
  }, [
    isOnline,
    hasError,
    camera.status,
    camera.name,
    isVisible,
    resetReconnectAttempts,
    initializeStream,
  ]);

  // Update stream activity when visible
  useEffect(() => {
    if (isVisible && connectionStatus === "connected") {
      streamManager.updateStreamActivity(camera.id);
    }
  }, [isVisible, connectionStatus, camera.id]);

  // Handle expand click
  const handleExpand = () => {
    if (onExpand) {
      onExpand(camera);
    }
  };

  // Get status indicators
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-3 w-3 text-green-500" />;
      case "disconnected":
        return <WifiOff className="h-3 w-3 text-red-500" />;
      case "connecting":
        return <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "disconnected":
        return "bg-red-500";
      case "connecting":
        return "bg-yellow-500";
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "relative group bg-black rounded-lg overflow-hidden border border-border/50",
        "hover:border-primary/50 transition-all duration-200",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{ aspectRatio: "16/9" }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          isLoading && "opacity-0"
        )}
        muted
        playsInline
        loop
        preload={priority ? "auto" : "none"}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <div className="text-center">
            <VideoOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              {!isOnline ? "Network Offline" : "No Signal"}
            </p>
            {!isOnline ? (
              <p className="text-xs text-muted-foreground">
                Check your internet connection
              </p>
            ) : retryCount < MAX_RETRIES && shouldRetryConnection ? (
              <p className="text-xs text-muted-foreground">
                Retrying... ({retryCount}/{MAX_RETRIES})
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Connection failed</p>
            )}
            {connectionQuality === "poor" && isOnline && (
              <p className="text-xs text-orange-400 mt-1">
                Poor connection quality
              </p>
            )}
          </div>
        </div>
      )}

      {/* Camera Info Overlay */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-black/60 text-white border-none backdrop-blur-sm"
          >
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className="text-xs font-medium">{camera.name}</span>
            </div>
          </Badge>
        </div>
        <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
      </div>

      {/* Location Badge */}
      <div className="absolute bottom-2 left-2">
        <Badge
          variant="outline"
          className="bg-black/60 text-white border-white/20 backdrop-blur-sm"
        >
          <span className="text-xs">{camera.location}</span>
        </Badge>
      </div>

      {/* Expand Button */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Button
          size="sm"
          variant="secondary"
          className="bg-black/60 hover:bg-black/80 text-white border-none backdrop-blur-sm"
          onClick={handleExpand}
        >
          <Expand className="h-3 w-3" />
        </Button>
      </div>

      {/* Offline Status */}
      {camera.status === "offline" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Camera Offline</p>
          </div>
        </div>
      )}

      {/* Performance indicator for priority streams */}
      {priority && (
        <div className="absolute top-2 right-8">
          <Badge
            variant="outline"
            className="bg-blue-500/20 text-blue-400 border-blue-400/30"
          >
            <span className="text-xs">Priority</span>
          </Badge>
        </div>
      )}
    </motion.div>
  );
}
