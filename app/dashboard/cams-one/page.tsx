"use client";

import { CamsOneGrid } from "@/components/cams-one-grid";
import { useAuth } from "@/context/auth-context";
import { useCameras } from "@/hooks/use-cameras";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function CamsOnePage() {
  const { user } = useAuth();
  const { cameras, isLoading, error, refetch } = useCameras();
  const { toast } = useToast();

  // Setup WebSocket connection for real-time alerts
  useEffect(() => {
    if (!user) return;

    // WebSocket connection for real-time camera status updates
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, "").replace("/api", "")
      : "localhost:8000";
    const wsUrl = `${wsProtocol}//${wsHost}/ws/alerts/${user.id}/`;

    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("CamsOne WebSocket connection established");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Show toast notifications for camera alerts
        toast({
          title: `Camera Alert: ${data.alert_type}`,
          description: `${data.camera_name} - ${data.message}`,
          variant: data.alert_type === "motion_detected" ? "default" : "destructive",
        });

        // Refresh camera data if there's a status change
        if (data.alert_type === "camera_offline" || data.alert_type === "camera_online") {
          refetch();
        }
      };

      ws.onerror = (error) => {
        console.error("CamsOne WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("CamsOne WebSocket connection closed");
      };
    } catch (error) {
      console.error("Failed to connect to CamsOne WebSocket:", error);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [user, toast, refetch]);

  // Handle error state
  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Cameras",
        description: "Failed to load camera data. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <motion.div
      className="w-full px-4 py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <CamsOneGrid
        cameras={cameras || []}
        isLoading={isLoading}
        onRefresh={refetch}
      />
    </motion.div>
  );
}
