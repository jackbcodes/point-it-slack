// @ts-nocheck

export const nowOrLaterActionBlock = (initialOption) => [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: 'Would you like to',
      emoji: true,
    },
  },
  {
    type: 'actions',
    elements: [
      {
        type: 'radio_buttons',
        initial_option: initialOption && {
          text: {
            type: 'plain_text',
            text: initialOption === 'now' ? 'Play now' : 'Schedule for another time',
            emoji: true,
          },
          value: initialOption,
        },
        options: [
          {
            text: {
              type: 'plain_text',
              text: 'Play now',
              emoji: true,
            },
            value: 'now',
          },
          {
            text: {
              type: 'plain_text',
              text: 'Schedule for another time',
              emoji: true,
            },
            value: 'later',
          },
        ],
        action_id: 'now-or-later',
      },
    ],
  },
]

export const dateTimeInputBlock = () => [
  {
    type: 'divider',
  },
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: 'Schedule game',
      emoji: true,
    },
  },
  {
    type: 'input',
    block_id: 'date',
    element: {
      type: 'datepicker',
      placeholder: {
        type: 'plain_text',
        text: 'Select a date',
        emoji: true,
      },
      action_id: 'datepicker-action',
    },
    label: {
      type: 'plain_text',
      text: 'Select date',
      emoji: true,
    },
  },
  {
    type: 'input',
    block_id: 'time',
    element: {
      type: 'timepicker',
      placeholder: {
        type: 'plain_text',
        text: 'Select time',
        emoji: true,
      },
      action_id: 'timepicker-action',
    },
    label: {
      type: 'plain_text',
      text: 'Select time',
      emoji: true,
    },
  },
]

export const getChannelsPlayersBlock = () => [
  {
    type: 'divider',
  },
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: 'Select channel and players',
      emoji: true,
    },
  },
  {
    block_id: 'channel',
    type: 'input',
    element: {
      type: 'conversations_select',
      default_to_current_conversation: true,
      placeholder: {
        type: 'plain_text',
        text: 'Select channel',
        emoji: true,
      },
      action_id: 'channel-select-action',
    },
    label: {
      type: 'plain_text',
      text: 'Select a channel to post game details to',
      emoji: true,
    },
  },
  {
    block_id: 'users',
    optional: true,
    type: 'input',
    element: {
      type: 'multi_users_select',
      placeholder: {
        type: 'plain_text',
        text: 'Select players',
        emoji: true,
      },
      action_id: 'user-select-action',
    },
    label: {
      type: 'plain_text',
      text: 'Select users you want to notify',
      emoji: true,
    },
  },
]
