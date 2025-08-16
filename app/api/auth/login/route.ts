import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// User model (simplified for this API route)
import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
}, {
  timestamps: true,
})

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.models.User || mongoose.model("User", userSchema)

// Generate JWT token
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  console.error("JWT_SECRET is not defined in the environment variables.")
  // In a real production environment, you should throw an error
  // or have a more robust configuration management system.
}

function generateToken(userId: string) {
  if (!jwtSecret) {
    // This check is redundant if the server fails to start,
    // but it's a good safeguard.
    throw new Error("JWT secret is not configured.")
  }
  return jwt.sign({ userId }, jwtSecret, { expiresIn: "7d" })
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()


    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      )
    }

    // Connect to database for real users
    await connectToDatabase()

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Generate token
    const token = generateToken(user._id.toString())

    return NextResponse.json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json(
      { message: "Error logging in" },
      { status: 500 }
    )
  }
}
