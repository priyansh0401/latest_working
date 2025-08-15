"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Camera as CameraType } from "@/types/camera";
import {
  Edit,
  MoreHorizontal,
  Play,
  Settings,
  Trash2,
  Video,
  VideoOff,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Hls from "hls.js";

interface CameraCardProps {
  camera: CameraType;
  index?: number;
}

export function CameraCard({ camera, index = 0 }: CameraCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Function to handle video playback
  const togglePlayback = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err);
        setHasError(true);
      });
    }

    setIsPlaying(!isPlaying);
  };

  // Function to toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Function to get the appropriate stream URL based on camera type
  const getStreamUrl = async () => {
    if (!camera.ip_address) return "";

    try {
      // Get the HLS stream URL from our API
      const response = await fetch(`/api/stream/${camera.id}`);
      if (!response.ok) {
        throw new Error("Failed to get stream URL");
      }
      const data = await response.json();
      return data.url || data.streamUrl; // Handle both new and old response formats
    } catch (error) {
      console.error("Error getting stream URL:", error);
      setHasError(true);
      return "";
    }
  };

  // Initialize HLS.js for RTSP streams
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || camera.status !== "online") return;

    let hls: Hls | null = null;

    const initializeStream = async () => {
      const streamUrl = await getStreamUrl();
      if (!streamUrl) return;

      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 5,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          liveSyncDurationCount: 1,
          maxLiveSyncPlaybackRate: 2,
          liveMaxLatencyDurationCount: 10,
          liveDurationInfinity: true,
          debug: false, // Disable debug logs for production
          autoStartLoad: true,
          startPosition: -1, // Start from live edge
          capLevelToPlayerSize: true,
          testBandwidth: true,
          progressive: false,
          xhrSetup: (xhr: any, url: string) => {
            xhr.timeout = 10000; // 10 second timeout
          },
        });

        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS manifest parsed successfully");
          setIsLoading(false);
          videoElement.play().catch((err) => {
            console.error("Error playing video:", err);
            setHasError(true);
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
          if (data.fatal) {
            setHasError(true);
            setIsLoading(false);
            // Try to recover from fatal errors
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Network error, trying to recover...");
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Media error, trying to recover...");
                hls?.recoverMediaError();
                break;
              default:
                console.log("Fatal error, cannot recover");
                break;
            }
          }
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log("HLS media attached");
        });

        hls.on(Hls.Events.LEVEL_LOADED, () => {
          console.log("HLS level loaded");
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          // Fragment loaded successfully
        });
      } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
        // For Safari which has native HLS support
        videoElement.src = streamUrl;
        videoElement.addEventListener("loadedmetadata", () => {
          setIsLoading(false);
          videoElement.play().catch((err) => {
            console.error("Error playing video:", err);
            setHasError(true);
          });
        });
      }
    };

    initializeStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [camera.id, camera.ip_address, camera.camera_type, camera.status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="p-0">
          <div
            className="relative w-full bg-muted"
            style={{ aspectRatio: "16/9" }}
          >
            {camera.status === "online" ? (
              <>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Skeleton className="h-full w-full" />
                  </div>
                )}
                <video
                  ref={videoRef}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover rounded-t-lg",
                    isLoading && "opacity-0"
                  )}
                  muted
                  playsInline
                  loop
                />
                {hasError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                    <p className="text-sm text-muted-foreground">
                      Failed to load camera stream
                    </p>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={togglePlayback}
                  >
                    {isPlaying ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    <span className="sr-only">
                      {isPlaying ? "Pause" : "Play"}
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                    <span className="sr-only">
                      {isMuted ? "Unmute" : "Mute"}
                    </span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <VideoOff className="h-10 w-10 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute bottom-2 right-2">
              <Badge
                variant={camera.status === "online" ? "default" : "secondary"}
                className={`${
                  camera.status === "online" ? "bg-green-500" : "bg-gray-400"
                } text-white`}
              >
                {camera.status === "online" ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <h3 className="text-base font-medium">{camera.name}</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuLabel>Camera Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Play className="mr-2 h-4 w-4" />
                  <span>View Stream</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Camera</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {camera.location}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between p-4 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-full"
          >
            <Play className="h-3 w-3" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-full"
          >
            <Settings className="h-3 w-3" />
            Settings
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
