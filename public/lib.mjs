export function getRelativeTime (dateStr, utcOffset = 0, locale = 'en-US') {
  const clientLocale =
    (typeof navigator !== 'undefined' ? navigator.language : 0) || locale
  const date = new Date(dateStr)
  const timestamp = date.getTime()
  const rtf = new Intl.RelativeTimeFormat(clientLocale, {
    numeric: 'auto',
    style: 'narrow'
  })
  const opts = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  const dopts = { day: '2-digit', month: '2-digit' }
  const hrstf = new Intl.DateTimeFormat(clientLocale, opts)
  const dtf = new Intl.DateTimeFormat(clientLocale, {
    ...opts,
    ...dopts
  })
  const ytf = new Intl.DateTimeFormat(clientLocale, {
    ...opts,
    ...dopts,
    year: '2-digit'
  })
  const diffMs = timestamp - new Date().getTime()
  const diffS = Math.round(diffMs / 1000)
  const diffM = Math.round(diffS / 60)
  const diffH = Math.round(diffM / 60)
  const diffD = Math.round(diffH / 24)

  if (!diffD && !diffH && !diffM) return rtf.format(diffS, 'second')
  if (!diffD && !diffH) return rtf.format(diffM, 'minute')
  if (!diffD) return rtf.format(diffH, 'hour') + ', ' + hrstf.format(date)

  if (Math.abs(diffD) > 365)
    return rtf.format(Math.round(diffD / 365), 'year') + ', ' + ytf.format(date)
  if (Math.abs(diffD) > 33)
    return rtf.format(Math.round(diffD / 30), 'month') + ', ' + dtf.format(date)
  if (Math.abs(diffD) > 7)
    return rtf.format(Math.round(diffD / 7), 'week') + ', ' + dtf.format(date)
  return rtf.format(diffD, 'day') + ', ' + hrstf.format(date)
}

export function debounce (func, delay) {
  let timeoutId

  return function (...args) {
    clearTimeout(timeoutId)

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}
