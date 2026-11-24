/** Prewritten, friendly join messages. No @everyone or role mentions. */
export const JOIN_WELCOMES: readonly string[] = [
  'Welcome to Kuro TV, {member}! 🎉 Glad you’re here — #server-guide is the fastest way to get oriented.',
  'Hi {member}! 👋 Welcome aboard. If you need a hand, #help is the right place to ask.',
  'Hey {member}, welcome! Kuro is an open-source player/front-end — no media is hosted here. Check out #rules and say hello in #general.',
  'Welcome in, {member}! Grab a device role in the guide, and browse #android-releases for verified downloads.',
];

export interface WelcomeMessage {
  content: string;
  mentionIds: string[];
}

/** Deterministic when index is supplied; otherwise picks one at random. */
export function buildWelcomeMessage(
  memberId: string,
  specialUserId?: string,
  index = Math.floor(Math.random() * JOIN_WELCOMES.length),
): WelcomeMessage {
  const template = JOIN_WELCOMES[index] ?? JOIN_WELCOMES[0];
  const mentionIds = [memberId, ...(specialUserId ? [specialUserId] : [])].filter(
    (id, position, all) => all.indexOf(id) === position,
  );
  const specialLine = specialUserId
    ? `\nA nod to <@${specialUserId}> — thanks for helping members find their way.`
    : '';
  return {
    content: `${template.replace('{member}', `<@${memberId}>`)}${specialLine}`,
    mentionIds,
  };
}
