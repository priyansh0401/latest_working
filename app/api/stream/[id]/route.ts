import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Camera } from "@/models/camera";
import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

const execAsync = promisify(exec);

// Keep track of active streams
const activeStreams = new Map<string, any>();

// Ensure media directory exists
const mediaDir = path.join(process.cwd(), "media", "live");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Function to verify JWT token and get user
async function verifyToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    return decoded;
  } catch (error) {
    return null;
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

// Function to check if FFmpeg is available
async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch (error) {
    console.error("FFmpeg not found:", error);
    return false;
  }
}

// Function to start FFmpeg process for HLS streaming
function startFFmpeg(rtspUrl: string, cameraId: string) {
  console.log("Starting FFmpeg with RTSP URL:", rtspUrl);

  // Create camera-specific directory
  const cameraDir = path.join(mediaDir, cameraId);
  if (!fs.existsSync(cameraDir)) {
    fs.mkdirSync(cameraDir, { recursive: true });
  }

  const playlistPath = path.join(cameraDir, "index.m3u8");
  const segmentPath = path.join(cameraDir, "segment_%03d.ts");

  console.log("HLS playlist path:", playlistPath);
  console.log("HLS segment path:", segmentPath);

  const ffmpeg = spawn("ffmpeg", [
    "-rtsp_transport",
    "tcp",
    "-stimeout",
    "5000000", // 5s RTSP I/O timeout
    "-i",
    rtspUrl,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-profile:v",
    "baseline",
    "-level",
    "3.0",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "30", // GOP size
    "-keyint_min",
    "30",
    "-sc_threshold",
    "0",
    // Many RTSP streams are video-only; disable audio to be robust
    "-an",
    "-f",
    "hls",
    "-hls_time",
    "1",
    "-hls_list_size",
    "3",
    "-hls_flags",
    "delete_segments+program_date_time+append_list+independent_segments",
    "-hls_delete_threshold",
    "1",
    "-hls_start_number_source",
    "epoch",
    "-hls_segment_type",
    "mpegts",
    "-hls_segment_filename",
    segmentPath,
    "-hls_playlist_type",
    "event",
    "-hls_allow_cache",
    "0",
    "-reconnect",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_delay_max",
    "5",
    playlistPath,
  ]);

  let errorOutput = "";

  ffmpeg.stdout.on("data", (data) => {
    console.log(`FFmpeg stdout: ${data.toString()}`);
  });

  ffmpeg.stderr.on("data", (data) => {
    const output = data.toString();
    console.log(`FFmpeg stderr: ${output}`);
    errorOutput += output;
  });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    if (code !== 0) {
      console.error("FFmpeg error output:", errorOutput);
    }
  });

  ffmpeg.on("error", (error) => {
    console.error("FFmpeg spawn error:", error);
  });

  return ffmpeg;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    const user = await verifyToken(authHeader);
    
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("Getting stream for camera:", id);

    // Check if FFmpeg is available
    const ffmpegAvailable = await checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        { error: "FFmpeg not available on server" },
        { status: 500 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Get camera (only if owned by user)
    const camera = await Camera.findOne({ _id: id, user: user.id });
    if (!camera) {
      return NextResponse.json({ error: "Camera not found or access denied" }, { status: 404 });
    }

    // Check if stream already exists and is still running
    const existingStream = activeStreams.get(id);
    if (existingStream && !existingStream.ffmpeg.killed) {
      console.log("Returning existing stream for camera:", id);
      return NextResponse.json({
        url: existingStream.hlsUrl,
        status: "active",
      });
    }

    // Get full RTSP URL
    const rtspUrl = camera.getFullRtspUrl();
    console.log("Full RTSP URL:", rtspUrl);
    console.log("Camera data:", {
      id: camera._id,
      name: camera.name,
      ip_address: camera.ip_address,
      camera_type: camera.camera_type,
      username: camera.username,
      password: camera.password ? "***" : "none",
      rtsp_port: camera.rtsp_port,
      rtsp_path: camera.rtsp_path
    });

    // Test camera connection first
    const connectionTest = await testCameraConnection(rtspUrl);
    if (!connectionTest) {
      console.error("Camera connection test failed for:", rtspUrl);
      return NextResponse.json(
        { 
          error: "Cannot connect to camera stream",
          details: `Failed to connect to ${rtspUrl}. Please check the IP address, credentials, and network connectivity.`
        },
        { status: 400 }
      );
    }

    // Create HLS URL - serve from Next.js static files
    const hlsUrl = `/api/media/live/${id}/index.m3u8`;

    // Start FFmpeg process
    const ffmpeg = startFFmpeg(rtspUrl, id);

    // Store stream info
    activeStreams.set(id, {
      ffmpeg,
      hlsUrl,
      camera,
      startTime: Date.now(),
    });

    // Wait for the HLS playlist (and at least one segment) to be created
    const cameraDir = path.join(process.cwd(), "media", "live", id);
    const playlistPath = path.join(cameraDir, "index.m3u8");

    const waitForFiles = async () => {
      const start = Date.now();
      const timeoutMs = 15000; // 15s max wait
      const checkIntervalMs = 300;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          if (fs.existsSync(playlistPath)) {
            const stat = fs.statSync(playlistPath);
            // Ensure playlist is not empty
            if (stat.size > 0) {
              // Check if at least one .ts segment exists
              const files = fs.readdirSync(cameraDir);
              const hasSegment = files.some((f) => f.endsWith(".ts"));
              if (hasSegment) return true;
            }
          }
        } catch (e) {
          // ignore and retry
        }

        if (Date.now() - start > timeoutMs) return false;
        await new Promise((r) => setTimeout(r, checkIntervalMs));
      }
    };

    const ready = await waitForFiles();
    if (!ready) {
      // Cleanup FFmpeg if it failed to start producing files in time
      try {
        ffmpeg.kill();
      } catch {}
      activeStreams.delete(id);
      return NextResponse.json(
        { error: "Timed out waiting for stream to start" },
        { status: 504 }
      );
    }

    return NextResponse.json({ url: hlsUrl, status: "active" });
  } catch (error: any) {
    console.error("Error getting stream:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get stream" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log("Stopping stream for camera:", id);

    // Get stream
    const streamData = activeStreams.get(id);
    if (streamData) {
      // Kill FFmpeg process
      streamData.ffmpeg.kill();
      activeStreams.delete(id);
    }

    return NextResponse.json({ message: "Stream stopped successfully" });
  } catch (error: any) {
    console.error("Error stopping stream:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stop stream" },
      { status: 500 }
    );
  }
}
