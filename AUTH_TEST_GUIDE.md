# Authentication Test Guide

## Fixed Authentication Issues ✅

### Problems Resolved:
1. **Missing API Routes**: Created Next.js API routes for authentication
2. **Incorrect API Base URL**: Fixed to use `/api` instead of external server
3. **Token Storage Issues**: Standardized to use localStorage
4. **Error Handling**: Improved error messages and handling
5. **Test User**: Added bypass authentication for UI testing

## Test User Credentials 🧪

For UI testing without database connection:
- **Email**: `testui@testui.com`
- **Password**: `testuitestui`

## Testing Steps

### 1. Start the Application
```bash
npm run dev
```

### 2. Test Authentication Flow

#### Option A: Test User Login (Recommended for UI Testing)
1. Go to `/auth/login`
2. Click the "Test UI Login" button
3. Should automatically log you in and redirect to `/dashboard`

#### Option B: Manual Test User Login
1. Go to `/auth/login`
2. Enter:
   - Email: `testui@testui.com`
   - Password: `testuitestui`
3. Click "Sign In"
4. Should redirect to `/dashboard`

#### Option C: Real User Registration
1. Go to `/auth/signup`
2. Fill in the form with real details
3. Click "Create Account"
4. Should create user in database and redirect to `/dashboard`

#### Option D: Real User Login
1. Go to `/auth/login`
2. Enter credentials of a registered user
3. Click "Sign In"
4. Should authenticate and redirect to `/dashboard`

### 3. Test Protected Routes
1. After logging in, try accessing:
   - `/dashboard` - Should work
   - `/dashboard/cameras` - Should work
   - `/dashboard/add-camera` - Should work

2. Try logging out:
   - Click user menu in top right
   - Click "Logout"
   - Should redirect to `/auth/login`

3. Try accessing protected routes while logged out:
   - Go to `/dashboard` directly
   - Should redirect to `/auth/login`

### 4. Test Error Handling

#### Invalid Login
1. Go to `/auth/login`
2. Enter invalid credentials
3. Should show error message

#### Registration with Existing Email
1. Go to `/auth/signup`
2. Try to register with an email that already exists
3. Should show "User already exists" error

## Expected Results ✅

- ✅ Test user login works without database
- ✅ Real user registration creates account in database
- ✅ Real user login authenticates against database
- ✅ Protected routes redirect to login when not authenticated
- ✅ User stays logged in after page refresh
- ✅ Logout clears session and redirects to login
- ✅ Error messages are clear and helpful

## API Endpoints Created

### `/api/auth/login` (POST)
- Accepts: `{ email, password }`
- Returns: `{ token, user, message }`
- Special case: Test user bypass for `testui@testui.com`

### `/api/auth/register` (POST)
- Accepts: `{ name, email, password }`
- Returns: `{ token, user, message }`
- Validates input and checks for existing users

## Technical Details

### Authentication Flow
1. User submits credentials
2. API validates credentials (or bypasses for test user)
3. JWT token generated and returned
4. Token stored in localStorage
5. User data stored in localStorage
6. Subsequent requests include token in Authorization header

### Test User Implementation
- Bypasses database connection
- Returns hardcoded user data
- Uses same JWT token generation as real users
- Allows full UI testing without database setup

## Troubleshooting

### If login still fails:
1. Check browser console for errors
2. Verify API routes are accessible at `/api/auth/login` and `/api/auth/register`
3. Check if JWT_SECRET is set (defaults to 'your-secret-key')
4. Ensure MongoDB connection works for real users

### If test user doesn't work:
1. Check exact credentials: `testui@testui.com` / `testuitestui`
2. Verify API route `/api/auth/login` exists
3. Check browser network tab for API call

### If protected routes don't work:
1. Check if token is stored in localStorage
2. Verify AuthProvider wraps the app
3. Check useAuth hook is used correctly
