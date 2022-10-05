import { config, https } from 'firebase-functions'
import { App, ExpressReceiver } from '@slack/bolt'

const expressReceiver = new ExpressReceiver({
  signingSecret: config().slack.signing_secret,
  endpoints: '/events',
  processBeforeResponse: true,
})
const app = new App({
  receiver: expressReceiver,
  token: config().slack.bot_token,
  processBeforeResponse: true,
})
// Global error handler
// app.error(console.log)

// Handle `/echo` command invocations
app.command('/echo-from-firebase', async ({ command, ack, say }) => {
  // Acknowledge command request
  await ack()

  // Requires:
  // Add chat:write scope + invite the bot user to the channel you run this command
  // Add chat:write.public + run this command in a public channel
  await say(`You said "${command.text}"`)
})

// https://{your domain}.cloudfunctions.net/slack/events
export const slack = https.onRequest(expressReceiver.app)
