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

export async function DELETE(
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

    console.log("Deleting camera:", id);

    // Connect to database
    await connectToDatabase();

    // Delete camera (only if owned by user)
    const camera = await Camera.findOneAndDelete({ _id: id, user: user.id });

    if (!camera) {
      return NextResponse.json({ error: "Camera not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ message: "Camera deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting camera:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete camera" },
      { status: 500 }
    );
  }
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

    console.log("Getting camera:", id);

    // Connect to database
    await connectToDatabase();

    // Get camera (only if owned by user)
    const camera = await Camera.findOne({ _id: id, user: user.id });
    console.log("Found camera:", camera);

    if (!camera) {
      return NextResponse.json({ error: "Camera not found or access denied" }, { status: 404 });
    }

    return NextResponse.json(camera);
  } catch (error: any) {
    console.error("Error getting camera:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get camera" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await req.json();
    
    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    const user = await verifyToken(authHeader);
    
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("Updating camera:", id, "with data:", data);

    // Validate required fields
    if (!data.name || !data.ip_address || !data.location) {
      return NextResponse.json(
        { error: "Name, IP address, and location are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Generate stream_url if not provided or if IP/type changed
    if (!data.stream_url || data.ip_address || data.camera_type) {
      data.stream_url = generateStreamUrl(data);
    }

    // Update camera (only if owned by user)
    const camera = await Camera.findOneAndUpdate(
      { _id: id, user: user.id }, 
      data, 
      { new: true }
    );
    console.log("Updated camera:", camera);

    if (!camera) {
      return NextResponse.json({ error: "Camera not found or access denied" }, { status: 404 });
    }

    return NextResponse.json(camera);
  } catch (error: any) {
    console.error("Error updating camera:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update camera" },
      { status: 500 }
    );
  }
}

// Helper function to generate stream URL (same as in main cameras route)
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
