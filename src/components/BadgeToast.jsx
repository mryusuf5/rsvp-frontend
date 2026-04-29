import { useState, useEffect } from 'react'
import { BADGES, TIER_COLORS, TIER_LABELS, parseEarnedId } from '../lib/badges'
import BadgeIcon from './BadgeIcon'

export default function BadgeToast({ badgeId: earnedId, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const { badgeId, rank } = parseEarnedId(earnedId)
  const badge = BADGES.find(b => b.id === badgeId)
  const tier = badge?.tiers.find(t => t.rank === rank)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 16)
    const t2 = setTimeout(() => setVisible(false), 2800)
    const t3 = setTimeout(() => onDismiss(), 3150)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDismiss])

  if (!badge || !tier) return null

  const tierColor = TIER_COLORS[rank] ?? '#A0AEC0'

  function dismiss() {
    setVisible(false)
    setTimeout(() => onDismiss(), 350)
  }

  return (
    <div
      className={`fixed bottom-28 left-4 right-4 z-[100] flex justify-center transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <div className="bg-neutral-8 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl w-full max-w-sm">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tierColor }}>
          <BadgeIcon id={badgeId} size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: tierColor }}>
            {TIER_LABELS[rank]} badge earned!
          </p>
          <p className="text-[14px] font-semibold text-shade-white">{badge.name}</p>
          <p className="text-[11px] text-neutral-4">{tier.label}</p>
        </div>
        <button onClick={dismiss} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-neutral-7 active:bg-neutral-6">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-neutral-4"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
