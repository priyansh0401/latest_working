// Corrected content for backend/src/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const Camera = require('./models/camera');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

connectDB();

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Guardian Eye API is running' });
});

// Routes
app.use('/api/auth', authRoutes);

// Camera routes
app.get("/api/cameras", async (req, res) => {
  try {
    const cameras = await Camera.find();
    res.json(cameras);
  } catch (error) {
    res.status(500).json({ error: "Failed to get cameras" });
  }
});

app.get("/api/cameras/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid camera ID format" });
    }
    const camera = await Camera.findById(id);
    if (!camera) {
      return res.status(404).json({ error: "Camera not found" });
    }
    res.json(camera);
  } catch (error) {
    res.status(500).json({ error: "Failed to get camera" });
  }
});

app.post("/api/cameras", async (req, res) => {
  try {
    const { name, ip_address, location } = req.body;

    if (!name || !ip_address || !location) {
      return res.status(400).json({ error: "Missing required camera fields" });
    }

    const newCamera = new Camera({ name, ip_address, location });

    const streamingServerUrl = process.env.STREAMING_SERVER_URL;
    if (streamingServerUrl) {
      newCamera.stream_url = `${streamingServerUrl}/live/${newCamera._id}/index.m3u8`;
    }

    await newCamera.save();
    res.status(201).json(newCamera);
  } catch (error) {
    res.status(500).json({ error: "Failed to create camera" });
  }
});

app.put("/api/cameras/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid camera ID format" });
    }
    const camera = await Camera.findByIdAndUpdate(id, req.body, { new: true });
    if (!camera) {
      return res.status(404).json({ error: "Camera not found" });
    }
    res.json(camera);
  } catch (error) {
    res.status(500).json({ error: "Failed to update camera" });
  }
});

app.delete("/api/cameras/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid camera ID format" });
    }
    const camera = await Camera.findByIdAndDelete(id);
    if (!camera) {
      return res.status(404).json({ error: "Camera not found" });
    }
    res.json({ message: "Camera deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete camera" });
  }
});

// Stream endpoint
app.get("/api/stream/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid camera ID format" });
    }
    const camera = await Camera.findById(id);
    if (!camera) {
      return res.status(404).json({ error: "Camera not found" });
    }
    if (!camera.stream_url) {
      return res.status(400).json({ error: "Camera stream URL not configured" });
    }
    res.json({ streamUrl: camera.stream_url });
  } catch (error) {
    res.status(500).json({ error: "Failed to get stream" });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
