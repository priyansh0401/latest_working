import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Camera } from "@/models/camera";
import jwt from "jsonwebtoken";

// Function to verify JWT token and get user
const jwtSecret = process.env.JWT_SECRET;

async function verifyToken(authHeader: string | null) {
  if (!jwtSecret) {
    console.error("JWT_SECRET is not defined in the environment variables.");
    throw new Error("JWT secret is not configured.");
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    return { id: decoded.userId }; // Map userId to id for consistency
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    const user = await verifyToken(authHeader);
    
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const data = await req.json();
    console.log("Creating camera with data:", data);

    // Validate required fields
    if (!data.name || !data.ip_address || !data.location) {
      return NextResponse.json(
        { error: "Name, IP address, and location are required" },
        { status: 400 }
      );
    }

    // Generate stream_url if not provided
    if (!data.stream_url) {
      data.stream_url = generateStreamUrl(data);
    }

    // Set default status and associate with user
    if (!data.status) {
      data.status = "offline";
    }
    data.user = user.id;

    // Connect to database
    await connectToDatabase();

    // Create camera
    const camera = new Camera(data);
    console.log("Created camera object:", camera);

    // Save camera
    const savedCamera = await camera.save();
    console.log("Saved camera:", savedCamera);

    return NextResponse.json(savedCamera);
  } catch (error: any) {
    console.error("Error creating camera:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create camera" },
      { status: 500 }
    );
  }
}

// Helper function to generate stream URL
function generateStreamUrl(cameraData: any): string {
  const { ip_address, camera_type, username, password, rtsp_port, rtsp_path } = cameraData;

  // If ip_address is already a complete URL, use it
  if (
    ip_address.startsWith("rtsp://") ||
    ip_address.startsWith("http://") ||
    ip_address.startsWith("https://")
  ) {
    return ip_address;
  }

  // Build RTSP URL
  const auth = username && password ? `${username}:${password}@` : "";
  const port = rtsp_port || 554;

  // Use custom rtsp_path if provided, otherwise get default path based on camera type
  let path = rtsp_path;
  if (!path) {
    switch (camera_type) {
      case "hikvision":
        path = "/Streaming/Channels/101";
        break;
      case "dahua":
        path = "/cam/realmonitor?channel=1&subtype=0";
        break;
      case "onvif":
        path = "/onvif/stream1";
        break;
      case "ip":
        path = "/stream1";
        break;
      case "rtsp":
      default:
        path = "/stream";
        break;
    }
  }

  return `rtsp://${auth}${ip_address}:${port}${path}`;
}

export async function GET(req: Request) {
  try {
    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    const user = await verifyToken(authHeader);
    
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("Getting all cameras for user:", user.id);

    // Connect to database
    await connectToDatabase();

    // Get all cameras for the current user
    const cameras = await Camera.find({ user: user.id });
    console.log("Found cameras:", cameras);

    return NextResponse.json(cameras);
  } catch (error: any) {
    console.error("Error getting cameras:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get cameras" },
      { status: 500 }
    );
  }
}
