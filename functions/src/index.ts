// @ts-nocheck

import { config, https } from 'firebase-functions'
import { App, ExpressReceiver } from '@slack/bolt'
import * as dayjs from 'dayjs'

import { nowOrLaterActionBlock, dateTimeInputBlock, getChannelsPlayersBlock } from './blocks'
import { formatUsers } from './utils'

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

// TODO: Change to shortcut
// Listen for command to launch the modal
app.command('/pointit', async ({ ack, body, client, logger, payload }) => {
  await ack()

  try {
    const result = await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        title: {
          // TODO: Add Icon
          type: 'plain_text',
          text: 'PointIt',
        },
        blocks: [
          // {
          //   type: 'divider',
          // },
          // {
          //   dispatch_action: true,
          //   type: 'input',
          //   element: {
          //     type: 'plain_text_input',
          //     action_id: 'plain_text_input-action',
          //   },
          //   label: {
          //     type: 'plain_text',
          //     text: 'Enter VSTS ticket number e.g. 898380',
          //     emoji: true,
          //   },
          // },
          {
            type: 'divider',
          },
          ...nowOrLaterActionBlock(),
        ],
      },
    })
    logger.info('result', result)
  } catch (error) {
    logger.error(error)
  }
})

// Listen for a now-or-later action
app.action('now-or-later', async ({ ack, body, client, action }) => {
  await ack()

  const nowOrLater = action['selected_option'].value

  const result = await client.views.update({
    view_id: body.view.id,
    hash: body.view.hash,
    view: {
      type: 'modal',
      // TODO: Rename callback id
      callback_id: 'pointit-modal',
      title: {
        type: 'plain_text',
        text: 'PointIt',
      },
      blocks: [
        {
          type: 'divider',
        },
        ...(nowOrLater === 'later' ? dateTimeInputBlock() : []),
        ...getChannelsPlayersBlock(),
      ],
      submit: {
        type: 'plain_text',
        text: 'Submit',
      },
    },
  })
})

const generatePointItSessionMessage = ({ channel, formattedUsers, gameUrl, initiatingUser }) => ({
  channel,
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Hi ${formattedUsers}

You have been invited to vote in a <${gameUrl}|PointIt session>.

        `,
      },
      accessory: {
        type: 'button',
        value: gameUrl,
        style: 'primary',
        text: {
          type: 'plain_text',
          text: 'Join session',
        },
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'image',
          image_url: initiatingUser.image,
          alt_text: initiatingUser.displayName,
        },
        {
          type: 'mrkdwn',
          text: `Started by ${initiatingUser.displayName}`,
        },
      ],
    },
  ],
})

// TODO: Update the radio buttons so they appear throughout the modal

// Listen for a view_submission event
app.view('pointit-modal', async ({ ack, view, client, logger, payload, body }) => {
  await ack()

  logger.info('payload2', JSON.stringify({ payload, body }))

  // TODO: Call Jack & Aaron's function here try...catch

  const channel = view.state.values['channel']['channel-select-action'].selected_conversation

  const gameUrl = 'https://point-it-git-story-ado-integration-point-it.vercel.app/game/yfSZS3OXrlKoKbuQq0io'

  const users = view.state.values['users']['user-select-action'].selected_users
  const formattedUsers = formatUsers(users)

  const {
    user: {
      profile: { image_24, display_name },
    },
  } = await client.users.info({
    user: body.user.id,
  })

  console.log(image_24, display_name)

  const pointItSessionMessage = generatePointItSessionMessage({
    channel,
    formattedUsers,
    gameUrl,
    initiatingUser: {
      image: image_24,
      displayName: display_name,
    },
  })

  try {
    // TODO: Add scheduling here...
    const date = view.state.values['date']?.['datepicker-action'].selected_date
    const time = view.state.values['time']?.['timepicker-action'].selected_time
    const dateTime = dayjs(`${date} ${time}`)
    if (date) {
      console.log(Date.parse([date, time].join('T')))
      const scheduledMessage = await client.chat.scheduleMessage({
        ...pointItSessionMessage,
        text: 'Looking towards the future',
        // TODO: Fix time zone malarky
        post_at: Date.parse([date, time].join('T')) / 1000 - 3600,
      })

      console.log(scheduledMessage)

      // TODO: Add delete session
      await client.chat.postEphemeral({
        user: body.user.id,
        channel,
        text: `:alarm_clock: Your PointIt session is scheduled for ${dateTime.format('HH:MMA on dddd, DD MMMM')}`,
      })
      // TODO: Post confirmation message for the posters eyes only
      return
    }

    await client.chat.postMessage(pointItSessionMessage)
  } catch (errorResponse) {
    const { ok, error } = errorResponse?.data || {}

    if (ok) return

    logger.error('viewSubmission:error', ok, error, errorResponse)
  }
})

// https://{your domain}.cloudfunctions.net/slack/events
export const slack = https.onRequest(expressReceiver.app)
