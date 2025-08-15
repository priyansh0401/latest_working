"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

interface FormData {
  name: string
  email: string
  bio: string
}

interface Preferences {
  emailNotifications: boolean
  darkMode: boolean
}

export default function SettingsPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    bio: "",
  })

  const [preferences, setPreferences] = useState<Preferences>({
    emailNotifications: true,
    darkMode: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form submitted:", formData)
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h3 className="text-lg sm:text-xl md:text-2xl font-medium">Settings</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Separator />
      <div className="grid gap-6 sm:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Profile</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Update your profile information and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs sm:text-sm">Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-xs sm:text-sm">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="min-h-[100px] text-xs sm:text-sm"
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto text-xs sm:text-sm">
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Preferences</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Customize your application preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs sm:text-sm">Email Notifications</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Receive email notifications for important updates.
                  </p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, emailNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs sm:text-sm">Dark Mode</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Switch between light and dark mode.
                  </p>
                </div>
                <Switch
                  checked={preferences.darkMode}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, darkMode: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Security</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Manage your security settings and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs sm:text-sm">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full sm:w-auto text-xs sm:text-sm">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
