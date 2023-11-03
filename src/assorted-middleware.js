export const setCurrentUser = (req, res, next) => {
  const xUserHeader = req.get('x-user')
  if (xUserHeader) {
    res.locals.currentUser = xUserHeader
  } else if (process.env.IS_LOCAL === 'true') {
    res.locals.currentUser = 'Testy McTestface'
  }
  next()
}

export const setUtcOffset = (req, res, next) => {
  const xUtcOffsetHeader = req.get('x-utc-offset')
  if (xUtcOffsetHeader) {
    res.locals.utcOffset = xUtcOffsetHeader
  } else if (process.env.IS_LOCAL === 'true') {
    res.locals.utcOffset = 0
  }
  next()
}

const enforceApiKey = adminOnly => (req, res, next) => {
  if (process.env.IS_LOCAL) return next()
  const apiKeyHeader = req.get('x-api-key')?.trim()
  const keys = adminOnly ? res.app.locals.adminKeySet : res.app.locals.keySet
  if (!apiKeyHeader) {
    return res.status(401).json({ error: 'API key is missing' })
  }
  if (!keys.includes(apiKeyHeader)) {
    return res.status(403).json({ error: 'Invalid API key' })
  }
  next()
}

export const requireApiKey = enforceApiKey()
export const requireAdminKey = enforceApiKey(true)
