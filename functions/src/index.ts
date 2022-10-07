// @ts-nocheck

import { config, https } from 'firebase-functions'
import admin from 'firebase-admin'

import axios from 'axios'

import { App, ExpressReceiver } from '@slack/bolt'

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

// Handle `/echo` command invocations
app.command('/echo-from-firebase', async ({ ack, payload, client }) => {
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
