"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Video, Settings, Trash2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface Camera {
  _id: string
  name: string
  ip_address: string
  location: string
  status: string
  stream_url: string
}

export default function DashboardPage() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchCameras()
  }, [])

  const fetchCameras = async () => {
    try {
      setIsLoading(true)
      
      // Get token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }
      
      const response = await fetch("/api/cameras", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch cameras");
      }
      const data = await response.json();
      console.log("Dashboard fetched cameras:", data);
      setCameras(data);
    } catch (error: any) {
      console.error("Dashboard fetch error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch cameras",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCamera = async (id: string) => {
    try {
      // Get token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }
      
      const response = await fetch(`/api/cameras/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete camera");
      }
      toast({
        title: "Success",
        description: "Camera deleted successfully",
      });
      fetchCameras();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete camera",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Camera Dashboard</h1>
          <p className="text-gray-500 text-lg">Monitor and manage your cameras</p>
        </div>
        <Link href="/dashboard/add-camera" className="w-full md:w-auto">
          <Button size="lg" className="flex items-center gap-2 w-full md:w-auto">
            <Plus className="h-5 w-5" />
            Add Camera
          </Button>
        </Link>
      </div>

      {/* No Cameras State */}
      {cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-2xl font-semibold mb-4">No cameras found</h2>
          <p className="text-gray-500 mb-6">Add your first camera to get started</p>
          <Link href="/dashboard/add-camera">
            <Button size="lg" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Camera
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cameras.map((camera) => (
            <Card
              key={camera._id}
              className="flex flex-col h-full shadow-md hover:shadow-xl transition-shadow border border-gray-200 bg-white group"
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="w-3/4">
                  <CardTitle className="text-xl font-semibold truncate group-hover:text-blue-700 transition-colors">{camera.name}</CardTitle>
                  <CardDescription className="text-gray-500 truncate">{camera.location}</CardDescription>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                  camera.status === 'online' ? 'bg-green-100 text-green-700' :
                  camera.status === 'offline' ? 'bg-gray-100 text-gray-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {camera.status.charAt(0).toUpperCase() + camera.status.slice(1)}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 justify-between pt-0 pb-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">IP:</span>
                    <span className="truncate">{camera.ip_address}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Link href={`/dashboard/cameras/${camera._id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="flex items-center gap-1 w-full justify-center group-hover:border-blue-600">
                      <Video className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/dashboard/cameras/${camera._id}/settings`} className="flex-1">
                    <Button variant="outline" size="sm" className="flex items-center gap-1 w-full justify-center group-hover:border-blue-600">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-1 w-full justify-center"
                    onClick={() => deleteCamera(camera._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
