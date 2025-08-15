"use client"

import { CameraCard } from "@/components/camera-card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { useCameras } from "@/hooks/use-cameras"
import { Camera, Plus, RefreshCw, Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export default function CamerasPage() {
  const { user } = useAuth()
  const { cameras, isLoading, error, refetch } = useCameras()
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Setup WebSocket connection for alerts
  useEffect(() => {
    if (!user) return

    // In a real app, this would connect to a real WebSocket server
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsHost = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, "").replace("/api", "")
      : "localhost:8000"
    const wsUrl = `${wsProtocol}//${wsHost}/ws/alerts/${user.id}/`

    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log("WebSocket connection established")
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        toast({
          title: `Alert: ${data.alert_type}`,
          description: `Camera: ${data.camera_name} - ${data.message}`,
          variant: "destructive",
        })
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }

      ws.onclose = () => {
        console.log("WebSocket connection closed")
      }
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error)
    }

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [user, toast])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  // Filter cameras based on search query and status filter
  const filteredCameras = cameras?.filter((camera) => {
    const matchesSearch =
      camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.location.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || camera.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  }

  return (
    <motion.div className="space-y-6 px-4 sm:px-6 lg:px-8" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cameras</h1>
          <p className="text-muted-foreground">Manage and monitor your security cameras</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/dashboard/add-camera">
            <Button size="sm" className="rounded-full" variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Camera
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cameras..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cameras</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[280px] rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="aspect-video w-full rounded-md bg-muted/50 mb-4"></div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <motion.div
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>Error loading cameras: {error.message}</p>
          </motion.div>
        ) : filteredCameras && filteredCameras.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCameras.map((camera, index) => (
              <CameraCard key={camera.id} camera={camera} index={index} />
            ))}
          </div>
        ) : (
          <motion.div
            className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Camera className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No cameras found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No cameras match your search criteria. Try adjusting your filters."
                : "You haven't added any cameras yet. Add your first camera to start monitoring."}
            </p>
            <Link href="/dashboard/add-camera" className="mt-4">
              <Button className="rounded-full" variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Add Camera
              </Button>
            </Link>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
