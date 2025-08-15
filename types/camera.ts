export interface Camera {
  id: string
  name: string
  ip_address: string
  location: string
  description?: string
  status: "online" | "offline"
  thumbnail: string | null
  camera_type: "ip" | "rtsp" | "onvif" | "webcam"
  enable_motion_detection: boolean
  enable_sound_detection: boolean
  stream_url: string | null
  created_at: string
  updated_at: string
}
