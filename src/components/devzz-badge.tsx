import React from "react";

export function DevzzBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_DEVZZ_BADGE === "false") return null;

  return (
    <a
      href="https://vibe.toolzz.ai"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-800 shadow-lg transition-transform hover:scale-105"
    >
      <svg width="20" height="17" viewBox="0 69 278 209" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 -mt-px">
        <defs>
          <linearGradient id="vibe-gradient" x1="208.501" y1="69.5002" x2="69.5003" y2="208.501" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF2056"/>
            <stop offset="1" stopColor="#F6339A"/>
          </linearGradient>
        </defs>
        <path d="M139 278.001L0.000146508 139L69.4996 69.5009L139 139.002L208.501 69.5009L278.001 139L139 278.001Z" fill="url(#vibe-gradient)"/>
      </svg>
      Made with Vibe
    </a>
  );
}