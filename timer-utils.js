export function addMinutesTarget(minutes, now = Date.now()) {
  return now + minutes * 60 * 1000
}

export function formatClockTime(timestamp) {
  if (!Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatRemaining(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  const parts = [minutes, remainder]

  if (hours > 0) parts.unshift(hours)
  return parts.map((part) => String(part).padStart(2, '0')).join(':')
}

export function nextTargetAt(hours, minutes, now = Date.now()) {
  const target = new Date(now)
  target.setHours(hours, minutes, 0, 0)
  if (target.getTime() <= now) target.setDate(target.getDate() + 1)
  return target.getTime()
}
