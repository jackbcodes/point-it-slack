// @ts-nocheck

import { config, https } from 'firebase-functions'
import admin from 'firebase-admin'

import axios from 'axios'

import { App, ExpressReceiver } from '@slack/bolt'

import { nowOrLaterActionBlock, dateTimeInputBlock, getChannelsPlayersBlock } from './blocks'
import { formatUsers } from './utils'

admin.initializeApp()

// const capitalizeFirstLetter = (string: string) => {
//   return string.charAt(0).toUpperCase() + string.slice(1)
// }

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

app.command('/echo-from-firebase', async ({ ack, body, client, logger, payload }) => {
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

// Listen for a view_submission event
app.view('pointit-modal', async ({ ack, view, client, logger, payload, body }) => {
  await ack()

  // TODO: Call Jack & Aaron's function here try...catch
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
    channel: view.state.values['channel']['channel-select-action'].selected_conversation,
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
    if (date) {
      console.log(Date.parse([date, time].join('T')))
      await client.chat.scheduleMessage({
        ...pointItSessionMessage,
        text: 'Looking towards the future',
        post_at: Date.parse([date, time].join('T')) / 1000,
      })
      // TODO: Post confirmation message for the posters eyes only
      return
    }

    await client.chat.postMessage(pointItSessionMessage)
  } catch (error) {
    logger.error(error)
  }
})

// ------------ Jack's code -------------

// Handle `/echo` command invocations
app.command('/echo-from-firebase2', async ({ ack, payload, client }) => {
  // Acknowledge command request
  await ack()

  // const doc = await admin
  //   .firestore()
  //   .collection('games')
  //   .add({ name: capitalizeFirstLetter(payload.channel_name) })

  client.chat.postMessage({
    channel: 'general',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'Hi @here :wave:',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'A refinement session is about to start.',
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
              text: 'Join session',
              emoji: true,
            },
            value: '206rx9rvkX8fhgTU3Iw8',
            action_id: 'join-session',
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
            text: 'Started by *@Aaron Redden*',
          },
        ],
      },
    ],
  })
})

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
