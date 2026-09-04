import { ImageResponse } from 'next/server'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: '#1A1F27',
        }}
      >
        <svg width="94" height="94" viewBox="0 0 24 24" fill="none">
          <path d="M9.5 4H4.5V20H9.5" stroke="#e34432" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14.5 4H19.5V20H14.5" stroke="#e34432" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
          <rect x="10.8" y="9.8" width="4.4" height="4.4" rx="1.1" fill="#e34432" />
        </svg>
      </div>
    ),
    size,
  )
}
