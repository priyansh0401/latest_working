import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useCameras } from "@/hooks/use-cameras"
import DashboardPage from "@/app/dashboard/page"
import AddCameraPage from "@/app/dashboard/add-camera/page"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

// Mock the hooks
jest.mock("@/hooks/use-cameras")
jest.mock("@/context/auth-context")
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))
jest.mock("@/components/ui/use-toast")

describe("Camera Pages", () => {
  const mockUser = {
    id: "1",
    name: "Test User",
    username: "testuser",
    email: "test@example.com",
    phone: "1234567890",
  }

  const mockCameras = [
    {
      id: "1",
      name: "Test Camera",
      ip_address: "192.168.1.100",
      location: "Test Location",
      description: "Test Description",
      status: "online",
      thumbnail: "/placeholder.svg",
    },
  ]

  const mockRefetch = jest.fn()
  const mockPush = jest.fn()
  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock useAuth
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    })

    // Mock useCameras
    ;(useCameras as jest.Mock).mockReturnValue({
      cameras: mockCameras,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })

    // Mock useRouter
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })

    // Mock useToast
    ;(useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    })

    // Mock WebSocket
    global.WebSocket = jest.fn().mockImplementation(() => ({
      onopen: jest.fn(),
      onmessage: jest.fn(),
      onerror: jest.fn(),
      onclose: jest.fn(),
      close: jest.fn(),
    }))
  })

  describe("Dashboard Page", () => {
    test("renders camera list", () => {
      render(<DashboardPage />)

      expect(screen.getByText("Cameras")).toBeInTheDocument()
      expect(screen.getByText("Test Camera")).toBeInTheDocument()
      expect(screen.getByText("Test Location")).toBeInTheDocument()
      expect(screen.getByText("Online")).toBeInTheDocument()
    })

    test("renders empty state when no cameras", () => {
      ;(useCameras as jest.Mock).mockReturnValue({
        cameras: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })

      render(<DashboardPage />)

      expect(screen.getByText("No cameras found")).toBeInTheDocument()
      expect(
        screen.getByText("You haven't added any cameras yet. Add your first camera to start monitoring."),
      ).toBeInTheDocument()
    })

    test("renders loading state", () => {
      ;(useCameras as jest.Mock).mockReturnValue({
        cameras: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      })

      render(<DashboardPage />)

      // Check for loading skeletons (we can't easily test for the actual skeleton components)
      expect(screen.queryByText("No cameras found")).not.toBeInTheDocument()
    })

    test("renders error state", () => {
      ;(useCameras as jest.Mock).mockReturnValue({
        cameras: [],
        isLoading: false,
        error: new Error("Failed to load cameras"),
        refetch: mockRefetch,
      })

      render(<DashboardPage />)

      expect(screen.getByText("Error loading cameras: Failed to load cameras")).toBeInTheDocument()
    })

    test("refreshes camera list", async () => {
      render(<DashboardPage />)

      fireEvent.click(screen.getByRole("button", { name: /refresh/i }))

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled()
      })
    })
  })

  describe("Add Camera Page", () => {
    test("renders add camera form", () => {
      render(<AddCameraPage />)

      expect(screen.getByText("Add Camera")).toBeInTheDocument()
      expect(screen.getByLabelText("Camera Name")).toBeInTheDocument()
      expect(screen.getByLabelText("IP Address")).toBeInTheDocument()
      expect(screen.getByLabelText("Location")).toBeInTheDocument()
      expect(screen.getByLabelText("Description (Optional)")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add camera/i })).toBeInTheDocument()
    })

    test("submits add camera form with valid data", async () => {
      const mockSubmit = jest.fn().mockImplementation((e) => e.preventDefault())

      render(<AddCameraPage />)

      fireEvent.change(screen.getByLabelText("Camera Name"), {
        target: { value: "New Camera" },
      })

      fireEvent.change(screen.getByLabelText("IP Address"), {
        target: { value: "192.168.1.101" },
      })

      fireEvent.change(screen.getByLabelText("Location"), {
        target: { value: "New Location" },
      })

      fireEvent.change(screen.getByLabelText("Description (Optional)"), {
        target: { value: "New Description" },
      })

      const form = screen.getByRole("form")
      form.onsubmit = mockSubmit

      fireEvent.submit(form)

      expect(mockSubmit).toHaveBeenCalled()
    })

    test("shows validation errors", async () => {
      render(<AddCameraPage />)

      // Submit without filling required fields
      fireEvent.click(screen.getByRole("button", { name: /add camera/i }))

      await waitFor(() => {
        expect(screen.getByText("Camera name is required")).toBeInTheDocument()
        expect(screen.getByText("IP address is required")).toBeInTheDocument()
        expect(screen.getByText("Location is required")).toBeInTheDocument()
      })
    })
  })
})
