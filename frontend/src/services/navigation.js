import { LayoutDashboard, LineChart, Shield, UserRound, Workflow } from "lucide-react";

export function getNavigationItems(role) {
  const base = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "My Gateways", icon: Workflow, path: "/dashboard" },
    { label: "Traffic", icon: LineChart, path: "/dashboard" },
    { label: "Security", icon: Shield, path: "/dashboard" }
  ];

  if (role === "admin") {
    return [
      ...base,
      { label: "God View", icon: UserRound, path: "/admin/overview" },
      { label: "Global Logs", icon: LineChart, path: "/admin/logs" }
    ];
  }

  return base;
}
