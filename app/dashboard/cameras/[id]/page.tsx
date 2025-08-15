"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Video, Settings } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import Hls from "hls.js";

interface Camera {
  _id: string;
  name: string;
  ip_address: string;
  location: string;
  status: string;
  stream_url: string;
}

export default function CameraViewPage() {
  const params = useParams();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isStreamLoading, setIsStreamLoading] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      console.log("Fetching camera with ID:", params.id);
      fetchCamera();
    }
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [params.id]);

  const fetchCamera = async () => {
    try {
      setIsLoading(true);
      
      // Get token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }
      
      console.log("Making request to /api/cameras/" + params.id);
      const response = await fetch(`/api/cameras/${params.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch camera");
      }

      const data = await response.json();
      console.log("Fetched camera data:", data);
      setCamera(data);

      // Get stream URL
      console.log("Getting stream URL for camera:", params.id);
      setIsStreamLoading(true);
      setStreamError("");
      
      const streamResponse = await fetch(`/api/stream/${params.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        console.log("Got stream data:", streamData);
        setStreamUrl(streamData.url || streamData.streamUrl);
      } else {
        const errorData = await streamResponse.json().catch(() => ({} as any));
        const message = errorData?.error || `Failed to get stream URL (${streamResponse.status})`;
        const details = errorData?.details || "";
        setStreamError(details ? `${message}: ${details}` : message);
        throw new Error(message);
      }
    } catch (error: any) {
      console.error("Error in fetchCamera:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch camera",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsStreamLoading(false);
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!streamUrl || !videoElement) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 3,
        maxMaxBufferLength: 30,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferHole: 0.3,
        liveSyncDurationCount: 1,
        maxLiveSyncPlaybackRate: 1.5,
        liveMaxLatencyDurationCount: 5,
        liveDurationInfinity: true,
        debug: false,
        autoStartLoad: true,
        startPosition: -1,
        capLevelToPlayerSize: true,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch(() => {
          setStreamError("Autoplay blocked. Click play.");
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setStreamError("Stream error. Retrying…");
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              break;
          }
        }
      });
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      videoElement.src = streamUrl;
      videoElement.addEventListener("loadedmetadata", () => {
        videoElement.play().catch(() => {
          setStreamError("Autoplay blocked. Click play.");
        });
      });
    }
  }, [streamUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="w-full p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Camera not found</h1>
          <p className="text-gray-500 mb-4">Camera ID: {params.id}</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{camera.name}</h1>
          <p className="text-gray-500">{camera.location}</p>
        </div>
        <div className="flex gap-4">
          <Link href={`/dashboard/cameras/${params.id}/settings`}>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Camera Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {streamUrl ? (
                <div
                  className="relative w-full bg-black rounded-lg overflow-hidden"
                  style={{ aspectRatio: "16/9" }}
                >
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    controls
                    muted
                    autoPlay
                    playsInline
                    crossOrigin="anonymous"
                  />
                  {isStreamLoading && (
                    <div className="absolute inset-0 grid place-items-center text-white/80">
                      <span>Loading stream…</span>
                    </div>
                  )}
                  {streamError && (
                    <div className="absolute bottom-2 left-2 right-2 rounded bg-black/60 p-2 text-xs text-white">
                      {streamError}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
                  style={{ aspectRatio: "16/9" }}
                >
                  <div className="text-center">
                    <p className="text-gray-600 mb-2">No stream available</p>
                    {streamError && (
                      <p className="text-xs text-red-600 mb-2">{streamError}</p>
                    )}
                    <Button variant="outline" onClick={fetchCamera}>Retry</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Camera Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p
                    className={`mt-1 text-sm ${
                      camera.status === "online"
                        ? "text-green-600"
                        : camera.status === "offline"
                        ? "text-gray-600"
                        : "text-red-600"
                    }`}
                  >
                    {camera.status}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    IP Address
                  </h3>
                  <p className="mt-1 text-sm">{camera.ip_address}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Location
                  </h3>
                  <p className="mt-1 text-sm">{camera.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
