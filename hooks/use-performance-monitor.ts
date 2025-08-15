"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { streamManager } from "@/lib/stream-manager";

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  streamCount: number;
  activeStreams: number;
  renderTime: number;
  isPerformanceGood: boolean;
}

interface PerformanceThresholds {
  minFps: number;
  maxMemoryMB: number;
  maxRenderTime: number;
}

export function usePerformanceMonitor(
  thresholds: PerformanceThresholds = {
    minFps: 25,
    maxMemoryMB: 500,
    maxRenderTime: 16, // 60fps = 16ms per frame
  }
) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    streamCount: 0,
    activeStreams: 0,
    renderTime: 0,
    isPerformanceGood: true,
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderTimesRef = useRef<number[]>([]);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // FPS monitoring using requestAnimationFrame
  const measureFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;

    // Calculate FPS every second
    if (now - lastTimeRef.current >= 1000) {
      const fps = (frameCountRef.current * 1000) / (now - lastTimeRef.current);
      
      setMetrics(prev => ({
        ...prev,
        fps: Math.round(fps),
      }));

      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    if (isMonitoring) {
      rafIdRef.current = requestAnimationFrame(measureFPS);
    }
  }, [isMonitoring]);

  // Measure render performance
  const measureRenderTime = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime;
    renderTimesRef.current.push(renderTime);

    // Keep only last 60 measurements (1 second at 60fps)
    if (renderTimesRef.current.length > 60) {
      renderTimesRef.current.shift();
    }

    const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
    
    setMetrics(prev => ({
      ...prev,
      renderTime: averageRenderTime,
    }));
  }, []);

  // Get memory usage
  const getMemoryUsage = useCallback((): number => {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    
    // Fallback estimation based on stream count
    const streamStats = streamManager.getMemoryStats();
    return streamStats.memoryUsage / (1024 * 1024);
  }, []);

  // Estimate CPU usage (rough approximation)
  const estimateCPUUsage = useCallback((): number => {
    const { fps, renderTime } = metrics;
    
    // Simple heuristic: high render time + low fps = high CPU usage
    if (renderTime > thresholds.maxRenderTime && fps < thresholds.minFps) {
      return Math.min(100, (renderTime / thresholds.maxRenderTime) * 50);
    }
    
    // Normal usage estimation
    return Math.min(100, (renderTime / thresholds.maxRenderTime) * 30);
  }, [metrics, thresholds]);

  // Update performance metrics
  const updateMetrics = useCallback(() => {
    const streamStats = streamManager.getStreamStats();
    const memoryUsage = getMemoryUsage();
    const cpuUsage = estimateCPUUsage();

    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        memoryUsage,
        cpuUsage,
        streamCount: streamStats.total,
        activeStreams: streamStats.active,
        isPerformanceGood: 
          prev.fps >= thresholds.minFps &&
          memoryUsage <= thresholds.maxMemoryMB &&
          prev.renderTime <= thresholds.maxRenderTime,
      };

      return newMetrics;
    });
  }, [getMemoryUsage, estimateCPUUsage, thresholds]);

  // Performance optimization suggestions
  const getOptimizationSuggestions = useCallback((): string[] => {
    const suggestions: string[] = [];

    if (metrics.fps < thresholds.minFps) {
      suggestions.push("Low FPS detected. Consider reducing the number of active streams.");
    }

    if (metrics.memoryUsage > thresholds.maxMemoryMB) {
      suggestions.push("High memory usage. Close unused camera feeds or refresh the page.");
    }

    if (metrics.renderTime > thresholds.maxRenderTime) {
      suggestions.push("High render time. Reduce video quality or close background applications.");
    }

    if (metrics.activeStreams > 9) {
      suggestions.push("Many active streams. Consider using a grid view with fewer visible cameras.");
    }

    if (metrics.cpuUsage > 80) {
      suggestions.push("High CPU usage detected. Close other applications or reduce stream quality.");
    }

    return suggestions;
  }, [metrics, thresholds]);

  // Auto-optimize performance
  const autoOptimize = useCallback(() => {
    if (!metrics.isPerformanceGood) {
      // Force cleanup of inactive streams
      streamManager.forceCleanup();

      // If still having issues, could implement additional optimizations
      if (metrics.memoryUsage > thresholds.maxMemoryMB * 1.5) {
        console.warn("Performance: High memory usage, forcing cleanup");
        // Could emit event to reduce stream quality or count
      }
    }
  }, [metrics, thresholds]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();

    // Start FPS monitoring
    rafIdRef.current = requestAnimationFrame(measureFPS);

    // Start periodic metrics update
    monitoringIntervalRef.current = setInterval(updateMetrics, 2000); // Every 2 seconds
  }, [isMonitoring, measureFPS, updateMetrics]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    startMonitoring();
    return stopMonitoring;
  }, [startMonitoring, stopMonitoring]);

  // Auto-optimize when performance is poor
  useEffect(() => {
    if (!metrics.isPerformanceGood) {
      const timeoutId = setTimeout(autoOptimize, 5000); // Wait 5 seconds before auto-optimizing
      return () => clearTimeout(timeoutId);
    }
  }, [metrics.isPerformanceGood, autoOptimize]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    measureRenderTime,
    getOptimizationSuggestions,
    autoOptimize,
    forceCleanup: () => streamManager.forceCleanup(),
  };
}
