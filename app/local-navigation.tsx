"use client";

import {
  BarChart3,
  BookOpen,
  Calendar,
  FolderOpen,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { SovereignMark } from "./brand-mark";

const navigation = [
  { label: "Today", icon: Calendar, href: "/tutor" },
  { label: "Courses", icon: BookOpen, href: "/setup#course" },
  { label: "Library", icon: FolderOpen, href: "/setup#materials" },
  { label: "Progress", icon: BarChart3, href: "/progress" },
  { label: "Settings", icon: Settings, href: "/setup#companion" },
];

type LocalNavigationProps = {
  current: "Today" | "Courses" | "Library" | "Progress" | "Settings";
  mobileOpen: boolean;
  onClose: () => void;
  connected: boolean;
};

export function LocalNavigation({
  current,
  mobileOpen,
  onClose,
  connected,
}: LocalNavigationProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className={`primary-nav ${mobileOpen ? "mobile-open" : ""}`}
    >
      <Link className="brand-lockup live-brand" href="/">
        <SovereignMark />
        <span>Sovereign</span>
      </Link>
      <button
        aria-label="Close navigation"
        className="mobile-close icon-button"
        onClick={onClose}
        type="button"
      >
        <X size={20} />
      </button>

      <div className="nav-items">
        {navigation.map(({ label, icon: Icon, href }) => (
          <Link
            aria-current={label === current ? "page" : undefined}
            className={label === current ? "nav-item active" : "nav-item"}
            href={href}
            key={label}
            onClick={onClose}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className="bridge-nav-status">
        <span className={connected ? "ready" : ""} />
        <div>
          <strong>Sovereign Bridge</strong>
          <small>{connected ? "Local · connected" : "Not connected"}</small>
        </div>
      </div>
    </nav>
  );
}
