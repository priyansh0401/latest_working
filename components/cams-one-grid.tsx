"use client";

import { OptimizedCameraFeed } from "@/components/optimized-camera-feed";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useCameraHealth } from "@/hooks/use-camera-health";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Camera as CameraType } from "@/types/camera";
import {
  Grid3X3,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  Video,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface CamsOneGridProps {
  cameras: CameraType[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

// Wrapper component for individual camera feeds with intersection observer
function CameraFeedWrapper({
  camera,
  onExpand,
  priority,
}: {
  camera: CameraType;
  onExpand: (camera: CameraType) => void;
  priority: boolean;
}) {
  const { elementRef, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "100px", // Start loading when camera is 100px away from viewport
  });

  return (
    <div ref={elementRef}>
      <OptimizedCameraFeed
        camera={camera}
        onExpand={onExpand}
        priority={priority}
        isVisible={isVisible}
      />
    </div>
  );
}

export function CamsOneGrid({
  cameras,
  isLoading,
  onRefresh,
}: CamsOneGridProps) {
  const [expandedCamera, setExpandedCamera] = useState<CameraType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Health monitoring and network status
  const { getOverallHealth, isMonitoring } = useCameraHealth(cameras);
  const { isOnline, connectionQuality } = useNetworkStatus();
  const overallHealth = getOverallHealth();

  // Show all cameras; visually indicate offline
  const onlineCameras = useMemo(() => cameras, [cameras]);

  // Calculate grid layout based on number of cameras
  const getGridLayout = (count: number) => {
    if (count === 0) return { cols: 1, rows: 1, className: "grid-cols-1" };
    if (count === 1) return { cols: 1, rows: 1, className: "grid-cols-1" };
    if (count === 2) return { cols: 2, rows: 1, className: "grid-cols-2" };
    if (count <= 4) return { cols: 2, rows: 2, className: "grid-cols-2" };
    if (count <= 6) return { cols: 3, rows: 2, className: "grid-cols-3" };
    if (count <= 9) return { cols: 3, rows: 3, className: "grid-cols-3" };
    if (count <= 12) return { cols: 4, rows: 3, className: "grid-cols-4" };
    if (count <= 16) return { cols: 4, rows: 4, className: "grid-cols-4" };
    return { cols: 5, rows: Math.ceil(count / 5), className: "grid-cols-5" };
  };

  const gridLayout = getGridLayout(onlineCameras.length);

  // Handle camera expansion
  const handleExpand = (camera: CameraType) => {
    setExpandedCamera(camera);
  };

  const handleCloseExpanded = () => {
    setExpandedCamera(null);
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  // Close expanded view on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && expandedCamera) {
        handleCloseExpanded();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expandedCamera]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CamsOne</h1>
            <p className="text-muted-foreground">Loading camera feeds...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CamsOne</h1>
            <p className="text-muted-foreground">No cameras found</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Cameras Available</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add cameras to your system to view them in CamsOne.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CamsOne</h1>
            <p className="text-muted-foreground">
              Live feeds from all connected cameras
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {onlineCameras.length} Online
            </Badge>
            {cameras.length > onlineCameras.length && (
              <Badge variant="outline" className="gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                {cameras.length - onlineCameras.length} Offline
              </Badge>
            )}
            {/* Network Status Indicator */}
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                !isOnline && "border-red-500 text-red-500",
                connectionQuality === "poor" &&
                  isOnline &&
                  "border-orange-500 text-orange-500"
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  !isOnline
                    ? "bg-red-500"
                    : connectionQuality === "poor"
                    ? "bg-orange-500"
                    : "bg-green-500"
                )}
              />
              {!isOnline
                ? "Offline"
                : connectionQuality === "poor"
                ? "Poor"
                : "Online"}
            </Badge>
            {/* Health Status */}
            {isMonitoring && (
              <Badge variant="outline" className="gap-1">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    overallHealth.healthPercentage > 80
                      ? "bg-green-500"
                      : overallHealth.healthPercentage > 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  )}
                />
                {Math.round(overallHealth.healthPercentage)}% Healthy
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || !isOnline}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Grid Layout Info */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {gridLayout.cols}×{gridLayout.rows} grid layout (
            {onlineCameras.length} cameras)
          </span>
        </motion.div>

        {/* Camera Grid */}
        {onlineCameras.length > 0 ? (
          <motion.div
            variants={itemVariants}
            className={cn(
              "grid gap-4 auto-rows-fr",
              gridLayout.className,
              "sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {onlineCameras.map((camera, index) => (
              <CameraFeedWrapper
                key={camera.id}
                camera={camera}
                onExpand={handleExpand}
                priority={index < 4} // Prioritize first 4 cameras for performance
              />
            ))}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Online Cameras
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  All cameras are currently offline. Check your camera
                  connections.
                </p>
                <Button variant="outline" onClick={handleRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Status
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Fullscreen Expanded View */}
      <AnimatePresence>
        {expandedCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
            onClick={handleCloseExpanded}
          >
            <div className="absolute inset-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative h-full w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white border-none backdrop-blur-sm"
                  onClick={handleCloseExpanded}
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Camera Info */}
                <div className="absolute top-4 left-4 z-10">
                  <Badge className="bg-black/60 text-white border-none backdrop-blur-sm">
                    <span className="text-sm font-medium">
                      {expandedCamera.name}
                    </span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className="ml-2 bg-black/60 text-white border-white/20 backdrop-blur-sm"
                  >
                    <span className="text-sm">{expandedCamera.location}</span>
                  </Badge>
                </div>

                {/* Expanded Camera Feed */}
                <OptimizedCameraFeed
                  camera={expandedCamera}
                  className="h-full w-full"
                  priority={true}
                  isVisible={true}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
