import { CalendarDays, Dumbbell, Settings, TrendingUp, Workflow, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
  /** Other paths that belong to this tab. */
  match: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", title: "Today", icon: CalendarDays, match: ["/today"] },
  { href: "/workouts", label: "Workouts", title: "Workouts", icon: Dumbbell, match: ["/workouts", "/exercises", "/history"] },
  { href: "/skills", label: "Skills", title: "Skills", icon: Workflow, match: ["/skills"] },
  { href: "/progress", label: "Progress", title: "Progress", icon: TrendingUp, match: ["/progress"] },
  { href: "/profile", label: "Profile", title: "Profile", icon: Settings, match: ["/profile"] },
];

export function activeNav(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
}
