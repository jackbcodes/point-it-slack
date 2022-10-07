// @ts-nocheck

export const formatUsers = (users: string[]) => users.map((user) => `<@${user}>`).join(' ')
