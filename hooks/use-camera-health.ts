"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Camera } from "@/types/camera";

interface CameraHealthStatus {
  cameraId: string;
  isHealthy: boolean;
  lastSeen: number;
  consecutiveFailures: number;
  averageLatency: number;
  streamQuality: "high" | "medium" | "low" | "unknown";
  errorHistory: Array<{
    timestamp: number;
    error: string;
    type: "connection" | "stream" | "timeout" | "network";
  }>;
}

interface HealthCheckResult {
  success: boolean;
  latency: number;
  error?: string;
  errorType?: "connection" | "stream" | "timeout" | "network";
}

export function useCameraHealth(cameras: Camera[]) {
  const [healthStatuses, setHealthStatuses] = useState<Map<string, CameraHealthStatus>>(new Map());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Initialize health status for a camera
  const initializeCameraHealth = useCallback((camera: Camera): CameraHealthStatus => {
    return {
      cameraId: camera.id,
      isHealthy: camera.status === "online",
      lastSeen: Date.now(),
      consecutiveFailures: 0,
      averageLatency: 0,
      streamQuality: "unknown",
      errorHistory: [],
    };
  }, []);

  // Perform health check for a single camera
  const performHealthCheck = useCallback(async (camera: Camera): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    // Cancel any existing request for this camera
    const existingController = abortControllers.current.get(camera.id);
    if (existingController) {
      existingController.abort();
    }

    const controller = new AbortController();
    abortControllers.current.set(camera.id, controller);

    try {
      // Test camera connectivity with a lightweight request
      const response = await fetch(`/api/cameras/${camera.id}/health`, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          latency,
        };
      } else {
        return {
          success: false,
          latency,
          error: `HTTP ${response.status}: ${response.statusText}`,
          errorType: "connection",
        };
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      if (error.name === "AbortError") {
        return {
          success: false,
          latency,
          error: "Request aborted",
          errorType: "timeout",
        };
      }

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return {
          success: false,
          latency,
          error: "Network error",
          errorType: "network",
        };
      }

      return {
        success: false,
        latency,
        error: error.message || "Unknown error",
        errorType: "connection",
      };
    } finally {
      abortControllers.current.delete(camera.id);
    }
  }, []);

  // Update health status based on check result
  const updateHealthStatus = useCallback((
    cameraId: string, 
    result: HealthCheckResult
  ) => {
    setHealthStatuses(prev => {
      const newStatuses = new Map(prev);
      const currentStatus = newStatuses.get(cameraId);
      
      if (!currentStatus) return newStatuses;

      const updatedStatus: CameraHealthStatus = {
        ...currentStatus,
        lastSeen: result.success ? Date.now() : currentStatus.lastSeen,
        consecutiveFailures: result.success ? 0 : currentStatus.consecutiveFailures + 1,
        isHealthy: result.success && currentStatus.consecutiveFailures < 3,
        averageLatency: result.success 
          ? (currentStatus.averageLatency + result.latency) / 2
          : currentStatus.averageLatency,
      };

      // Add error to history if failed
      if (!result.success && result.error) {
        updatedStatus.errorHistory = [
          ...currentStatus.errorHistory.slice(-9), // Keep last 10 errors
          {
            timestamp: Date.now(),
            error: result.error,
            type: result.errorType || "connection",
          },
        ];
      }

      // Determine stream quality based on latency and health
      if (result.success) {
        if (result.latency < 100) {
          updatedStatus.streamQuality = "high";
        } else if (result.latency < 300) {
          updatedStatus.streamQuality = "medium";
        } else {
          updatedStatus.streamQuality = "low";
        }
      }

      newStatuses.set(cameraId, updatedStatus);
      return newStatuses;
    });
  }, []);

  // Start health monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    const checkAllCameras = async () => {
      const promises = cameras.map(async (camera) => {
        const result = await performHealthCheck(camera);
        updateHealthStatus(camera.id, result);
      });

      await Promise.allSettled(promises);
    };

    // Initial check
    checkAllCameras();

    // Set up interval for regular checks
    healthCheckInterval.current = setInterval(checkAllCameras, 30000); // Check every 30 seconds
  }, [cameras, isMonitoring, performHealthCheck, updateHealthStatus]);

  // Stop health monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (healthCheckInterval.current) {
      clearInterval(healthCheckInterval.current);
      healthCheckInterval.current = null;
    }

    // Abort any pending requests
    for (const controller of abortControllers.current.values()) {
      controller.abort();
    }
    abortControllers.current.clear();
  }, []);

  // Initialize health statuses when cameras change
  useEffect(() => {
    const newStatuses = new Map<string, CameraHealthStatus>();
    
    cameras.forEach(camera => {
      const existingStatus = healthStatuses.get(camera.id);
      if (existingStatus) {
        newStatuses.set(camera.id, existingStatus);
      } else {
        newStatuses.set(camera.id, initializeCameraHealth(camera));
      }
    });

    setHealthStatuses(newStatuses);
  }, [cameras, initializeCameraHealth]);

  // Auto-start monitoring when cameras are available
  useEffect(() => {
    if (cameras.length > 0 && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [cameras.length, isMonitoring, startMonitoring, stopMonitoring]);

  // Get health status for a specific camera
  const getCameraHealth = useCallback((cameraId: string): CameraHealthStatus | null => {
    return healthStatuses.get(cameraId) || null;
  }, [healthStatuses]);

  // Get overall health statistics
  const getOverallHealth = useCallback(() => {
    const statuses = Array.from(healthStatuses.values());
    const total = statuses.length;
    const healthy = statuses.filter(s => s.isHealthy).length;
    const unhealthy = total - healthy;
    const averageLatency = statuses.reduce((sum, s) => sum + s.averageLatency, 0) / total || 0;

    return {
      total,
      healthy,
      unhealthy,
      healthPercentage: total > 0 ? (healthy / total) * 100 : 0,
      averageLatency,
    };
  }, [healthStatuses]);

  // Force health check for a specific camera
  const forceHealthCheck = useCallback(async (cameraId: string) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;

    const result = await performHealthCheck(camera);
    updateHealthStatus(cameraId, result);
    return result;
  }, [cameras, performHealthCheck, updateHealthStatus]);

  return {
    healthStatuses: Array.from(healthStatuses.values()),
    getCameraHealth,
    getOverallHealth,
    forceHealthCheck,
    startMonitoring,
    stopMonitoring,
    isMonitoring,
  };
}
