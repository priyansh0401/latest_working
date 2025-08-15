import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useAuth } from "@/context/auth-context"
import LoginPage from "@/app/auth/login/page"
import SignupPage from "@/app/auth/signup/page"
import { useRouter } from "next/navigation"

// Mock the hooks
jest.mock("@/context/auth-context")
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

describe("Authentication Pages", () => {
  const mockLogin = jest.fn()
  const mockSignup = jest.fn()
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock useAuth
    ;(useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      signup: mockSignup,
      user: null,
      isAuthenticated: false,
    })

    // Mock useRouter
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  describe("Login Page", () => {
    test("renders login form", () => {
      render(<LoginPage />)

      expect(screen.getByText("Welcome back")).toBeInTheDocument()
      expect(screen.getByLabelText("Username")).toBeInTheDocument()
      expect(screen.getByLabelText("Password")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })

    test("submits login form with valid data", async () => {
      render(<LoginPage />)

      fireEvent.change(screen.getByLabelText("Username"), {
        target: { value: "testuser" },
      })

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      })

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("testuser", "password123")
        expect(mockPush).toHaveBeenCalledWith("/dashboard")
      })
    })

    test("shows error with invalid data", async () => {
      mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"))

      render(<LoginPage />)

      fireEvent.change(screen.getByLabelText("Username"), {
        target: { value: "testuser" },
      })

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "wrongpassword" },
      })

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("testuser", "wrongpassword")
        expect(screen.getByText("Invalid username or password")).toBeInTheDocument()
      })
    })
  })

  describe("Signup Page", () => {
    test("renders signup form", () => {
      render(<SignupPage />)

      expect(screen.getByText("Create an account")).toBeInTheDocument()
      expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
      expect(screen.getByLabelText("Username")).toBeInTheDocument()
      expect(screen.getByLabelText("Email")).toBeInTheDocument()
      expect(screen.getByLabelText("Phone Number")).toBeInTheDocument()
      expect(screen.getByLabelText("Password")).toBeInTheDocument()
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
    })

    test("submits signup form with valid data", async () => {
      render(<SignupPage />)

      fireEvent.change(screen.getByLabelText("Full Name"), {
        target: { value: "Test User" },
      })

      fireEvent.change(screen.getByLabelText("Username"), {
        target: { value: "testuser" },
      })

      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "test@example.com" },
      })

      fireEvent.change(screen.getByLabelText("Phone Number"), {
        target: { value: "1234567890" },
      })

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      })

      fireEvent.change(screen.getByLabelText("Confirm Password"), {
        target: { value: "password123" },
      })

      fireEvent.click(screen.getByRole("button", { name: /create account/i }))

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith({
          name: "Test User",
          username: "testuser",
          email: "test@example.com",
          phone: "1234567890",
          password: "password123",
        })
        expect(mockPush).toHaveBeenCalledWith("/dashboard")
      })
    })

    test("shows error when passwords do not match", async () => {
      render(<SignupPage />)

      fireEvent.change(screen.getByLabelText("Full Name"), {
        target: { value: "Test User" },
      })

      fireEvent.change(screen.getByLabelText("Username"), {
        target: { value: "testuser" },
      })

      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "test@example.com" },
      })

      fireEvent.change(screen.getByLabelText("Phone Number"), {
        target: { value: "1234567890" },
      })

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      })

      fireEvent.change(screen.getByLabelText("Confirm Password"), {
        target: { value: "differentpassword" },
      })

      fireEvent.click(screen.getByRole("button", { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument()
      })
    })
  })
})
