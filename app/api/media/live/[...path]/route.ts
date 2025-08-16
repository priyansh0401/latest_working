import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join("/")
    console.log("Serving media file:", filePath)

    // Construct the full path to the media file
    const mediaDir = path.join(process.cwd(), "media", "live")
    const fullPath = path.join(mediaDir, filePath)

    // Security check: ensure the path is within the media directory
    if (!fullPath.startsWith(mediaDir)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      )
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log("File not found:", fullPath)
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    // Read the file
    const fileBuffer = fs.readFileSync(fullPath)
    
    // Determine content type based on file extension
    const ext = path.extname(fullPath).toLowerCase()
    let contentType = "application/octet-stream"
    
    switch (ext) {
      case ".m3u8":
        contentType = "application/vnd.apple.mpegurl"
        break
      case ".ts":
        contentType = "video/mp2t"
        break
      case ".mp4":
        contentType = "video/mp4"
        break
    }

    // Set appropriate headers for streaming
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    })

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("Error serving media file:", error)
    return NextResponse.json(
      { error: "Failed to serve media file" },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
