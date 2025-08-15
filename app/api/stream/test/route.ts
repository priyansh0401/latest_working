import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    console.log("Testing camera connection:", url);

    return new Promise((resolve) => {
      const testProc = spawn("ffmpeg", [
        "-loglevel",
        "error",
        "-rtsp_transport",
        "tcp",
        "-i",
        url,
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
        console.error("Camera connection test timed out for:", url);
        resolve(
          NextResponse.json(
            { 
              error: "Connection timeout",
              details: `Failed to connect to ${url} within 8 seconds. Please check the URL and network connectivity.`
            },
            { status: 408 }
          )
        );
      }, timeoutMs);

      testProc.on("close", (code) => {
        if (didResolve) return;
        didResolve = true;
        clearTimeout(timer);
        
        if (code === 0) {
          console.log("Camera connection test successful for:", url);
          resolve(
            NextResponse.json({
      success: true,
      message: "Camera connection successful",
              url: url,
            })
          );
        } else {
          console.error("Camera connection test failed with code:", code, "for URL:", url);
          resolve(
            NextResponse.json(
              { 
                error: "Connection failed",
                details: `Failed to connect to ${url}. Error code: ${code}. Please verify the RTSP URL, credentials, and network connectivity.`
              },
              { status: 400 }
            )
          );
        }
      });

      testProc.on("error", (err) => {
        if (didResolve) return;
        didResolve = true;
        clearTimeout(timer);
        console.error("Camera connection test process error:", err, "for URL:", url);
        resolve(
          NextResponse.json(
            { 
              error: "Process error",
              details: `Failed to start connection test: ${err.message}. Please check if FFmpeg is installed.`
            },
            { status: 500 }
          )
        );
      });
    });
  } catch (error: any) {
    console.error("Error in test endpoint:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
} 