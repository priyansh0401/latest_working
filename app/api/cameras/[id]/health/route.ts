import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Camera } from "@/models/camera";
import { spawn } from "child_process";

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
      const rtspUrl = camera.getFullRtspUrl();
      const isConnected = await testCameraConnection(rtspUrl);
      const latency = Date.now() - startTime;
      return {
        isHealthy: isConnected,
        latency,
        error: isConnected ? undefined : "Failed to connect to stream",
      };
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

// Function to test camera connection using FFmpeg (cross-platform)
async function testCameraConnection(rtspUrl: string): Promise<boolean> {
  console.log("Testing camera connection:", rtspUrl);
  return new Promise<boolean>((resolve) => {
    const testProc = spawn("ffmpeg", [
      "-loglevel",
      "error",
      "-rtsp_transport",
      "tcp",
      "-i",
      rtspUrl,
      "-t",
      "1",
      "-f",
      "null",
      "-",
    ]);

    let didResolve = false;
    const timeoutMs = 8000;
    const timer = setTimeout(() => {
      if (didResolve) return;
      didResolve = true;
      try {
        testProc.kill();
      } catch {}
      console.error("Camera connection test timed out");
      resolve(false);
    }, timeoutMs);

    testProc.on("close", (code) => {
      if (didResolve) return;
      didResolve = true;
      clearTimeout(timer);
      if (code === 0) {
        console.log("Camera connection test successful");
        resolve(true);
      } else {
        console.error("Camera connection test failed with code:", code);
        resolve(false);
      }
    });

    testProc.on("error", (err) => {
      if (didResolve) return;
      didResolve = true;
      clearTimeout(timer);
      console.error("Camera connection test process error:", err);
      resolve(false);
    });
  });
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
