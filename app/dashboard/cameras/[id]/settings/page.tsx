"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowLeft, Save, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ip_address: z.string().min(1, "IP address is required"),
  location: z.string().min(1, "Location is required"),
  camera_type: z.enum(["ip", "rtsp", "onvif", "hikvision", "dahua"]),
  description: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  enable_motion_detection: z.boolean(),
  enable_sound_detection: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

export default function CameraSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [camera, setCamera] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      ip_address: "",
      location: "",
      camera_type: "ip",
      description: "",
      username: "",
      password: "",
      enable_motion_detection: true,
      enable_sound_detection: false,
    },
  })

  // Fetch camera data
  useEffect(() => {
    const fetchCamera = async () => {
      try {
        const response = await fetch(`/api/cameras/${params.id}`)
        if (!response.ok) {
          throw new Error("Failed to fetch camera")
        }
        const cameraData = await response.json()
        setCamera(cameraData)
        
        // Update form with camera data
        form.reset({
          name: cameraData.name || "",
          ip_address: cameraData.ip_address || "",
          location: cameraData.location || "",
          camera_type: cameraData.camera_type || "ip",
          description: cameraData.description || "",
          username: cameraData.username || "",
          password: cameraData.password || "",
          enable_motion_detection: cameraData.enable_motion_detection ?? true,
          enable_sound_detection: cameraData.enable_sound_detection ?? false,
        })
      } catch (error) {
        console.error("Error fetching camera:", error)
        toast({
          title: "Error",
          description: "Failed to load camera settings",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchCamera()
    }
  }, [params.id, form, toast])

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSaving(true)
      
      const response = await fetch(`/api/cameras/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update camera")
      }

      toast({
        title: "Success",
        description: "Camera settings updated successfully",
      })

      // Refresh camera data
      const updatedCamera = await response.json()
      setCamera(updatedCamera)
    } catch (error: any) {
      console.error("Error updating camera:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update camera settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this camera? This action cannot be undone.")) {
      return
    }

    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/cameras/${params.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete camera")
      }

      toast({
        title: "Success",
        description: "Camera deleted successfully",
      })

      router.push("/dashboard/cameras")
    } catch (error: any) {
      console.error("Error deleting camera:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete camera",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!camera) {
    return (
      <div className="w-full p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Camera Not Found</h1>
          <p className="text-muted-foreground mt-2">The camera you're looking for doesn't exist.</p>
          <Link href="/dashboard/cameras">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cameras
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Camera Settings</h1>
          <p className="text-muted-foreground">{camera.name} - {camera.location}</p>
        </div>
        <div className="flex gap-4">
          <Link href={`/dashboard/cameras/${params.id}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Camera
            </Button>
          </Link>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the basic details of your camera
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Camera Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Front Door Camera" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Front Door" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ip_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP Address / Stream URL</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.100" {...field} />
                      </FormControl>
                      <FormDescription>
                        The IP address or full RTSP URL of your camera
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="camera_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Camera Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select camera type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ip">IP Camera</SelectItem>
                          <SelectItem value="rtsp">RTSP Stream</SelectItem>
                          <SelectItem value="onvif">ONVIF Camera</SelectItem>
                          <SelectItem value="hikvision">Hikvision Camera</SelectItem>
                          <SelectItem value="dahua">Dahua Camera</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details about this camera"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Configure camera authentication credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password (Optional)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detection Settings</CardTitle>
              <CardDescription>
                Configure motion and sound detection features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enable_motion_detection"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Motion Detection</FormLabel>
                      <FormDescription>
                        Receive alerts when motion is detected
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_sound_detection"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Sound Detection</FormLabel>
                      <FormDescription>
                        Receive alerts when sound is detected
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Camera
                </>
              )}
            </Button>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
