import { ServeGrip } from '@fanoutio/serve-grip'
import { config } from 'dotenv'
config()

// Enable real-time features powered by Fastly Fanout.
export const serveGrip = new ServeGrip({
  grip: process.env.GRIP_URL,
  gripVerifyKey: process.env.GRIP_VERIFY_KEY
})

export const publishEvent = async ({
  channel,
  eventData,
  event = 'update'
}) => {
  const data = `event: ${event}\n` + `data: ${JSON.stringify(eventData)}\n\n`

  const publisher = serveGrip.getPublisher()
  try {
    await publisher.publishHttpStream(channel, data)
  } catch (e) {
    console.error(e.msg)
    throw e
  }
}
