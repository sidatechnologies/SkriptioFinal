import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function StudioNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (to) => {
    if (to === "/studio") return pathname === "/studio";
    if (to === "/studio/summariser") return pathname === "/studio/summariser" || pathname.startsWith("/studio/summariser/");
    if (to === "/studio/resume") return pathname === "/studio/resume" || pathname.startsWith("/studio/resume/");
    if (to === "/studio/kit") {
      const isKitDirect = pathname === "/studio/kit" || pathname.startsWith("/studio/kit/");
      const isLegacyShare = pathname.startsWith("/studio/") && !["/studio", "/studio/summariser", "/studio/resume"].includes(pathname) && !pathname.startsWith("/studio/summariser") && !pathname.startsWith("/studio/resume");
      return isKitDirect || isLegacyShare;
    }
    return pathname.startsWith(to);
  };

  const items = [
    { to: "/studio", label: "Studio" },
    { to: "/studio/kit", label: "Study Kit" },
    { to: "/studio/summariser", label: "PDF Summariser" },
    { to: "/studio/resume", label: "Resume Builder" },
  ];

  const current = items.find((i) => isActive(i.to)) || items[0];

  return (
    <div className="w-full">
      {/* Mobile: custom dropdown to control arrow spacing */}
      <div className="md:hidden">
        <div className="relative inline-block select-wrap">
          <select
            className="select-control text-sm rounded-md px-3 pr-7 py-2 border border-border bg-background"
            value={current.to}
            onChange={(e) => navigate(e.target.value)}
          >
            {items.map((it) => (
              <option key={it.to} value={it.to}>{it.label}</option>
            ))}
          </select>
          <span className="select-arrow"><ChevronDown size={16} /></span>
        </div>
      </div>

      {/* Desktop: segmented control */}
      <div className="hidden md:block overflow-x-visible">
        <nav className="inline-flex rounded-md overflow-hidden border border-border bg-card">
          {items.map((it, idx) => (
            <Link
              key={it.to}
              to={it.to}
              className={`px-3 py-1.5 text-sm whitespace-nowrap ${isActive(it.to) ? 'bg-white text-black' : 'bg-transparent text-foreground/80'} ${idx !== 0 ? 'border-l border-border' : ''}`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}