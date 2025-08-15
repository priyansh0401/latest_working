"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { LogOut, Shield, User, Home, Video, Grid3X3, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/mode-toggle";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // TEMPORARILY BYPASS AUTH FOR TESTING
  const testUser = { id: "1", email: "test@test.com", name: "Test User", role: "admin" };
  const currentUser = user || testUser;
  const isUserAuthenticated = isAuthenticated || true;

  // Redirect to login if not authenticated
  if (!isUserAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    return null;
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/cameras", label: "Cameras", icon: Video },
    { href: "/dashboard/cams-one", label: "CamsOne", icon: Grid3X3 },
    { href: "/dashboard/add-camera", label: "Add Camera", icon: Plus },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    { href: "/dashboard/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-muted/10">
      {/* Double-layered Sidebar with hover expand */}
      <div 
        className={`relative transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Outer layer - Glass effect background */}
        <div className="absolute inset-0 bg-sidebar/80 backdrop-blur-lg border-r border-sidebar-border rounded-r-2xl shadow-2xl" />
        
        {/* Inner layer - Content */}
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-sidebar-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <span className={`font-semibold text-lg text-sidebar-foreground transition-all duration-300 ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}>
                Guardian Eye
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full transition-all duration-300 ${
                        isExpanded 
                          ? 'px-4 py-3 h-12 justify-start' 
                          : 'px-2 py-3 h-12 justify-center'
                      }`}
                      size="sm"
                    >
                      <item.icon className="h-7 w-7" />
                      {isExpanded && (
                        <span className="ml-3 text-sm font-medium">
                          {item.label}
                        </span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border/50">
            <div className={`transition-all duration-300 ${
              isExpanded ? 'space-y-3' : 'space-y-2'
            }`}>
              <div className={`flex items-center gap-3 transition-all duration-300 ${
                isExpanded ? 'justify-start' : 'justify-center'
              }`}>
                <Avatar className="h-10 w-10 border-2 border-border/50">
                  <AvatarImage src={`https://avatar.vercel.sh/${currentUser?.email || "user"}`} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {currentUser?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                {isExpanded && (
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-sidebar-foreground">
                      {currentUser?.name || "User"}
                    </span>
                    <span className="text-xs text-sidebar-foreground/70">
                      {currentUser?.role || "Admin"}
                    </span>
                  </div>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout} 
                className={`w-full transition-all duration-300 ${
                  isExpanded 
                    ? 'px-4 py-3 h-12 justify-start' 
                    : 'px-2 py-3 h-12 justify-center'
                }`}
              >
                <LogOut className="h-7 w-7" />
                {isExpanded && (
                  <span className="ml-3 text-sm font-medium">
                    Logout
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - FULL WIDTH */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-card/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-6 shadow-sm">
          <div></div>
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        {/* Page Content - FULL WIDTH */}
        <main className="flex-1 p-6 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
