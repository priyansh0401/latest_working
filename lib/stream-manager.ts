"use client";

import Hls from "hls.js";

interface StreamInstance {
  hls: Hls;
  videoElement: HTMLVideoElement;
  cameraId: string;
  isActive: boolean;
  lastActivity: number;
  retryCount: number;
  priority: boolean;
}

interface StreamConfig {
  cameraId: string;
  videoElement: HTMLVideoElement;
  streamUrl: string;
  priority?: boolean;
  onStatusChange?: (
    status: "connecting" | "connected" | "disconnected"
  ) => void;
  onError?: (error: any) => void;
}

class StreamManager {
  private streams: Map<string, StreamInstance> = new Map();
  private maxConcurrentStreams = 16; // Limit concurrent streams for performance
  private cleanupInterval: NodeJS.Timeout | null = null;
  private bandwidthMonitor: BandwidthMonitor;

  constructor() {
    this.bandwidthMonitor = new BandwidthMonitor();
    this.startCleanupInterval();
  }

  // Create optimized HLS configuration based on priority and bandwidth
  private createHLSConfig(priority: boolean, bandwidth: number): any {
    const baseConfig = {
      enableWorker: true,
      lowLatencyMode: true,
      debug: false,
      autoStartLoad: true,
      startPosition: -1,
      capLevelToPlayerSize: true,
      progressive: false,
    };

    // Adjust configuration based on priority and bandwidth
    if (priority) {
      return {
        ...baseConfig,
        backBufferLength: 60,
        maxBufferLength: 5,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        liveSyncDurationCount: 1,
        maxLiveSyncPlaybackRate: 2,
        liveMaxLatencyDurationCount: 8,
        testBandwidth: true,
        xhrSetup: (xhr: any, url: string) => {
          xhr.timeout = 10000;
        },
      };
    } else {
      // Lower quality settings for non-priority streams
      return {
        ...baseConfig,
        backBufferLength: 30,
        maxBufferLength: 2,
        maxMaxBufferLength: 30,
        maxBufferSize: 20 * 1000 * 1000,
        maxBufferHole: 0.8,
        liveSyncDurationCount: 2,
        maxLiveSyncPlaybackRate: 1.2,
        liveMaxLatencyDurationCount: 12,
        testBandwidth: false,
        xhrSetup: (xhr: any, url: string) => {
          xhr.timeout = 6000;
        },
      };
    }
  }

