import { config } from 'dotenv'
config()

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

import serveStatic from 'serve-static'
import bodyParser from 'body-parser'
import { create } from 'express-handlebars'
import { serveGrip } from './src/serve-grip.js'
import { getRelativeTime } from './public/lib.mjs'
import {
  requireAdminKey,
  requireApiKey,
  setCurrentUser,
  setUtcOffset
} from './src/assorted-middleware.js'

import * as db from './src/db/index.js'
import seo from './src/seo.js'

const app = express()

const MSG_FETCH_LIMIT = 20

app.locals.keySet = `${process.env.API_KEYS}`.trim().split(/\s*,\s*/)
app.locals.adminKeySet = [`${process.env.ADMIN_KEY}`.trim()]

// Serve static assets.
app.use(
  serveStatic(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public'))
)

// Set the UTC offset (from x-utc-offset header, or 0).
app.use(setUtcOffset)

// Set the current user (from x-user header, or a local test name).
app.use(setCurrentUser)

// Use handlebars for templating.
const hbs = create({
  helpers: {
    ifeq: function ifeq (v1, v2, options) {
      return v1 === v2 ? options.fn(this) : options.inverse(this)
    }
  }
})
app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')
app.set('views', './src/pages/')

// Enable real-time features powered by Fastly Fanout / Pushpin.
app.use(serveGrip)

app.get('/', async (req, res) => {
  const { slug } = await db.getARoom()
  res.redirect(`/room/${slug}`)
})

app.get('/room/:slug', async (req, res) => {
  const { slug } = req.params
  // Check if room exists
  try {
    await db.getRoomId(slug)
  } catch (err) {
    return res.status(404).end('Not Found')
  }

  const offset = req.query.offset || 0
  const msgs = await db.getMessages({ slug, offset, limit: MSG_FETCH_LIMIT })
  const firstMsgId = (await db.getOldestMsgId(slug)) || -1

  const messages = msgs
    ?.map(m => {
      m.relTime = getRelativeTime(m.date_sent, res.locals.utcOffset)
      return m
    })
    .reverse()

  const view = {
    seo,
    slug,
    messages,
    currentUser: res.locals.currentUser,
    firstMsgShownId: messages?.[0]?.id,
    firstMsgId
  }

  res.render('room', view)
})

app.get('/room/:slug/messages', async (req, res) => {
  const { slug } = req.params

  // Check if request is for Server-Sent Events via GRIP.
  if (req.accepts('text/event-stream')) {
    if (!req.grip.isProxied) {
      return res.status(406).send('text/event-stream requires GRIP proxy')
    }
    if (req.grip.needsSigned && !req.grip.isSigned) {
      return res
        .status(501)
        .send('text/event-stream requires authenticated GRIP proxy')
    }
    // Start GRIP instructions (via Fastly Fanout).
    const gripInstruct = res.grip.startInstruct()
    gripInstruct.addChannel(`room-${slug}`)
    gripInstruct.setHoldStream()

    return res.set('Content-Type', 'text/event-stream').status(200).end()
  }

  const lastId = req.query.lastId
  const messages = await db.getMessages({ slug, lastId, limit: MSG_FETCH_LIMIT })

  res.json({ messages })
})

// API-key authentication from this point on.
app.use('/room/:slug/messages', requireApiKey)

// Parse JSON request bodies.
app.use(bodyParser.json())

app.post('/room/:slug/messages', async (req, res) => {
  const { slug } = req.params
  const user = res.locals.currentUser
  const { message } = req.body
  let msgSent
  if (user && message) {
    msgSent = await db.sendMessage({ user, message, slug }).catch(() => false)
  }
  res.status(msgSent ? 200 : 400).end()
})

app.delete('/room/:slug/messages/:id', async (req, res) => {
  const { id } = req.params
  const sender = await db.getMsgSender(id)
  if (sender !== res.locals.currentUser) return res(403).end('Unauthorized')
  await db.deleteMessage(id)
  res.status(200).end()
})

// Admin routes.
app.use('/admin', requireAdminKey)

app.delete('/admin/room/:slug/:user?', async (req, res) => {
  const { slug, user } = req.params
  await db.clearHistory({ slug, user })
  res.status(200).end()
})

app.delete('/admin/users/:user', async (req, res) => {
  const { user } = req.params
  await db.clearHistory({ user })
  res.status(200).end()
})

// Run the server and report out to the logs
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Chat app up and running!`)
})
