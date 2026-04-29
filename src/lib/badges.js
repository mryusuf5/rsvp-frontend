import api from './api'

export const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#A0AEC0',
  gold:   '#FBBF24',
}

export const TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold:   'Gold',
}

export const BADGES = [
  {
    id: 'reader',
    name: 'Reader',
    description: 'Total words read',
    tiers: [
      { rank: 'bronze', threshold: 100,   label: 'Read 100 words' },
      { rank: 'silver', threshold: 10000, label: 'Read 10,000 words' },
      { rank: 'gold',   threshold: 50000, label: 'Read 50,000 words' },
    ],
  },
  {
    id: 'page_turner',
    name: 'Page Turner',
    description: 'Total pages completed',
    tiers: [
      { rank: 'bronze', threshold: 5,   label: 'Complete 5 pages' },
      { rank: 'silver', threshold: 50,  label: 'Complete 50 pages' },
      { rank: 'gold',   threshold: 250, label: 'Complete 250 pages' },
    ],
  },
  {
    id: 'bookworm',
    name: 'Bookworm',
    description: 'Books finished',
    tiers: [
      { rank: 'bronze', threshold: 1,  label: 'Finish 1 book' },
      { rank: 'silver', threshold: 5,  label: 'Finish 5 books' },
      { rank: 'gold',   threshold: 20, label: 'Finish 20 books' },
    ],
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Books in your library',
    tiers: [
      { rank: 'bronze', threshold: 3,  label: 'Add 3 books' },
      { rank: 'silver', threshold: 10, label: 'Add 10 books' },
      { rank: 'gold',   threshold: 25, label: 'Add 25 books' },
    ],
  },
  {
    id: 'daily_achiever',
    name: 'Daily Achiever',
    description: 'Times hitting your daily goal',
    tiers: [
      { rank: 'bronze', threshold: 1,  label: 'Hit goal 1 time' },
      { rank: 'silver', threshold: 5,  label: 'Hit goal 5 times' },
      { rank: 'gold',   threshold: 20, label: 'Hit goal 20 times' },
    ],
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Words per minute',
    tiers: [
      { rank: 'bronze', threshold: 250, label: 'Read at 250 WPM' },
      { rank: 'silver', threshold: 400, label: 'Read at 400 WPM' },
      { rank: 'gold',   threshold: 750, label: 'Read at 750 WPM' },
    ],
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Longest reading streak',
    tiers: [
      { rank: 'bronze', threshold: 3,  label: '3-day streak' },
      { rank: 'silver', threshold: 7,  label: '7-day streak' },
      { rank: 'gold',   threshold: 30, label: '30-day streak' },
    ],
  },
]

export function getEarnedBadges() {
  try { return JSON.parse(localStorage.getItem('badges') || '[]') } catch { return [] }
}

// Returns true if newly awarded. Also syncs to server (fire-and-forget).
export function awardBadge(id) {
  const earned = getEarnedBadges()
  if (earned.find(b => b.id === id)) return false
  earned.push({ id, earnedAt: new Date().toISOString() })
  localStorage.setItem('badges', JSON.stringify(earned))
  api.post('/badges', { badgeId: id }).catch(() => {})
  return true
}

export function getReadingStats() {
  try { return JSON.parse(localStorage.getItem('readingStats') || '{}') } catch { return {} }
}

export function updateReadingStats(patch) {
  const next = { ...getReadingStats(), ...patch }
  localStorage.setItem('readingStats', JSON.stringify(next))
  return next
}

// Check all tiers of a badge against a value. Returns array of newly-awarded earned IDs.
export function checkTierBadges(badgeId, value) {
  const badge = BADGES.find(b => b.id === badgeId)
  if (!badge) return []
  const ids = []
  for (const tier of badge.tiers) {
    if (value >= tier.threshold && awardBadge(`${badgeId}_${tier.rank}`)) {
      ids.push(`${badgeId}_${tier.rank}`)
    }
  }
  return ids
}

// Parse an earned ID like 'speed_demon_gold' → { badgeId: 'speed_demon', rank: 'gold' }
export function parseEarnedId(earnedId) {
  for (const rank of ['bronze', 'silver', 'gold']) {
    if (earnedId.endsWith(`_${rank}`)) {
      return { badgeId: earnedId.slice(0, -(rank.length + 1)), rank }
    }
  }
  return { badgeId: earnedId, rank: null }
}
