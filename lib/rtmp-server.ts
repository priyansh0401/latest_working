import NodeMediaServer from "node-media-server"
import path from "path"
import fs from "fs"

// Ensure media directory exists
const mediaDir = path.join(process.cwd(), "media", "live")
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true })
}

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: path.join(process.cwd(), 'media'),
    cors: true
  },
  trans: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
      }
    ]
  }
}

const nms = new NodeMediaServer(config)

export function startRtmpServer() {
  nms.run()
  console.log("RTMP server started on port 1935")
  console.log("HTTP server started on port 8000")
  console.log("Media root:", config.http.mediaroot)
}

export default nms 