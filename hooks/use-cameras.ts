"use client";
import type { Camera } from "@/types/camera";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function useCameras() {
  const [error, setError] = useState<Error | null>(null);

  const {
    data: cameras,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      try {
        // Get token from localStorage
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          console.error("No authentication token found");
          throw new Error("Authentication required");
        }

        console.log("Fetching cameras with token:", token.substring(0, 20) + "...");

        // Fetch cameras from the API
        const response = await fetch("/api/cameras", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        
        console.log("Cameras API response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Cameras API error:", errorText);
          throw new Error("Failed to fetch cameras");
        }
        
        const data = await response.json();
        console.log("Cameras fetched successfully:", data);
        return data;
      } catch (err) {
        console.error("Error in useCameras hook:", err);
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("Failed to fetch cameras"));
        }
        return [];
      }
    },
  });

  return {
    cameras,
    isLoading,
    error,
    refetch,
  };
}

export function useCamera(id: string) {
  const [error, setError] = useState<Error | null>(null);

  const {
    data: camera,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["camera", id],
    queryFn: async () => {
      try {
        // Get token from localStorage
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          throw new Error("Authentication required");
        }

        // Fetch specific camera from the API
        const response = await fetch(`/api/cameras/${id}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Camera not found");
        }
        const data = await response.json();
        return data;
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("Failed to fetch camera"));
        }
        throw err;
      }
    },
  });

  return {
    camera,
    isLoading,
    error,
    refetch,
  };
}

export function useTestCameraConnection() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<any>(null);

  const testConnection = async (ip_address: string, camera_type = "ip") => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // In a real app, this would call the API to test the camera connection
      // const response = await api.post("/api/cameras/test-connection", { ip_address, camera_type })
      // setResult(response.data)

      // For demo purposes, we'll just simulate a successful connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Randomly succeed or fail for demo purposes
      const success = Math.random() > 0.3;

      if (success) {
        setResult({
          ip_address,
          url: ip_address.startsWith("rtsp://") || ip_address.startsWith("http://") || ip_address.startsWith("https://")
            ? ip_address
            : `http://${ip_address}`,
          is_reachable: true,
          status: "online",
        });
      } else {
        throw new Error(
          "Could not connect to camera. Please check the IP address and try again."
        );
      }

      return success;
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error("Failed to test camera connection"));
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    testConnection,
    isLoading,
    error,
    result,
  };
}
