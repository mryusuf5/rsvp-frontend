export default function BadgeIcon({ id, size = 24, className = '' }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', className }

  switch (id) {
    case 'first_steps':
      return <svg {...p}><path d="M5 12h14M14 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>

    case 'page_turner':
      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>

    case 'bookworm':
      return <svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>

    case 'collector':
      return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="10" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>

    case 'daily_achiever':
      return <svg {...p}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>

    case 'speed_demon':
      return <svg {...p}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="currentColor"/></svg>

    case 'lightning':
      return <svg {...p}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="currentColor" opacity="0.45"/><polygon points="16,1 7,12 14,12 13,21 22,10 15,10" fill="currentColor"/></svg>

    case 'word_warrior':
      return <svg {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>

    case 'bibliophile':
      return <svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>

    case 'completionist':
      return <svg {...p}><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M6 9H3.5a2.5 2.5 0 0 0 0 5H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18 9h2.5a2.5 2.5 0 0 1 0 5H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 22h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>

    default:
      return <svg {...p}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/></svg>
  }
}
