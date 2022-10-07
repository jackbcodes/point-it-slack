// @ts-nocheck

import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'

import { config, https } from 'firebase-functions'
import admin from 'firebase-admin'

import { App, ExpressReceiver } from '@slack/bolt'

import { nowOrLaterActionBlock, dateTimeInputBlock, getChannelsPlayersBlock } from './blocks'
import { formatUsers } from './utils'

dayjs.extend(advancedFormat)

admin.initializeApp()

const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

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

// ------------ Dave's code ---------------

app.shortcut({ callback_id: 'start_session' }, async ({ ack, shortcut, client, logger }) => {
  await ack()

  try {
    const result = await client.views.open({
      trigger_id: shortcut.trigger_id,
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
  } catch (error) {
    logger.error(error)
  }
})

// Listen for a now-or-later action
app.action('now-or-later', async ({ ack, body, client, action, logger }) => {
  await ack()

  const nowOrLater = action['selected_option'].value || 'now'

  logger.info('nowOrLater ===>', nowOrLater)

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
        ...nowOrLaterActionBlock(nowOrLater),
        ...getChannelsPlayersBlock(),
        ...(nowOrLater === 'later' ? dateTimeInputBlock() : []),
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
  text: 'You have been invited to join a game :wave:',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Hi ${formattedUsers} :wave:`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'You have been invited to play in a PointIt game.',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Join session',
            emoji: true,
          },
          style: 'primary',
          url: gameUrl,
          action_id: 'link_click',
        },
      ],
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
          text: `Started by <@${initiatingUser.displayName}>`,
        },
      ],
    },
  ],
})

app.action('link_click', async ({ ack }) => {
  await ack()
})

// Listen for a view_submission event
app.view('pointit-modal', async ({ ack, view, client, logger, payload, body }) => {
  await ack()

  const doc = await admin.firestore().collection('games').add({ name: 'Slack PointIt' })

  logger.info(doc)

  const channel = view.state.values['channel']['channel-select-action'].selected_conversation

  const gameUrl = `https://pointit.dev/game/${doc.id}`

  const users = view.state.values['users']['user-select-action'].selected_users
  const formattedUsers = formatUsers(users)

  const {
    user: {
      profile: { image_24, real_name, display_name },
    },
  } = await client.users.info({
    user: body.user.id,
  })

  const pointItSessionMessage = generatePointItSessionMessage({
    channel: view.state.values['channel']['channel-select-action'].selected_conversation,
    formattedUsers,
    gameUrl,
    initiatingUser: {
      image: image_24,
      displayName: display_name.length ? display_name : real_name,
    },
  })

  try {
    const date = view.state.values['date']?.['datepicker-action'].selected_date
    const time = view.state.values['time']?.['timepicker-action'].selected_time

    const dateTime = dayjs(`${date} ${time}`)

    console.log('dateTime', date, time, dateTime, dateTime.format('HH:mm'))

    if (date) {
      console.log(Date.parse([date, time].join('T')))
      const scheduledMessage = await client.chat.scheduleMessage({
        ...pointItSessionMessage,
        text: 'You have been invited to join a game :wave:',
        // TODO: Fix time zone malarky
        // users.info zimezone... https://github.com/slackapi/bolt-js/issues/944
        post_at: String(dateTime.subtract(1, 'hour').unix()),
      })

      console.log(scheduledMessage)

      // TODO: Add delete session
      await client.chat.postEphemeral({
        user: body.user.id,
        channel,
        text: `:thumbsup:  Your PointIt session is scheduled for ${dateTime.format('HH:mmA on dddd, Do MMMM')}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:alarm_clock: Your PointIt session is scheduled for ${dateTime.format('HH:mmA on dddd, Do MMMM')}`,
            },
            accessory: {
              // action_id: 'delete-session',
              // Gonna do this... https://stackoverflow.com/questions/69460320/passing-additional-data-to-the-action-listeners-along-with-the-block-actions-pay
              value: scheduledMessage.scheduled_message_id as string,
              // value: JSON.stringify({ scheduledMessageId: scheduledMessage.scheduled_message_id, }),
              //   scheduledMessageId: scheduledMessage.scheduled_message_id,
              //   channel,
              // },
              type: 'button',
              style: 'primary',
              text: {
                type: 'plain_text',
                text: 'Delete session',
              },
            },
          },
        ],
      })
      // TODO: Post confirmation message for the posters eyes only
      return
    }

    // @ts-ignore
    await client.chat.postMessage(pointItSessionMessage)
  } catch (errorResponse) {
    // @ts-ignore
    const { ok, error } = errorResponse?.data || {}

    if (ok) return

    logger.error('viewSubmission:error', ok, error, errorResponse)
  }
})

// This will be used in native slack game
app.action('join-session', async ({ ack, payload, body, client }) => {
  await ack()

  // When join session is clicked, create player in firestore
  const doc = await admin
    .firestore()
    .collection('games')
    .doc(payload.value)
    .collection('players')
    .add({ isSpectator: false, name: body.user.name, userId: body.user.id })

  // When join clicked, check if is first joiner except from creator
  // If yes, post message for game ui
  // If no, update message for game ui

  const players = await admin.firestore().collection('games').doc(payload.value).collection('players').get()

  const isFirstJoin = players.size === 2

  if (isFirstJoin) {
    client.chat.postMessage({
      channel: 'general',
      blocks: [
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Spectator mode?',
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Enable',
              emoji: true,
            },
            value: 'click_me_123',
            action_id: 'button-action',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '123456 - Ticket name',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: 'Please submit your size for ticket.',
            emoji: true,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '1',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-0',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '2',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-1',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '3',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-2',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '5',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-3',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '8',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-4',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '13',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-5',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '20',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-6',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: ':sleeping:',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-7',
            },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Players',
            emoji: true,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'image',
              image_url: 'https://ca.slack-edge.com/EDS8G1JGM-WE3FF4LGL-0bf10e9c8739-512',
              alt_text: 'Jack Brown',
            },
            {
              type: 'mrkdwn',
              text: '*@Jack Brown* voted :eight:',
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'image',
              image_url: 'https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg',
              alt_text: 'cute cat',
            },
            {
              type: 'mrkdwn',
              text: '*@Dave* is voted :two:',
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'image',
              image_url: 'https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg',
              alt_text: 'cute cat',
            },
            {
              type: 'mrkdwn',
              text: '*@Katrina* is voted :eight:',
            },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Result',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Average score is :five: or most common is :eight:',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Actions:',
            emoji: true,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: ':thinking_face: Revote',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-0',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: ':tada: Submit',
                emoji: true,
              },
              value: 'click_me_123',
              action_id: 'actionId-3',
            },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Ready to size the next ticket?',
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: ':repeat: New game',
              emoji: true,
            },
            value: 'click_me_123',
            url: 'https://google.com',
            action_id: 'button-action',
          },
        },
      ],
    })
  } else {
    // First, find game ui message

    console.log('bot token ===> ', config().slack.bot_token)

    const response = client.search.messages({
      token: config().slack.bot_token,
      query: 'Please submit your size for ticket.',
    })

    console.log(response)

    // Second, update said message
    client.chat.update({
      token: config().slack.bot_token,
      channel: 'general',
      ts: '',
    })
  }
})

export const slack = https.onRequest(expressReceiver.app)
