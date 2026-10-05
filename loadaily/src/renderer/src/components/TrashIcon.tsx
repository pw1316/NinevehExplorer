interface TrashIconProps {
  size?: number
  className?: string
}

export default function TrashIcon({ size = 12, className }: TrashIconProps): JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 4h10" />
      <path d="M5.5 4V2.5h3V4" />
      <path d="M3.4 4l.6 8h6l.6-8" />
      <path d="M5.8 6.2v4" />
      <path d="M8.2 6.2v4" />
    </svg>
  )
}
