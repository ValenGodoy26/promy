import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <I {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </I>
);

export const IconStore = (p: IconProps) => (
  <I {...p}>
    <path d="M3 9l2-5h14l2 5" />
    <path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9" />
    <path d="M3 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0" />
  </I>
);

export const IconTag = (p: IconProps) => (
  <I {...p}>
    <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1.2" />
  </I>
);

export const IconReceipt = (p: IconProps) => (
  <I {...p}>
    <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2z" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </I>
);

export const IconUser = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </I>
);

export const IconLogout = (p: IconProps) => (
  <I {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </I>
);

export const IconSearch = (p: IconProps) => (
  <I {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </I>
);

export const IconPlus = (p: IconProps) => (
  <I {...p}>
    <path d="M12 5v14M5 12h14" />
  </I>
);

export const IconEdit = (p: IconProps) => (
  <I {...p}>
    <path d="M17 3a2.828 2.828 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
  </I>
);

export const IconTrash = (p: IconProps) => (
  <I {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </I>
);

export const IconCheck = (p: IconProps) => (
  <I {...p}>
    <path d="M20 6L9 17l-5-5" />
  </I>
);

export const IconX = (p: IconProps) => (
  <I {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </I>
);

export const IconAlert = (p: IconProps) => (
  <I {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </I>
);

export const IconShield = (p: IconProps) => (
  <I {...p}>
    <path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z" />
  </I>
);

export const IconFilter = (p: IconProps) => (
  <I {...p}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </I>
);

export const IconArrowRight = (p: IconProps) => (
  <I {...p}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </I>
);

export const IconTrending = (p: IconProps) => (
  <I {...p}>
    <path d="M23 6l-9.5 9.5-5-5L1 18" />
    <path d="M17 6h6v6" />
  </I>
);

export const IconActivity = (p: IconProps) => (
  <I {...p}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </I>
);

export const IconBuilding = (p: IconProps) => (
  <I {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
  </I>
);

export const IconChevronRight = (p: IconProps) => (
  <I {...p}>
    <path d="M9 18l6-6-6-6" />
  </I>
);

export const IconClock = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </I>
);

export const IconCalendar = (p: IconProps) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </I>
);

export const IconInstagram = (p: IconProps) => (
  <I {...p}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </I>
);

export const IconPhone = (p: IconProps) => (
  <I {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </I>
);

export const IconMapPin = (p: IconProps) => (
  <I {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </I>
);

export const IconImage = (p: IconProps) => (
  <I {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </I>
);

export const IconEye = (p: IconProps) => (
  <I {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </I>
);

export const IconPause = (p: IconProps) => (
  <I {...p}>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </I>
);

export const IconSettings = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </I>
);

export const IconHash = (p: IconProps) => (
  <I {...p}>
    <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
  </I>
);

export const IconArrowLeft = (p: IconProps) => (
  <I {...p}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </I>
);
