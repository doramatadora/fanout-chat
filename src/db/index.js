import { publishEvent } from '../serve-grip.js'

import fs from 'fs'
import sql3 from 'sqlite3'
const sqlite3 = sql3.verbose()

import * as dbWrapper from 'sqlite'
import Filter from 'bad-words'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

import * as setup from './init.js'

const dbFile = './.data/chat.db'
const exists = fs.existsSync(dbFile)

const filter = new Filter()

const cleanMsg = (str, maxLength = 500) => {
  const truncated = str.length > maxLength ? str.substring(0, maxLength) : str
  let noSwears
  try {
    noSwears = filter.clean(truncated)
  } catch (_) {
    noSwears = truncated
  }
  const mdToHtml = marked.parseInline(noSwears)
  const safeHtml = DOMPurify.sanitize(mdToHtml)
  return safeHtml
}

let db

dbWrapper
  .open({
    filename: dbFile,
    driver: sqlite3.Database
  })
  .then(async dBase => {
    db = dBase

    try {
      if (!exists) {
        for (const initStmt of setup.INIT_DB.split(';')) {
          if (initStmt.trim().length) {
            await db.run(initStmt)
          }
        }
        console.log('New database created!')
      } else {
        const { name, slug } = await db.get('SELECT * FROM rooms LIMIT 1')
        console.log(`Default room is ${name} (#${slug})`)
      }
    } catch (dbError) {
      console.error(dbError)
    }
  })

export const getARoom = async () => {
  const room = await db.get('SELECT * FROM rooms LIMIT 1')
  if (!room?.id) {
    throw new Error(`No rooms found`)
  }
  return room
}

export const getRoomId = async slug => {
  const room = await db.get('SELECT id FROM rooms WHERE slug=? LIMIT 1', slug)
  if (!room?.id) {
    throw new Error(`Room ${slug} not found`)
  }
  return room.id
}

export const getOldestMsgId = async slug => {
  try {
    const roomId = await getRoomId(slug)
    const msg = await db.get(
      'SELECT id FROM messages WHERE room_id=? LIMIT 1',
      roomId
    )
    if (!msg?.id) {
      throw new Error(`No messages`)
    }
    return msg.id
  } catch (dbError) {
    console.error(dbError)
  }
}

export const getMsgSender = async msgId => {
  const msg = await db.get(
    'SELECT user FROM messages WHERE id=? LIMIT 1',
    msgId
  )
  if (!msg?.user) {
    throw new Error(`Message #${msgId} not found`)
  }
  return msg.user
}

export const getMessages = async ({
  slug,
  lastId,
  limit = 100,
  offset = 0
}) => {
  try {
    const roomId = await getRoomId(slug)

    return lastId
      ? await db.all(
          'SELECT * FROM messages WHERE room_id=? AND id<? ORDER BY id DESC LIMIT ? OFFSET ?',
          [roomId, lastId, limit, offset]
        )
      : await db.all(
          'SELECT * FROM messages WHERE room_id=? ORDER BY id DESC LIMIT ? OFFSET ?',
          [roomId, limit, offset]
        )
  } catch (dbError) {
    console.error(dbError)
  }
}

export const sendMessage = async ({ user, message, slug }) => {
  try {
    const msg = cleanMsg(message)
    const roomId = await getRoomId(slug)
    const dateUtc = new Date().toISOString()
    const { lastID } = await db.run(
      'INSERT INTO messages (user, message, room_id, date_sent) VALUES (?, ?, ?, ?)',
      [user, msg, roomId, dateUtc]
    )
    const eventData = await db.get(
      'SELECT user, message, id, date_sent FROM messages WHERE id=?',
      lastID
    )
    await publishEvent({ channel: `room-${slug}`, eventData })
    console.debug(`Message received in #${slug}`, eventData)
    return true
  } catch (dbError) {
    console.error(dbError)
    return false
  }
}

export const deleteMessage = async ({ id, slug }) => {
  try {
    await db.run('DELETE FROM messages WHERE id=?', id)
    const eventData = { id }
    await publishEvent({ channel: `room-${slug}`, eventData, event: 'delete' })
    console.info(`Message deleted in #${slug}`, eventData)
  } catch (dbError) {
    console.error(dbError)
  }
}

export const clearHistory = async ({ user, slug }) => {
  try {
    const roomId = slug ? await getRoomId(slug) : null

    const refreshRoom = async slug => {
      const eventData = { slug }
      await publishEvent({
        channel: `room-${slug}`,
        eventData,
        event: 'refresh'
      })
      console.info(`Refreshing #${slug}`, eventData)
    }

    if (user && roomId) {
      await db.run('DELETE FROM messages WHERE room_id=? AND user=?', [
        roomId,
        user
      ])
      return await refreshRoom(slug)
    }

    if (user) {
      const rooms = await db.all(
        'SELECT rooms.slug FROM rooms JOIN messages ON rooms.id = messages.room_id WHERE messages.user=?',
        user
      )
      await db.run('DELETE FROM messages WHERE user=?', user)
      if (rooms?.length) {
        return await Promise.all(rooms.map(({ slug }) => refreshRoom(slug)))
      }
    }

    if (roomId) {
      await db.run('DELETE FROM messages WHERE room_id=?', roomId)
      return await refreshRoom(slug)
    }
  } catch (dbError) {
    console.error(dbError)
  }
}

export const errorMessage =
  'Whoops! Error connecting to the database–please try again!'
export const setupMessage =
  "🚧 Whoops! Looks like the database isn't setup yet! 🚧"
