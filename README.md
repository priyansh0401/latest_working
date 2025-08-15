# Guardian Eye - Smart Camera Monitoring System

Guardian Eye is a comprehensive camera monitoring system with real-time alerts for motion and sound detection.

## Features

- User authentication with JWT
- Camera management with IP validation
- Real-time alerts via WebSockets
- Responsive UI with dark/light theme
- Motion and sound detection alerts

## Tech Stack

### Frontend
- Next.js with TypeScript
- Tailwind CSS with shadcn/ui components
- Framer Motion for animations
- React Query for data fetching
- Axios for API communication

### Backend
- Django 4.x with Django REST Framework
- Django Channels for WebSockets
- PostgreSQL for database
- Redis for WebSocket channel layers
- SimpleJWT for authentication

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)

### Setup with Docker

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/guardian-eye.git
cd guardian-eye
\`\`\`

2. Create a `.env` file from the example:
\`\`\`bash
cp .env.example .env
\`\`\`

3. Start the services with Docker Compose:
\`\`\`bash
docker-compose up -d
\`\`\`

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/
   - Admin interface: http://localhost:8000/admin/

### Local Development Setup

#### Backend (Django)

1. Navigate to the backend directory:
\`\`\`bash
cd backend
\`\`\`

2. Create a virtual environment:
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
\`\`\`

3. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

4. Set up environment variables:
\`\`\`bash
export SECRET_KEY=your-secret-key
export DEBUG=True
export DB_NAME=guardian_eye
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_HOST=localhost
export DB_PORT=5432
export REDIS_HOST=localhost
export REDIS_PORT=6379
\`\`\`

5. Run migrations:
\`\`\`bash
python manage.py migrate
\`\`\`

6. Create a superuser:
\`\`\`bash
python manage.py createsuperuser
\`\`\`

7. Start the development server:
\`\`\`bash
python manage.py runserver
\`\`\`

#### Frontend (Next.js)

1. Navigate to the frontend directory:
\`\`\`bash
cd frontend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set environment variables:
\`\`\`bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
\`\`\`

4. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/signup/` - Register a new user
- `POST /api/auth/token/` - Get JWT token
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `GET /api/auth/me/` - Get user profile
- `PUT /api/auth/me/` - Update user profile
- `POST /api/auth/forgot-password/` - Request password reset
- `POST /api/auth/reset-password/` - Reset password with OTP

### Cameras
- `GET /api/cameras/` - List all cameras
- `POST /api/cameras/` - Add a new camera
- `GET /api/cameras/{id}/` - Get camera details
- `PUT /api/cameras/{id}/` - Update camera
- `DELETE /api/cameras/{id}/` - Delete camera
- `POST /api/cameras/{id}/check_status/` - Check camera status

### Alerts
- `GET /api/alerts/` - List all alerts

### WebSockets
- `ws://localhost:8000/ws/alerts/{user_id}/` - WebSocket for real-time alerts

## ML Detection Simulation

The system includes a background thread that simulates ML detection:
- Randomly triggers alerts on cameras
- Saves Alert records
- Pushes JSON messages via Channels groups

In a production environment, this would be replaced with actual ML models for motion and sound detection.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
