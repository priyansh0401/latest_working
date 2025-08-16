import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Camera } from "@/models/camera";

// Test camera connectivity and health
async function testCameraHealth(camera: any): Promise<{
  isHealthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // For RTSP cameras, we can test the connection
    if (camera.camera_type === "rtsp" || camera.camera_type === "ip") {
      // Simple ping-like test by trying to connect to the camera's IP
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        // Test if we can reach the camera's web interface or RTSP port
        const testUrl = camera.ip_address.startsWith('http')
          ? camera.ip_address
          : `http://${camera.ip_address}`;

        const response = await fetch(testUrl, {
          method: "HEAD",
          signal: controller.signal,
          headers: {
            "User-Agent": "CamsOne-HealthCheck/1.0",
          },
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        // Even if we get a 401 or 403, it means the camera is responding
        if (response.status < 500) {
          return {
            isHealthy: true,
            latency,
          };
        } else {
          return {
            isHealthy: false,
            latency,
            error: `HTTP ${response.status}`,
          };
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (fetchError.name === "AbortError") {
          return {
            isHealthy: false,
            latency,
            error: "Connection timeout",
          };
        }

        return {
          isHealthy: false,
          latency,
          error: fetchError.message || "Connection failed",
        };
      }
    }

    // For other camera types, assume healthy if in database
    return {
      isHealthy: camera.status === "online",
      latency: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      isHealthy: false,
      latency: Date.now() - startTime,
      error: error.message || "Health check failed",
    };
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const camera = await Camera.findById(params.id);
    if (!camera) {
      return new NextResponse(null, { status: 404 });
    }

    const healthResult = await testCameraHealth(camera);
    
    // Update camera status based on health check
    if (healthResult.isHealthy !== (camera.status === "online")) {
      camera.status = healthResult.isHealthy ? "online" : "offline";
      camera.last_seen = new Date();
      await camera.save();
    }

    const headers = new Headers();
    headers.set("X-Camera-Health", healthResult.isHealthy ? "healthy" : "unhealthy");
    headers.set("X-Camera-Latency", healthResult.latency.toString());
    
    if (healthResult.error) {
      headers.set("X-Camera-Error", healthResult.error);
    }

    return new NextResponse(null, {
      status: healthResult.isHealthy ? 200 : 503,
      headers,
    });
  } catch (error) {
    console.error("Health check error:", error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const camera = await Camera.findById(params.id);
    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    const healthResult = await testCameraHealth(camera);
    
    // Update camera status based on health check
    if (healthResult.isHealthy !== (camera.status === "online")) {
      camera.status = healthResult.isHealthy ? "online" : "offline";
      camera.last_seen = new Date();
      await camera.save();
    }

    return NextResponse.json({
      cameraId: camera._id,
      name: camera.name,
      isHealthy: healthResult.isHealthy,
      status: camera.status,
      latency: healthResult.latency,
      lastSeen: camera.last_seen,
      error: healthResult.error,
      ipAddress: camera.ip_address,
      location: camera.location,
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { error: "Health check failed" },
      { status: 500 }
    );
  }
}
