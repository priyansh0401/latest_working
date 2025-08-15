"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, Camera, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ip_address: z.string().min(1, "IP address is required"),
  location: z.string().min(1, "Location is required"),
  camera_type: z.enum(["ip", "rtsp", "onvif", "hikvision", "dahua"]),
  description: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  enable_motion_detection: z.boolean().default(true),
  enable_sound_detection: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddCameraPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

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
  });

  const watchIpAddress = form.watch("ip_address");

  const testConnection = async () => {
    try {
      setIsTesting(true);
      const formData = form.getValues();

      // Clean the IP address of any existing rtsp:// prefix
      let cleanIp = formData.ip_address.replace(/^rtsp:\/\//, "");

      // Build the RTSP URL
      let rtspUrl = "rtsp://";

      // Add authentication if provided
      if (formData.username && formData.password) {
        rtspUrl += `${formData.username}:${formData.password}@`;
      }

      // Add IP address
      rtspUrl += cleanIp;

      // Add default paths based on camera type
      switch (formData.camera_type) {
        case "rtsp":
          rtspUrl += "/Streaming/Channels/101"; // Default Hikvision path
          break;
        case "ip":
          rtspUrl += "/cam/realmonitor?channel=1&subtype=0"; // Default Dahua path
          break;
        case "onvif":
          rtspUrl += "/axis-media/media.amp"; // Default Axis path
          break;
      }

      console.log("Testing connection with URL:", rtspUrl);

      // Get token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }

      const response = await fetch("/api/stream/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ url: rtspUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to test connection");
      }

      toast({
        title: "Success",
        description: "Camera connection successful",
      });
    } catch (error: any) {
      console.error("Error testing connection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to test camera connection",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      console.log("Submitting camera data:", data);

      // Validate form data
      const validatedData = formSchema.parse(data);
      console.log("Validated data:", validatedData);

      // Get token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }

      // Create camera
      const response = await fetch("/api/cameras", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(validatedData),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Camera created successfully:", result);

      toast({
        title: "Success",
        description: "Camera added successfully",
      });

      // Redirect to cameras page
      router.push("/dashboard/cameras");
    } catch (error: any) {
      console.error("Error creating camera:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add camera",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

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
  };

  return (
    <motion.div
      className="w-full px-4 sm:px-6 lg:px-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div
        variants={itemVariants}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Add Camera</h1>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          </TabsList>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Camera Details</CardTitle>
                      <CardDescription>
                        Add the basic information for your camera
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Camera Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Front Door Camera"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              A descriptive name for your camera
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
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select camera type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ip">IP Camera</SelectItem>
                                <SelectItem value="rtsp">
                                  RTSP Stream
                                </SelectItem>
                                <SelectItem value="onvif">
                                  ONVIF Camera
                                </SelectItem>
                                <SelectItem value="hikvision">
                                  Hikvision Camera
                                </SelectItem>
                                <SelectItem value="dahua">
                                  Dahua Camera
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select the type of camera you are adding
                            </FormDescription>
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
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="192.168.1.100" {...field} />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={testConnection}
                                disabled={isTesting || !watchIpAddress}
                              >
                                {isTesting ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="mr-2 h-4 w-4" />
                                )}
                                Test
                              </Button>
                            </div>
                            <FormDescription>
                              The IP address of your camera (e.g.,
                              192.168.1.100) or stream URL (e.g.,
                              rtsp://192.168.1.100:554/stream)
                            </FormDescription>
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
                            <FormDescription>
                              Where the camera is located
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Camera Preview</CardTitle>
                      <CardDescription>
                        Test your camera connection
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="w-full overflow-hidden rounded-md bg-muted"
                        style={{ aspectRatio: "16/9" }}
                      >
                        {isPreviewLoading ? (
                          <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : previewUrl ? (
                          <video
                            src={previewUrl}
                            className="h-full w-full object-cover"
                            autoPlay
                            muted
                            loop
                            controls
                          />
                        ) : previewError ? (
                          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                            <Camera className="mb-2 h-10 w-10 text-muted-foreground" />
                            <p className="text-sm text-destructive">
                              {previewError}
                            </p>
                          </div>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                            <Camera className="mb-2 h-10 w-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Enter camera details and test connection to see
                              preview
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Settings</CardTitle>
                    <CardDescription>
                      Configure additional camera settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    <FormField
                      control={form.control}
                      name="enable_motion_detection"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Motion Detection
                            </FormLabel>
                            <FormDescription>
                              Receive alerts when motion is detected
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
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
                            <FormLabel className="text-base">
                              Sound Detection
                            </FormLabel>
                            <FormDescription>
                              Receive alerts when sound is detected
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="gradient"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Camera...
                    </>
                  ) : (
                    "Add Camera"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