  // Add a new stream
  async addStream(config: StreamConfig): Promise<boolean> {
    const {
      cameraId,
      videoElement,
      streamUrl,
      priority = false,
      onStatusChange,
      onError,
    } = config;

    // Check if we've reached the maximum concurrent streams
    if (this.streams.size >= this.maxConcurrentStreams) {
      // Remove least recently used non-priority stream
      this.removeLeastRecentlyUsedStream();
    }

    // Remove existing stream if it exists
    this.removeStream(cameraId);

    try {
      onStatusChange?.("connecting");

      const bandwidth = this.bandwidthMonitor.getCurrentBandwidth();
      const hlsConfig = this.createHLSConfig(priority, bandwidth);

      if (!Hls.isSupported()) {
        // Fallback for Safari
        if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
          videoElement.src = streamUrl;
          videoElement.addEventListener("loadedmetadata", () => {
            onStatusChange?.("connected");
            videoElement.play().catch(onError);
          });
          videoElement.addEventListener("error", onError);
          return true;
        }
        throw new Error("HLS not supported");
      }

      const hls = new Hls(hlsConfig);

      // Set up event listeners
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onStatusChange?.("connected");
        videoElement.play().catch(onError);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error(`HLS error for camera ${cameraId}:`, data);
        if (data.fatal) {
          onStatusChange?.("disconnected");
          onError?.(data);
          this.handleStreamError(cameraId);
        }
      });

      hls.on(Hls.Events.FRAG_LOAD_ERROR, () => {
        onStatusChange?.("disconnected");
        this.handleStreamError(cameraId);
      });

      // Load and attach the stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);

      // Store the stream instance
      const streamInstance: StreamInstance = {
        hls,
        videoElement,
        cameraId,
        isActive: true,
        lastActivity: Date.now(),
        retryCount: 0,
        priority,
      };

      this.streams.set(cameraId, streamInstance);
      return true;
    } catch (error) {
      console.error(`Failed to add stream for camera ${cameraId}:`, error);
      onStatusChange?.("disconnected");
      onError?.(error);
      return false;
    }
  }

  // Remove a stream
  removeStream(cameraId: string): void {
    const stream = this.streams.get(cameraId);
    if (stream) {
      try {
        stream.hls.destroy();
      } catch (error) {
        console.error(`Error destroying HLS for camera ${cameraId}:`, error);
      }
      this.streams.delete(cameraId);
    }
  }

  // Update stream activity (call when stream is visible)
  updateStreamActivity(cameraId: string): void {
    const stream = this.streams.get(cameraId);
    if (stream) {
      stream.lastActivity = Date.now();
    }
  }

  // Handle stream errors with retry logic
  private handleStreamError(cameraId: string): void {
    const stream = this.streams.get(cameraId);
    if (stream && stream.retryCount < 3) {
      stream.retryCount++;

      // Exponential backoff for retries
      const retryDelay = Math.min(1000 * Math.pow(2, stream.retryCount), 10000);

      setTimeout(() => {
        if (this.streams.has(cameraId)) {
          // Retry the stream
          console.log(
            `Retrying stream for camera ${cameraId}, attempt ${stream.retryCount}`
          );
          // The retry logic would be handled by the component
        }
      }, retryDelay);
    }
  }

  // Remove least recently used non-priority stream
  private removeLeastRecentlyUsedStream(): void {
    let oldestStream: { cameraId: string; lastActivity: number } | null = null;

    for (const [cameraId, stream] of this.streams) {
      if (
        !stream.priority &&
        (!oldestStream || stream.lastActivity < oldestStream.lastActivity)
      ) {
        oldestStream = { cameraId, lastActivity: stream.lastActivity };
      }
    }

    if (oldestStream) {
      console.log(
        `Removing least recently used stream: ${oldestStream.cameraId}`
      );
      this.removeStream(oldestStream.cameraId);
    }
  }

  // Start cleanup interval to remove inactive streams
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [cameraId, stream] of this.streams) {
        if (!stream.priority && now - stream.lastActivity > inactiveThreshold) {
          console.log(`Removing inactive stream: ${cameraId}`);
          this.removeStream(cameraId);
        }
      }
    }, 60000); // Check every minute
  }

  // Get stream statistics
  getStreamStats(): { total: number; active: number; priority: number } {
    let active = 0;
    let priority = 0;

    for (const stream of this.streams.values()) {
      if (stream.isActive) active++;
      if (stream.priority) priority++;
    }

    return {
      total: this.streams.size,
      active,
      priority,
    };
  }

  // Get memory usage statistics
  getMemoryStats(): {
    totalStreams: number;
    activeStreams: number;
    memoryUsage: number;
    averageLatency: number;
  } {
    let activeStreams = 0;
    let totalLatency = 0;
    let memoryUsage = 0;

    for (const stream of this.streams.values()) {
      if (stream.isActive) {
        activeStreams++;
      }

      // Estimate memory usage (rough calculation)
      memoryUsage += 50 * 1024 * 1024; // ~50MB per stream estimate
    }

    // Get performance memory if available
    if (typeof performance !== "undefined" && (performance as any).memory) {
      const perfMemory = (performance as any).memory;
      memoryUsage = perfMemory.usedJSHeapSize || memoryUsage;
    }

    return {
      totalStreams: this.streams.size,
      activeStreams,
      memoryUsage,
      averageLatency: activeStreams > 0 ? totalLatency / activeStreams : 0,
    };
  }

  // Force garbage collection for streams (if possible)
  forceCleanup(): void {
    // Remove all inactive streams
    for (const [cameraId, stream] of this.streams) {
      if (!stream.isActive || Date.now() - stream.lastActivity > 60000) {
        // 1 minute
        this.removeStream(cameraId);
      }
    }

    // Suggest garbage collection if available
    if (typeof window !== "undefined" && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (e) {
        // Ignore if gc is not available
      }
    }
  }

  // Cleanup all streams
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    for (const [cameraId] of this.streams) {
      this.removeStream(cameraId);
    }

    this.streams.clear();

    // Force cleanup
    this.forceCleanup();
  }
}

// Bandwidth monitoring for adaptive streaming
class BandwidthMonitor {
  private measurements: number[] = [];
  private maxMeasurements = 10;

  getCurrentBandwidth(): number {
    if (this.measurements.length === 0) {
      return 5000000; // Default 5 Mbps
    }

    const sum = this.measurements.reduce((a, b) => a + b, 0);
    return sum / this.measurements.length;
  }

  addMeasurement(bandwidth: number): void {
    this.measurements.push(bandwidth);
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }
  }

  // Estimate bandwidth based on download performance
  async measureBandwidth(): Promise<number> {
    try {
      const startTime = performance.now();
      const response = await fetch("/api/bandwidth-test", {
        method: "HEAD",
        cache: "no-cache",
      });
      const endTime = performance.now();

      if (response.ok) {
        const duration = endTime - startTime;
        const estimatedBandwidth = (1000 / duration) * 1000000; // Rough estimate
        this.addMeasurement(estimatedBandwidth);
        return estimatedBandwidth;
      }
    } catch (error) {
      console.error("Bandwidth measurement failed:", error);
    }

    return this.getCurrentBandwidth();
  }
}

// Export singleton instance
export const streamManager = new StreamManager();
export type { StreamConfig };
