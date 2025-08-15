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
        // Use provided MongoDB Atlas URI or fallback to local
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
app.get("/cameras", async (req, res) => {
  try {
    console.log("Getting all cameras")
    const cameras = await Camera.find()
    console.log("Found cameras:", cameras)
    res.json(cameras)
  } catch (error) {
    console.error("Error getting cameras:", error)
    res.status(500).json({ error: "Failed to get cameras" })
  }
})

app.get("/cameras/:id", async (req, res) => {
  try {
    const { id } = req.params
    console.log("Getting camera by ID:", id)
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid camera ID format" })
    }
    
    const camera = await Camera.findById(id)
    console.log("Found camera:", camera)
    
    if (!camera) {
      console.log("Camera not found")
      return res.status(404).json({ error: "Camera not found" })
    }
    
    res.json(camera)
  } catch (error) {
    console.error("Error getting camera:", error)
    res.status(500).json({ error: "Failed to get camera" })
  }
})

app.post("/cameras", async (req, res) => {
  try {
    console.log("Creating camera with data:", req.body)
    const camera = new Camera(req.body)
    await camera.save()
    console.log("Camera created:", camera)
    res.status(201).json(camera)
  } catch (error) {
    console.error("Error creating camera:", error)
    res.status(500).json({ error: "Failed to create camera" })
  }
})

app.put("/cameras/:id", async (req, res) => {
  try {
    const { id } = req.params
    console.log("Updating camera:", id, "with data:", req.body)
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid camera ID format" })
    }
    
    const camera = await Camera.findByIdAndUpdate(id, req.body, { new: true })
    console.log("Updated camera:", camera)
    
    if (!camera) {
      console.log("Camera not found")
      return res.status(404).json({ error: "Camera not found" })
    }
    
    res.json(camera)
  } catch (error) {
    console.error("Error updating camera:", error)
    res.status(500).json({ error: "Failed to update camera" })
  }
})

app.delete("/cameras/:id", async (req, res) => {
  try {
    const { id } = req.params
    console.log("Deleting camera:", id)
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid camera ID format" })
    }
    
    const camera = await Camera.findByIdAndDelete(id)
    console.log("Deleted camera:", camera)
    
    if (!camera) {
      console.log("Camera not found")
      return res.status(404).json({ error: "Camera not found" })
    }
    
    res.json({ message: "Camera deleted" })
  } catch (error) {
    console.error("Error deleting camera:", error)
    res.status(500).json({ error: "Failed to delete camera" })
  }
})

// Stream endpoint
app.get("/stream/:id", async (req, res) => {
  try {
    const { id } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid camera ID format" })
    }
    
    const camera = await Camera.findById(id)
    if (!camera) {
      return res.status(404).json({ error: "Camera not found" })
    }
    
    if (!camera.stream_url) {
      return res.status(400).json({ error: "Camera stream URL not configured" })
    }
    
    // Return the stream URL for the frontend to handle
    res.json({ stream_url: camera.stream_url })
  } catch (error) {
    console.error("Error getting stream:", error)
    res.status(500).json({ error: "Failed to get stream" })
  }
})

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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 