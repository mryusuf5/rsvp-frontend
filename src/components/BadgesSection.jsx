import { BADGES, TIER_COLORS, TIER_LABELS, getEarnedBadges } from '../lib/badges'
import BadgeIcon from './BadgeIcon'

function TierDot({ earned, rank }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-4 h-4 rounded-full border-2 transition-colors"
        style={earned
          ? { backgroundColor: TIER_COLORS[rank], borderColor: TIER_COLORS[rank] }
          : { borderColor: '#D1D5DB', backgroundColor: 'transparent' }
        }
      />
      <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: earned ? TIER_COLORS[rank] : '#9CA3AF' }}>
        {TIER_LABELS[rank][0]}
      </span>
    </div>
  )
}

// earnedBadges: optional array of {id, earnedAt} — if omitted, reads from localStorage (own account)
// showLocked: when false, hides badges with no tiers earned (used on profile pages)
export default function BadgesSection({ earnedBadges: propEarned, showLocked = true }) {
  const earned = propEarned ?? getEarnedBadges()
  const earnedIds = new Set(earned.map(b => b.id))

  const totalTiers = BADGES.reduce((s, b) => s + b.tiers.length, 0)
  const earnedTiers = earned.length

  function highestRank(badgeId) {
    for (const rank of ['gold', 'silver', 'bronze']) {
      if (earnedIds.has(`${badgeId}_${rank}`)) return rank
    }
    return null
  }

  const visibleBadges = showLocked
    ? BADGES
    : BADGES.filter(b => highestRank(b.id) !== null)

  if (!showLocked && visibleBadges.length === 0) return null

  return (
    <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider">Badges</p>
        <span className="text-[12px] font-semibold text-primary-1 bg-primary-1/10 px-2.5 py-1 rounded-full">
          {earnedTiers} / {totalTiers}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {visibleBadges.map(badge => {
          const topRank = highestRank(badge.id)
          const hasAny = topRank !== null
          const topTier = hasAny ? badge.tiers.find(t => t.rank === topRank) : null

          return (
            <div key={badge.id} className={`flex items-center gap-3 ${!hasAny ? 'opacity-40' : ''}`}>
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={hasAny
                  ? { backgroundColor: TIER_COLORS[topRank] }
                  : { backgroundColor: '#E5E7EB' }
                }
              >
                <BadgeIcon
                  id={badge.id}
                  size={20}
                  className={hasAny ? 'text-white' : 'text-neutral-5'}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-neutral-8">{badge.name}</p>
                <p className="text-[11px] text-neutral-4">
                  {hasAny ? topTier.label : badge.tiers[0].label}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                {badge.tiers.map(tier => (
                  <TierDot
                    key={tier.rank}
                    rank={tier.rank}
                    earned={earnedIds.has(`${badge.id}_${tier.rank}`)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
