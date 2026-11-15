import React from 'react';
import { BuildItemId, ResourceType } from '../types/game';

export const ResourceIcon: React.FC<{ type: ResourceType | 'water'; className?: string }> = ({
  type,
  className = 'w-4 h-4',
}) => {
  switch (type) {
    case 'wood':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="6" width="18" height="5" rx="1.5" fill="#c99560" stroke="#6c3e18" strokeWidth="1.5" />
          <rect x="4" y="13" width="16" height="5" rx="1.5" fill="#a8733d" stroke="#5b3211" strokeWidth="1.5" />
          <circle cx="7" cy="8.5" r="1" fill="#6c3e18" />
          <circle cx="16" cy="15.5" r="1" fill="#5b3211" />
        </svg>
      );
    case 'plastic':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M9 3h6v3l2 2.5V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8.5L9 6V3z"
            fill="#38bdf8"
            stroke="#0e7490"
            strokeWidth="1.5"
          />
          <rect x="9" y="2" width="6" height="2.5" rx="0.8" fill="#ea8c44" />
          <path d="M9 12h6" stroke="#e0f2fe" strokeWidth="1.4" />
        </svg>
      );
    case 'metal':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3l2.1 2.2 3-.6.8 2.9 2.7 1.3-.9 2.9 1.3 2.7-2.6 1.5-.6 3-3-.4L12 21l-2.1-2.2-3 .4-.6-3-2.6-1.5 1.3-2.7-.9-2.9 2.7-1.3.8-2.9 3 .6L12 3z"
            fill="#cbd5e1"
            stroke="#475569"
            strokeWidth="1.4"
          />
          <circle cx="12" cy="12" r="3.2" fill="#334155" />
        </svg>
      );
    case 'food':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 6c4.5 0 7 3 7 7.2 0 4.1-2.8 6.8-7 6.8s-7-2.7-7-6.8C5 9 7.5 6 12 6z"
            fill="#e04f44"
            stroke="#991b1b"
            strokeWidth="1.5"
          />
          <path d="M12 6c0-2 1.8-3.4 3.6-3.4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="10" cy="11" rx="1.4" ry="2.2" fill="#fca5a5" opacity="0.55" />
        </svg>
      );
    case 'water':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3s6 7.2 6 11.4A6 6 0 1 1 6 14.4C6 10.2 12 3 12 3z"
            fill="#22d3ee"
            stroke="#0e7490"
            strokeWidth="1.5"
          />
          <path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5" stroke="#ecfeff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
  }
};

