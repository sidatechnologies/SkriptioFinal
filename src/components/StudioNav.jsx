import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function StudioNav() {
  const { pathname } = useLocation();
  const isActive = (to) => {
    if (to === "/studio") return pathname === "/studio";
    return pathname.startsWith(to);
  };
  const items = [
    { to: "/studio", label: "Hub" },
    { to: "/studio/kit", label: "Study Kit" },
    { to: "/studio/handwriting", label: "Handwriting → Typed" },
    { to: "/studio/summariser", label: "PDF Summariser" },
  ];
  return (
    <div className="w-full overflow-x-auto">
      <nav className="inline-flex rounded-md overflow-hidden border border-border">
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
  );
}