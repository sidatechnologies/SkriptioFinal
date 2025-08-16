import React from "react";
import StudioNav from "../components/StudioNav";
import Studio from "../App";

// KitRoute renders the existing Studio (Study Kit Generator) and overlays StudioNav
// without modifying the Studio component itself.
export default function KitRoute() {
  return (
    <>
      {/* Overlay StudioNav below the Studio header */}
      <div className="fixed left-0 right-0 z-30" style={{ top: 64 }}>
        <div className="max-w-6xl mx-auto px-6 py-2">
          <StudioNav />
        </div>
      </div>
      {/* Render the original Studio UI as-is */}
      <Studio />
    </>
  );
}