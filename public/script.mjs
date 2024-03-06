import { getRelativeTime, debounce } from './lib.mjs'

const SLUG = document.getElementById('slug').value
const CURRENT_USER = document.getElementById('user').value
const UTC_OFFSET = document.getElementById('utc-offset').value || 0
const ROOM_URL = `/room/${SLUG}`
const ROOM_MESSAGES_URL = `${ROOM_URL}/messages`
const FIRST_MSG_ID = document.getElementById('first-msg-id').value

const loadMoreBtn = document.getElementById('load-more')
const scrollToBottomBtn = document.getElementById('scroll-to-bottom')
const sendBtn = document.getElementById('msg-send')
const msgInput = document.getElementById('msg-input')
const chatArea = document.getElementById('chat')

const INPUT_HEIGHT = msgInput.clientHeight

const timestamps = document.getElementsByClassName('timestamp')

let loadingMessages

updateTimestamps()
scrollToBottom()

msgInput.focus()

scrollToBottomBtn.addEventListener('click', scrollToBottom)
chatArea.addEventListener('scrollend', toggleScrollBtn)
sendBtn.addEventListener('click', sendMessage)

msgInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.shiftKey) return
  e.preventDefault()
  sendMessage()
})

document.addEventListener('keydown', e => {
  if (!/^[a-zA-Z0-9\s\p{P}]$/.test(e.key)) return
  msgInput.focus()
  e.stopImmediatePropagation()
})

msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto'
  msgInput.style.height = msgInput.scrollHeight + 'px'
  msgInput.parentElement.style.height = msgInput.scrollHeight + 'px'
})

if (loadMoreBtn)
  loadMoreBtn.addEventListener('click', () =>
    debounce(loadOlderMessages, 100)()
  )

chatArea.addEventListener('click', async e => {
  if (e.target.classList.contains('msg-delete')) {
    try {
      const chat = e.target.parentElement.parentElement
      const delRes = await fetch(`${ROOM_MESSAGES_URL}/${chat.dataset.id}`, {
        method: 'DELETE'
      })
      if (!delRes.ok) throw new Error(`HTTP ${delRes.status}.`)
      chat.remove()
    } catch (e) {
      console.error(`Couldn't delete that message:`, e)
    }
  }
})

// Set an interval to refresh timestamps every 5 seconds.
const interval = setInterval(updateTimestamps, 5000)

// EventSource (real-time functionality).
try {
  const roomEvtSrc = new EventSource(ROOM_MESSAGES_URL)
  roomEvtSrc.addEventListener('update', e => {
    const message = JSON.parse(e.data)
    console.log('Received new message', { message })
    const msg = createChatDiv(message)
    chatArea.insertBefore(msg, scrollToBottomBtn)
    scrollToBottom()
  })
  roomEvtSrc.addEventListener('delete', e => {
    const message = JSON.parse(e.data)
    console.log('Received delete instruction', { message })
    document.querySelector(`.chat[data-id="${message.id}"]`)?.remove()
    scrollToBottom()
  })
} catch (e) {
  console.error(
    'Connection to EventSource failed! Real-time messaging unavailable.',
    e
  )
}

// Scroll the chat area to the bottom.
function scrollToBottom () {
  chatArea.scrollTop = chatArea.scrollHeight
  toggleScrollBtn()
}

// Toggle visibility of scroll to bottom button (hide if at chat area bottom).
function toggleScrollBtn () {
  scrollToBottomBtn.style.visibility =
    chatArea.scrollHeight > chatArea.clientHeight &&
    chatArea.scrollTop < chatArea.scrollHeight - chatArea.clientHeight - 100
      ? 'visible'
      : 'hidden'
  scrollToBottomBtn.blur()
}

// Update all timestamps.
function updateTimestamps () {
  for (let i = 0; i < timestamps.length; i++) {
    const tEl = timestamps[i]
    tEl.innerText = getRelativeTime(tEl.dataset.ts, UTC_OFFSET)
  }
}

// Send message functionality.
async function sendMessage () {
  const message = msgInput.value?.trim()
  if (!message.length) return
  let sendRes = {}
  try {
    sendRes = await fetch(ROOM_MESSAGES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    if (sendRes.redirected) {
      console.error('Redirected to', sendRes.headers.get('Location'))
      location.href = sendRes.headers.get('Location')
    }
    if (!sendRes.ok) throw new Error(`HTTP ${sendRes.status}.`)
    msgInput.value = ''
  } catch (e) {
    console.error(`Uh-oh! Couldn't send message (HTTP ${sendRes.status}).`)
  }
  sendBtn.blur()
  msgInput.focus()
  msgInput.style.height = INPUT_HEIGHT + 'px'
  msgInput.parentElement.style.height = INPUT_HEIGHT + 'px'
}

// Load and prepend older messages.
async function loadOlderMessages () {
  if (loadingMessages) return
  loadingMessages = true
  loadMoreBtn.blur()
  let msgUrl = ROOM_MESSAGES_URL
  const oldestMsg = document.querySelector('.chat-area .chat')
  if (oldestMsg) {
    msgUrl += `?lastId=${oldestMsg.dataset.id}`
  }

  try {
    const msgReq = await fetch(msgUrl, {
      headers: { Accept: 'application/json' }
    })
    const data = await msgReq.json()
    if (!data.messages.length) {
      loadMoreBtn.style.display = 'none'
      return
    }
    prependMessages(data.messages)
  } catch (e) {
    console.error(e)
  }
  loadingMessages = false
}

// Append older messages to the top of the chat area.
function prependMessages (messages) {
  let oldestMsgId = 0
  messages.forEach(m => {
    oldestMsgId = m.id
    const msg = createChatDiv(m)
    loadMoreBtn.insertAdjacentElement('afterend', msg)
    chatArea.scrollTop += msg.clientHeight
  })
  if (oldestMsgId <= FIRST_MSG_ID) {
    loadMoreBtn.style.display = 'none'
  }
}

// Function to create a chat div based on the message data.
function createChatDiv (msg) {
  const divWithClass = (cls, text) => {
    const div = document.createElement('div')
    div.classList.add(cls)
    if (text) div[cls === 'message' ? 'innerHTML' : 'textContent'] = text
    return div
  }

  const chatDiv = divWithClass('chat')
  chatDiv.classList.add(msg.user === CURRENT_USER ? 'sent' : 'received')
  chatDiv.setAttribute('data-id', msg.id)

  const msgInfoDiv = divWithClass('msg-info')
  const msgFromDiv = divWithClass('msg-from', msg.user)
  const timestampDiv = divWithClass(
    'timestamp',
    getRelativeTime(msg.date_sent, UTC_OFFSET)
  )
  timestampDiv.dataset.ts = msg.date_sent
  const messageDiv = divWithClass('message', msg.message)

  msgInfoDiv.append(msgFromDiv)

  if (msg.user === CURRENT_USER) {
    const deleteBtn = document.createElement('button')
    deleteBtn.classList.add('msg-delete')
    deleteBtn.setAttribute('aria-label', 'Delete this message')
    msgInfoDiv.append(deleteBtn)
  }

  chatDiv.append(msgInfoDiv)
  chatDiv.append(messageDiv)
  chatDiv.append(timestampDiv)

  return chatDiv
}
