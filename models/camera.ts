import mongoose from "mongoose";

const cameraSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    ip_address: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    camera_type: {
      type: String,
      enum: ["rtsp", "onvif", "hikvision", "dahua", "ip"],
      default: "rtsp",
    },
    description: String,
    username: String,
    password: String,
    enable_motion_detection: {
      type: Boolean,
      default: false,
    },
    enable_sound_detection: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["online", "offline", "error"],
      default: "offline",
    },
    last_seen: {
      type: Date,
      default: Date.now,
    },
    stream_url: {
      type: String,
      required: false,
    },
    rtsp_port: {
      type: Number,
      default: 554,
    },
    rtsp_path: {
      type: String,
      default: "/stream",
    },
    ffmpeg_options: {
      type: String,
      default: "-c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline -level 3.0 -pix_fmt yuv420p -g 30 -keyint_min 30 -sc_threshold 0 -an -f hls -hls_time 1 -hls_list_size 3 -hls_flags delete_segments+program_date_time+append_list+independent_segments -hls_delete_threshold 1 -hls_start_number_source epoch -hls_segment_type mpegts -hls_playlist_type event -hls_allow_cache 0 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
    },
    user: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
cameraSchema.index({ ip_address: 1 });
cameraSchema.index({ status: 1 });
cameraSchema.index({ camera_type: 1 });

// Add a method to get the full RTSP URL
cameraSchema.methods.getFullRtspUrl = function () {
  const { ip_address, camera_type, username, password, rtsp_port, rtsp_path } = this;

  // If ip_address is already a complete URL, use it
  if (
    ip_address.startsWith("rtsp://") ||
    ip_address.startsWith("http://") ||
    ip_address.startsWith("https://")
  ) {
    // If auth needs to be injected, do it carefully
    if (username && password) {
      const auth = `${username}:${password}@`;
      if (ip_address.includes("@")) {
        // URL already has credentials, replace them
        return ip_address.replace(/rtsp:\/\/(.*)@/, `rtsp://${auth}`);
      } else {
        // Inject credentials
        return ip_address.replace("rtsp://", `rtsp://${auth}`);
      }
    }
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
};

// Add a method to get default RTSP path based on camera type
cameraSchema.methods.getDefaultRtspPath = function () {
  switch (this.camera_type) {
    case "hikvision":
      return "/Streaming/Channels/101";
    case "dahua":
      return "/cam/realmonitor?channel=1&subtype=0";
    case "onvif":
      return "/onvif/stream1";
    case "ip":
      return "/stream1";
    case "rtsp":
    default:
      return this.rtsp_path || "/stream";
  }
};

export const Camera =
  mongoose.models.Camera || mongoose.model("Camera", cameraSchema);
