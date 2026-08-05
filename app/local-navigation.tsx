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
import {
  KeyboardEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
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
  openerRef: RefObject<HTMLButtonElement | null>;
};

export function LocalNavigation({
  current,
  mobileOpen,
  onClose,
  connected,
  openerRef,
}: LocalNavigationProps) {
  const [mobileLayout, setMobileLayout] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileClosed = mobileLayout && !mobileOpen;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const updateLayout = () => setMobileLayout(media.matches);
    updateLayout();
    media.addEventListener("change", updateLayout);
    return () => media.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    if (!mobileLayout || !mobileOpen) return;
    const focusClose = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(focusClose);
  }, [mobileLayout, mobileOpen]);

  function closeAndRestoreFocus() {
    openerRef.current?.focus();
    onClose();
  }

  function handleNavigationKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!mobileLayout || !mobileOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = navigationRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <nav
      aria-hidden={mobileClosed || undefined}
      aria-label="Primary navigation"
      className={`primary-nav ${mobileOpen ? "mobile-open" : ""}`}
      id="primary-navigation"
      inert={mobileClosed}
      onKeyDown={handleNavigationKeyDown}
      ref={navigationRef}
    >
      <Link className="brand-lockup live-brand" href="/">
        <SovereignMark />
        <span>Sovereign</span>
      </Link>
      <button
        aria-label="Close navigation"
        className="mobile-close icon-button"
        onClick={closeAndRestoreFocus}
        ref={closeButtonRef}
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
