# Guardian Eye - Smart Camera Monitoring System

Guardian Eye is a comprehensive camera monitoring system.

## Features

- User authentication with JWT
- Camera management
- Real-time video streaming
- Responsive UI with dark/light theme

## Tech Stack

### Frontend
- Next.js with TypeScript
- Tailwind CSS with shadcn/ui components
- React Query for data fetching
- Axios for API communication

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JSON Web Token (JWT) for authentication

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Local Development Setup

#### Backend (Node.js)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `backend` directory with the following content:
   ```
   MONGODB_URI=<your_mongodb_connection_string>
   SECRET_KEY=<your_jwt_secret_key>
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The backend will be running at http://localhost:8000.

#### Frontend (Next.js)

1. In the root directory, install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be running at http://localhost:3000.

## API Endpoints

The backend exposes the following REST API endpoints:

### Authentication
- `POST /api/auth/register` - Register a new user.
- `POST /api/auth/login` - Login a user and get a JWT token.

### Cameras
- `GET /cameras` - List all cameras.
- `POST /cameras` - Add a new camera.
- `GET /cameras/:id` - Get camera details.
- `PUT /cameras/:id` - Update a camera.
- `DELETE /cameras/:id` - Delete a camera.

### Stream
- `GET /stream/:id` - Get the stream URL for a camera.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
