// @ts-nocheck

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

// TODO: Change to shortcut

app.command('/pointit', async ({ ack, body, client, logger, say, payload }) => {
  // Acknowledge the command request
  await ack()

  logger.info('payload', payload.channel_name)

  try {
    // Call views.open with the built-in client
    const result = await client.views.open({
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: {
        type: 'modal',
        // View identifier
        callback_id: 'view_1',
        title: {
          type: 'plain_text',
          text: 'Modal title Foo5',
        },
        blocks: [
          {
            block_id: 'channel_name',
            value: payload.channel_name
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Welcome to a modal with _blocks_',
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Click me!',
              },
              action_id: 'button_',
            },
          },
          {
            block_id: 'users',
            type: 'input',
            element: {
              type: 'multi_users_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select users',
                emoji: true,
              },
              action_id: 'multi_users_select-action',
            },
            label: {
              type: 'plain_text',
              text: 'Label',
              emoji: true,
            },
          },
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit',
        },
      },
    })
    // await say('Hello world!')

    logger.info('result', result)
  } catch (error) {
    logger.error(error)
  }
})

// app.view

// Listen for a button invocation with action_id `submit_btn` (assume it's inside of a modal)
app.view('view_1', async ({ ack, view, client, logger, payload }) => {
  // Acknowledge the button request
  await ack()

  // call Jack & Aaron's function here
  // On success
  // say the url back to slack and pass back the mentions or post to channel
  const result = Object.entries(view.state.values).map(([key, value]) => value)

  logger.info('payload', JSON.stringify(payload))
  logger.info('selected_users', result[0])


  // <@U024BE7LH>
  // const users = view.state.values['GdSF']['multi_users_select-action'].selected_users;
  const users = view.state.values['users']['multi_users_select-action'].selected_users;

  const formattedUsers = users.map(user => `<@${user}>`).join(' ');
  // const formattedUsers = '';

  // Message the user
  try {
    await client.chat.postMessage({
      channel: 'pointit', // TODO: change this to the channel that the user is in
      // text: 'Your submission was successful, @',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `This is returned from the view 1 ${formattedUsers}`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Click Me',
            },
            action_id: 'button_click',
          },
        },
      ],
    })
  } catch (error) {
    logger.error(error)
  }

  // app.message('hello', async ({ message, say }) => {
  //   await say({
  //     blocks: [
  //       {
  //         type: 'section',
  //         text: {
  //           type: 'mrkdwn',
  //           text: `Hey there`,
  //         },
  //         accessory: {
  //           type: 'button',
  //           text: {
  //             type: 'plain_text',
  //             text: 'Click Me',
  //           },
  //           action_id: 'button_click',
  //         },
  //       },
  //     ],
  //   })
  // })

  // try {
  //   // Call views.update with the built-in client
  //   const result = await client.views.update({
  //     // Pass the view_id
  //     view_id: body.view.id,
  //     // Pass the current hash to avoid race conditions
  //     hash: body.view.hash,
  //     // View payload with updated blocks
  //     view: {
  //       type: 'modal',
  //       // View identifier
  //       callback_id: 'view_1',
  //       title: {
  //         type: 'plain_text',
  //         text: 'Updated modal'
  //       },
  //       blocks: [
  //         {
  //           type: 'section',
  //           text: {
  //             type: 'plain_text',
  //             text: 'You updated the modal!'
  //           }
  //         },
  //         {
  //           type: 'image',
  //           image_url: 'https://media.giphy.com/media/SVZGEcYt7brkFUyU90/giphy.gif',
  //           alt_text: 'Yay! The modal was updated'
  //         }
  //       ]
  //     }
  //   });
  //   logger.info(result);
  // }
  // catch (error) {
  //   logger.error(error);
  // }
})

// https://{your domain}.cloudfunctions.net/slack/events
export const slack = https.onRequest(expressReceiver.app)
