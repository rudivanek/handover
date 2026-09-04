type MarkProps = { size?: number; color?: string; className?: string }

export function HandoverMark({ size = 20, color = '#e34432', className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ color }}
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

export function HandoverLogo({ size = 28, textSize, markClassName }: { size?: number; textSize?: number; markClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-[10px]">
      <HandoverMark size={size} color="#e34432" className={markClassName} />
      <span
        style={{ fontSize: textSize ?? size * 0.786, fontWeight: 600, letterSpacing: '-0.022em', color: '#25221e' }}
      >
        Handover
      </span>
    </span>
  )
}
