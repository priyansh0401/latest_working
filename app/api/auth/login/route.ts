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
function generateToken(userId: string) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // Test user bypass - no database connection needed
    if (email === "testui@testui.com" && password === "testuitestui") {
      const testUser = {
        id: "test-user-id",
        email: "testui@testui.com",
        name: "Test UI User",
        role: "user"
      }
      const token = generateToken(testUser.id)
      
      return NextResponse.json({
        message: "Login successful (test user)",
        token,
        user: testUser
      })
    }

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
