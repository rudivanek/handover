type MarkProps = { size?: number; className?: string }

export function HandoverMark({ size = 20, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9.5 4H4.5V20H9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 4H19.5V20H14.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="10.8" y="9.8" width="4.4" height="4.4" rx="1.1" fill="currentColor" />
    </svg>
  )
}

export function HandoverLogo({ size = 19 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-[#1A1F27]">
      <HandoverMark size={size} />
      <span
        className="font-semibold"
        style={{ fontSize: size * 0.79, letterSpacing: '-0.01em' }}
      >
        Handover
      </span>
    </span>
  )
}
