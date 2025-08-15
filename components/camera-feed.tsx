"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Camera as CameraType } from "@/types/camera";
import {
  Expand,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { streamManager, type StreamConfig } from "@/lib/stream-manager";

interface CameraFeedProps {
  camera: CameraType;
  onExpand?: (camera: CameraType) => void;
  className?: string;
  priority?: boolean; // For performance optimization
}

export function CameraFeed({
  camera,
  onExpand,
  className,
  priority = false,
}: CameraFeedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Maximum retry attempts
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Function to get the stream URL
  const getStreamUrl = useCallback(async () => {
    if (!camera.ip_address || isUnmountedRef.current) return "";

    try {
      const response = await fetch(`/api/stream/${camera.id}`);
      if (!response.ok) {
        throw new Error("Failed to get stream URL");
      }
      const data = await response.json();
      return data.url || data.streamUrl;
    } catch (error) {
      console.error("Error getting stream URL:", error);
      if (!isUnmountedRef.current) {
        setHasError(true);
        setConnectionStatus("disconnected");
      }
      return "";
    }
  }, [camera.id, camera.ip_address]);

  // Function to handle retry logic
  const handleRetry = useCallback(() => {
    if (retryCount < MAX_RETRIES && !isUnmountedRef.current) {
      setRetryCount((prev) => prev + 1);
      setHasError(false);
      setConnectionStatus("connecting");

      retryTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          initializeStream();
        }
      }, RETRY_DELAY);
    }
  }, [retryCount]);

  // Function to initialize the video stream
  const initializeStream = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement || isUnmountedRef.current) return;

    try {
      setIsLoading(true);
      setConnectionStatus("connecting");

      const streamUrl = await getStreamUrl();
      if (!streamUrl || isUnmountedRef.current) return;

      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30, // Reduced for multi-camera performance
          maxBufferLength: 3, // Reduced for lower latency
          maxMaxBufferLength: 30,
          maxBufferSize: 30 * 1000 * 1000, // Reduced buffer size
          maxBufferHole: 0.3,
          liveSyncDurationCount: 1,
          maxLiveSyncPlaybackRate: 1.5,
          liveMaxLatencyDurationCount: 5, // Reduced for lower latency
          liveDurationInfinity: true,
          debug: false,
          autoStartLoad: true,
          startPosition: -1,
          capLevelToPlayerSize: true,
          testBandwidth: false, // Disabled for performance
          progressive: false,
          xhrSetup: (xhr: any, url: string) => {
            xhr.timeout = 8000; // Reduced timeout for faster failure detection
          },
        });

        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isUnmountedRef.current) {
            console.log(`HLS manifest parsed for camera ${camera.name}`);
            setIsLoading(false);
            setConnectionStatus("connected");
            setRetryCount(0); // Reset retry count on success

            videoElement.play().catch((err) => {
              console.error("Error playing video:", err);
              if (!isUnmountedRef.current) {
                setHasError(true);
                setConnectionStatus("disconnected");
              }
            });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error(`HLS error for camera ${camera.name}:`, data);
          if (!isUnmountedRef.current) {
            if (data.fatal) {
              setHasError(true);
              setConnectionStatus("disconnected");
              handleRetry();
            }
          }
        });

        hls.on(Hls.Events.FRAG_LOAD_ERROR, () => {
          if (!isUnmountedRef.current) {
            setConnectionStatus("disconnected");
            handleRetry();
          }
        });
      } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
        // For Safari which has native HLS support
        videoElement.src = streamUrl;
        videoElement.addEventListener("loadedmetadata", () => {
          if (!isUnmountedRef.current) {
            setIsLoading(false);
            setConnectionStatus("connected");
            setRetryCount(0);

            videoElement.play().catch((err) => {
              console.error("Error playing video:", err);
              if (!isUnmountedRef.current) {
                setHasError(true);
                setConnectionStatus("disconnected");
              }
            });
          }
        });

        videoElement.addEventListener("error", () => {
          if (!isUnmountedRef.current) {
            setHasError(true);
            setConnectionStatus("disconnected");
            handleRetry();
          }
        });
      }
    } catch (error) {
      console.error("Error initializing stream:", error);
      if (!isUnmountedRef.current) {
        setHasError(true);
        setConnectionStatus("disconnected");
        handleRetry();
      }
    }
  }, [camera.id, camera.ip_address, camera.name, getStreamUrl, handleRetry]);

  // Initialize stream on mount and when camera changes
  useEffect(() => {
    isUnmountedRef.current = false;
    initializeStream();

    return () => {
      isUnmountedRef.current = true;

      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Cleanup HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initializeStream]);

  // Handle expand click
  const handleExpand = () => {
    if (onExpand) {
      onExpand(camera);
    }
  };

  // Get connection status icon and color
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
          "absolute inset-0 h-full w-full object-contain bg-black",
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
            <p className="text-sm text-muted-foreground mb-2">No Signal</p>
            {retryCount < MAX_RETRIES && (
              <p className="text-xs text-muted-foreground">
                Retrying... ({retryCount}/{MAX_RETRIES})
              </p>
            )}
          </div>
        </div>
      )}

      {/* Camera Info Overlay */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
        {/* Camera Name and Status */}
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

        {/* Connection Status Indicator */}
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
    </motion.div>
  );
}