export const BuildingIcon: React.FC<{
  type: BuildItemId | 'repair' | 'demolish';
  className?: string;
}> = ({ type, className = 'w-5 h-5' }) => {
  switch (type) {
    case 'floor':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="5" width="18" height="4" rx="1" fill="#d19c67" stroke="#6c3e18" strokeWidth="1.3" />
          <rect x="3" y="10" width="18" height="4" rx="1" fill="#b8814a" stroke="#6c3e18" strokeWidth="1.3" />
          <rect x="3" y="15" width="18" height="4" rx="1" fill="#d19c67" stroke="#6c3e18" strokeWidth="1.3" />
          <path d="M7 4v16M17 4v16" stroke="#d4bd95" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'reinforce':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#9c6f44" stroke="#64748b" strokeWidth="2.4" />
          <circle cx="6.5" cy="6.5" r="1.3" fill="#e2e8f0" />
          <circle cx="17.5" cy="6.5" r="1.3" fill="#e2e8f0" />
          <circle cx="6.5" cy="17.5" r="1.3" fill="#e2e8f0" />
          <circle cx="17.5" cy="17.5" r="1.3" fill="#e2e8f0" />
        </svg>
      );
    case 'purifier':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M7 14a5 5 0 0 1 10 0H7z" fill="#a5f3fc" stroke="#0891b2" strokeWidth="1.4" />
          <rect x="6" y="14" width="12" height="5" rx="1.2" fill="#c57444" stroke="#78350f" strokeWidth="1.4" />
          <path d="M12 5v4" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="4" r="1.5" fill="#22d3ee" />
        </svg>
      );
    case 'garden':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="4" y="13" width="16" height="7" rx="1.2" fill="#a8723d" stroke="#6b3e17" strokeWidth="1.4" />
          <path d="M8 13V8M16 13V7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="7" r="2.2" fill="#4ade80" />
          <circle cx="16" cy="6.5" r="2.2" fill="#4ade80" />
          <circle cx="12" cy="10" r="2" fill="#e04f44" />
        </svg>
      );
    case 'workbench':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="9" width="18" height="3.5" rx="1" fill="#dca45c" stroke="#784212" strokeWidth="1.4" />
          <path d="M6 12.5V20M18 12.5V20M6 16h12" stroke="#854c1c" strokeWidth="2" strokeLinecap="round" />
          <rect x="7" y="5" width="7" height="3.5" rx="0.8" fill="#38bdf8" />
          <path d="M16 5l2.5 2.5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'defense':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M6 18L10 5l2 13M18 18L14 5l-2 13" stroke="#e2e8f0" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="4" y="17" width="16" height="3.5" rx="1" fill="#9a4b14" stroke="#6c3108" strokeWidth="1.3" />
          <path d="M12 4l4 2-4 2V4z" fill="#dc2626" />
        </svg>
      );
    case 'repair_station':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4.5 16.5a1.5 1.5 0 0 0 2.1 2.1l4.8-4.8a4 4 0 0 0 5.4-5.4l-2.2 2.2-2.1-2.1 2.2-2.2z"
            fill="#fbbf24"
            stroke="#92400e"
            strokeWidth="1.4"
          />
        </svg>
      );
    case 'collector':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M5 18V7l7-3 7 3v11" stroke="#b8814a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 11h12M7 14h10M8 17h8" stroke="#d9c39e" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M9 9v9M12 8v10M15 9v9" stroke="#d9c39e" strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="12" cy="5.5" r="1.8" fill="#eab55c" stroke="#78350f" strokeWidth="1" />
        </svg>
      );
    case 'house_floor':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="4" width="18" height="16" rx="1.5" fill="#d9b38a" stroke="#7c502d" strokeWidth="1.5" />
          <path d="M3 9h18M3 14h18M9 4v5M15 9v5M9 14v6" stroke="#8f5d36" strokeWidth="1.2" />
        </svg>
      );
    case 'wall':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="4" y="5" width="16" height="14" rx="1" fill="#cfa478" stroke="#6c4424" strokeWidth="1.6" />
          <path d="M4 10h16M4 14h16" stroke="#7c502d" strokeWidth="1.3" />
        </svg>
      );
    case 'door':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="6" y="3" width="12" height="18" rx="1" fill="#b88454" stroke="#5c381c" strokeWidth="1.6" />
          <circle cx="15" cy="12" r="1.4" fill="#fbbf24" />
        </svg>
      );
    case 'window':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="4" y="5" width="16" height="14" rx="1" fill="#c49a6e" stroke="#5c381c" strokeWidth="1.5" />
          <rect x="7" y="7.5" width="10" height="7" fill="#bae6fd" stroke="#5c381c" strokeWidth="1.3" />
          <path d="M12 7.5v7M7 11h10" stroke="#5c381c" strokeWidth="1.2" />
        </svg>
      );
    case 'roof':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 13L12 5l9 8H3z" fill="#8f6346" stroke="#4f3322" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="5" y="13" width="14" height="5" fill="#cfa478" stroke="#4f3322" strokeWidth="1.3" />
        </svg>
      );
    case 'bed':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="4" y="12" width="16" height="6" rx="1" fill="#7c502d" />
          <rect x="4" y="9" width="3" height="11" rx="0.8" fill="#5c381c" />
          <rect x="7" y="9.5" width="4" height="3" rx="1" fill="#f3ead8" />
          <rect x="11" y="9.5" width="9" height="4" rx="1" fill="#b5533c" />
        </svg>
      );
    case 'chest':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="4" y="9" width="16" height="10" rx="1.5" fill="#9c6638" stroke="#475569" strokeWidth="1.5" />
          <path d="M4 12h16" stroke="#334155" strokeWidth="1.8" />
          <rect x="10.5" y="10.5" width="3" height="3.5" rx="0.6" fill="#d97706" />
        </svg>
      );
    case 'table_chair':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="4" y="9" width="11" height="2.8" rx="0.8" fill="#d19c67" stroke="#6c3e18" strokeWidth="1.2" />
          <path d="M6 12v7M13 12v7" stroke="#6c3e18" strokeWidth="1.8" />
          <path d="M17 13h4v6M21 8v5" stroke="#a8733d" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'lamp':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 4v15M8 19h8" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 6h4l1 4h-6l1-4z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
          <circle cx="14" cy="9" r="2.2" fill="#fef08a" opacity="0.8" />
        </svg>
      );
    case 'rug':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="6" width="18" height="12" rx="1.5" fill="#c85a43" stroke="#efe2ca" strokeWidth="1.8" />
          <polygon points="12,8 16,12 12,16 8,12" fill="#e6c48a" />
        </svg>
      );
    case 'wall_decor':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" fill="none" stroke="#c94238" strokeWidth="3.2" />
          <circle cx="12" cy="12" r="7" fill="none" stroke="#f8fafc" strokeWidth="1.2" strokeDasharray="3 3" />
        </svg>
      );
    case 'repair':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 17l7-7M10 6l4-2 5 5-2 4-4-1-3-6z"
            fill="#94a3b8"
            stroke="#e2e8f0"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M4 19l2 1 5-5" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'demolish':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M6 6l12 12M18 6L6 18" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
  }
};

export const SharkIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 28 24" fill="none" className={className}>
    {/* Crescent caudal fin & streamlined dorsal body */}
    <path
      d="M25.5 11.2c-1.8-.9-3.9-1.5-6.2-1.8L15.4 3.6c-.4-.6-1.2-.3-1.1.4l.4 5.2c-3-.1-5.9.5-8.1 1.7L2.4 7.4c-.3-.2-.7.1-.6.5l1.5 4.2-1.9 3.7c-.2.4.2.8.6.6l4.4-2.1c1.8 1 4.1 1.6 6.6 1.8l-1.3 3c-.2.5.4.9.8.6l3.4-2.9c3.7-.1 7.2-1.1 9.8-2.9.8-.6.8-1.9-.2-2.7z"
      fill="#4c6b82"
      stroke="#cbd5e1"
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
    {/* Pale underbelly shading */}
    <path
      d="M8.5 13.7c3.6 1.5 9.2 1.6 14.8-.6-.9.9-2.8 1.9-5.8 2.2-3.4.3-6.7-.2-9-1.6z"
      fill="#dbe5ec"
      opacity="0.85"
    />
    {/* Pectoral fin */}
    <path
      d="M15.8 13.4l-2.6 4.2c-.3.4.2.9.7.7l3.9-2.3"
      fill="#385366"
      stroke="#cbd5e1"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    {/* Gill slits & eye */}
    <path d="M18 11.2v2.1M19.3 11.3v1.9M20.6 11.5v1.6" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" />
    <circle cx="22.8" cy="11.4" r="0.85" fill="#0f172a" />
  </svg>
);
