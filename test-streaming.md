# CCTV Streaming Test Guide

## Testing the Fixed Streaming Functionality

### 1. Prerequisites
- Ensure FFmpeg is installed on your system
- Have a test RTSP camera or RTSP stream URL available
- Node.js and npm/yarn installed

### 2. Start the Application
```bash
# Install dependencies if not already done
npm install

# Start the development server
npm run dev
```

### 3. Test Camera Addition
1. Navigate to `/dashboard/add-camera`
2. Fill in camera details:
   - **Name**: Test Camera
   - **Location**: Test Location
   - **IP Address**: Your RTSP URL (e.g., `rtsp://username:password@192.168.1.100:554/stream`)
   - **Camera Type**: Select appropriate type (rtsp, hikvision, dahua, onvif, ip)
3. Click "Test Connection" to verify the camera works
4. Save the camera

### 4. Test Live Streaming
1. Go to `/dashboard/cameras`
2. Check that the camera card shows the correct aspect ratio (16:9)
3. Verify the video player loads and shows live feed
4. Click on the camera to view detailed stream
5. Test the full-screen video player

### 5. Test Different Screen Sizes
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

### 6. Common Test RTSP URLs
If you don't have a real camera, you can test with these public streams:

```
rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4
rtsp://demo:demo@ipvmdemo.dyndns.org:5541/onvif-media/media.amp
```

### 7. Expected Results
- ✅ Camera cards maintain 16:9 aspect ratio
- ✅ Video players load without infinite loading
- ✅ Live streams display properly
- ✅ UI is responsive across different screen sizes
- ✅ Error messages are clear and helpful
- ✅ HLS segments are generated in `/media/live/[camera-id]/`

### 8. Troubleshooting
If streaming doesn't work:
1. Check browser console for errors
2. Verify FFmpeg is installed: `ffmpeg -version`
3. Check server logs for FFmpeg errors
4. Ensure camera RTSP URL is accessible
5. Try different camera types in the dropdown

### 9. Performance Testing
- Add multiple cameras (3-5)
- Test simultaneous streaming
- Monitor CPU and memory usage
- Check for memory leaks in browser

### 10. Browser Compatibility
Test in:
- Chrome/Chromium
- Firefox
- Safari
- Edge
