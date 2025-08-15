"use client";

import { Button } from "@/components/ui/button";
import { Home, Plus, Settings, User, Video, Grid3X3 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface DashboardNavProps {
  pathname: string;
}

export function DashboardNav({ pathname }: DashboardNavProps) {
  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      exact: true,
    },
    {
      href: "/dashboard/cameras",
      label: "Cameras",
      icon: Video,
    },
    {
      href: "/dashboard/cams-one",
      label: "CamsOne",
      icon: Grid3X3,
    },
    {
      href: "/dashboard/add-camera",
      label: "Add Camera",
      icon: Plus,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
    },
    {
      href: "/dashboard/profile",
      label: "Profile",
      icon: User,
    },
  ];

  return (
    <nav className="grid gap-1 px-2">
      {routes.map((route, index) => {
        const isActive = route.exact
          ? pathname === route.href
          : pathname.startsWith(route.href);

        return (
          <Link key={route.href} href={route.href} className="outline-none">
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className="relative w-full justify-start"
              size="sm"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-0 z-10 h-full w-1 rounded-r-md bg-primary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <route.icon className="mr-2 h-4 w-4" />
              <span className="sidebar-label group-data-[state=collapsed]:hidden">
                {route.label}
              </span>
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}
