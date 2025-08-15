const mongoose = require('mongoose')

const cameraSchema = new mongoose.Schema({
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
    required: true,
    enum: ['ip', 'rtsp', 'onvif'],
  },
  description: {
    type: String,
  },
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  stream_url: {
    type: String,
  },
  enable_motion_detection: {
    type: Boolean,
    default: true,
  },
  enable_sound_detection: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'error'],
    default: 'offline',
  },
  last_seen: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

// Add indexes for better query performance
cameraSchema.index({ ip_address: 1 })
cameraSchema.index({ status: 1 })
cameraSchema.index({ camera_type: 1 })

// Pre-save middleware to generate stream URL
cameraSchema.pre('save', function(next) {
  if (this.isModified('ip_address') || this.isModified('username') || this.isModified('password')) {
    // Clean the IP address of any existing rtsp:// prefix
    let cleanIp = this.ip_address.replace(/^rtsp:\/\//, '')
    
    // Build the RTSP URL
    let streamUrl = 'rtsp://'
    
    // Add authentication if provided
    if (this.username && this.password) {
      streamUrl += `${this.username}:${this.password}@`
    }
    
    // Add IP address
    streamUrl += cleanIp

    // Add default paths based on camera type
    switch (this.camera_type) {
      case 'rtsp':
        streamUrl += '/Streaming/Channels/101' // Default Hikvision path
        break
      case 'ip':
        streamUrl += '/cam/realmonitor?channel=1&subtype=0' // Default Dahua path
        break
      case 'onvif':
        streamUrl += '/axis-media/media.amp' // Default Axis path
        break
    }

    this.stream_url = streamUrl
  }
  next()
})

const Camera = mongoose.model('Camera', cameraSchema)

module.exports = Camera 