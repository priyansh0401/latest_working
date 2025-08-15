# Camera Pages Test Guide

## Issues Fixed ✅

### 1. **Camera Settings Page Missing** ✅
**Problem**: Clicking "Settings" button resulted in 404 error
**Solution**: Created `/dashboard/cameras/[id]/settings/page.tsx` with full CRUD functionality

### 2. **Video.js Hotkeys Plugin Error** ✅
**Problem**: `Error: plugin "hotkeys" does not exist` when viewing camera streams
**Solution**: Removed unsupported hotkeys plugin configuration from Video.js setup

### 3. **Dummy Cameras in Dashboard** ✅
**Problem**: Dashboard showed hardcoded mock cameras instead of real database cameras
**Solution**: Updated `useCameras` and `useCamera` hooks to fetch from API instead of mock data

### 4. **API Routes for Camera Management** ✅
**Problem**: Missing PUT endpoint for updating cameras
**Solution**: Added PUT method to `/api/cameras/[id]/route.ts` for camera updates

## Testing Steps

### 1. Start the Application
```bash
npm run dev
```

### 2. Login with Test User
1. Go to `/auth/login`
2. Click "Test UI Login" button
3. Should redirect to dashboard

### 3. Test Dashboard (No Dummy Cameras)
1. Go to `/dashboard`
2. Should show "No cameras found" if no cameras added yet
3. Should NOT show any hardcoded dummy cameras
4. Click "Add Camera" to add a real camera

### 4. Test Camera Addition
1. Go to `/dashboard/add-camera`
2. Add a test camera:
   - Name: "Test Camera"
   - IP Address: "192.168.1.100"
   - Location: "Front Door"
   - Camera Type: "Hikvision Camera"
3. Click "Add Camera"
4. Should redirect to `/dashboard/cameras`
5. New camera should appear in the list

### 5. Test Camera View (Fixed Video.js Error)
1. From cameras list, click "View" button on a camera
2. Should navigate to `/dashboard/cameras/[id]`
3. Should NOT show "plugin hotkeys does not exist" error
4. Video player should initialize without errors
5. Stream URL should be displayed correctly

### 6. Test Camera Settings (New Page)
1. From cameras list, click "Settings" button on a camera
2. Should navigate to `/dashboard/cameras/[id]/settings`
3. Should show camera settings form with current values
4. Test updating camera details:
   - Change name to "Updated Camera Name"
   - Change location to "Updated Location"
   - Toggle motion detection
5. Click "Save Changes"
6. Should show success message
7. Navigate back to cameras list to verify changes

### 7. Test Camera Settings Features
#### Update Basic Information
- Change camera name, location, IP address
- Select different camera type
- Add/update description

#### Update Authentication
- Add/change username and password
- Verify stream URL is regenerated with credentials

#### Update Detection Settings
- Toggle motion detection on/off
- Toggle sound detection on/off

#### Delete Camera
- Click "Delete Camera" button
- Confirm deletion
- Should redirect to cameras list
- Camera should be removed from list

### 8. Test Navigation Between Pages
1. Dashboard → Add Camera → Cameras List
2. Cameras List → Camera View → Camera Settings
3. Camera Settings → Back to Camera → Back to Cameras
4. All navigation should work without errors

## Expected Results ✅

### Dashboard
- ✅ Shows only real cameras from database
- ✅ No hardcoded dummy cameras
- ✅ "No cameras found" state when empty
- ✅ Add camera button works

### Camera View Page
- ✅ No Video.js hotkeys plugin error
- ✅ Video player initializes correctly
- ✅ Stream URL displays properly
- ✅ Settings button navigates to settings page

### Camera Settings Page (New)
- ✅ Page loads without 404 error
- ✅ Form populated with current camera data
- ✅ All fields editable and functional
- ✅ Save changes updates camera in database
- ✅ Delete camera removes from database
- ✅ Proper error handling and validation

### API Functionality
- ✅ GET `/api/cameras` returns real cameras
- ✅ GET `/api/cameras/[id]` returns specific camera
- ✅ PUT `/api/cameras/[id]` updates camera
- ✅ DELETE `/api/cameras/[id]` removes camera
- ✅ Stream URL generation works correctly

## File Changes Made

### New Files
- `app/dashboard/cameras/[id]/settings/page.tsx` - Camera settings page

### Modified Files
- `app/api/cameras/[id]/route.ts` - Added PUT method for updates
- `app/dashboard/cameras/[id]/page.tsx` - Removed hotkeys plugin
- `hooks/use-cameras.ts` - Replaced mock data with API calls

### API Endpoints
- `GET /api/cameras` - List all cameras
- `GET /api/cameras/[id]` - Get specific camera
- `PUT /api/cameras/[id]` - Update camera
- `DELETE /api/cameras/[id]` - Delete camera

## Troubleshooting

### If camera settings page still shows 404:
1. Verify file exists at `app/dashboard/cameras/[id]/settings/page.tsx`
2. Check Next.js routing is working
3. Restart development server

### If Video.js still shows hotkeys error:
1. Clear browser cache
2. Check console for other Video.js errors
3. Verify Video.js version compatibility

### If dummy cameras still appear:
1. Check `hooks/use-cameras.ts` is using API calls
2. Verify API endpoints are working
3. Clear browser cache and localStorage

### If camera updates don't work:
1. Check PUT endpoint at `/api/cameras/[id]/route.ts`
2. Verify MongoDB connection
3. Check browser network tab for API errors

## Performance Notes

- Camera list now loads from database (may be slower than mock data)
- Video.js initialization is more stable without unsupported plugins
- Settings page provides full CRUD functionality
- All changes persist in MongoDB database

## Security Considerations

- Camera settings require authentication
- Input validation on all form fields
- Proper error handling for unauthorized access
- Stream URLs with credentials are properly generated
