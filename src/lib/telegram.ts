type BotName = 'toon'

const BOTS: Record<BotName, { tokenEnv: string; chatIdEnv: string }> = {
  toon: { tokenEnv: 'TOON_BOT_TOKEN', chatIdEnv: 'TOON_BOT_CHAT_ID' },
}

export async function sendTelegramMessage(
  bot: BotName,
  text: string,
  options?: { inline_keyboard?: { text: string; url: string }[][] }
) {
  const token = process.env[BOTS[bot].tokenEnv]
  const chatId = process.env[BOTS[bot].chatIdEnv]
  if (!token || !chatId) return

  const body: Record<string, unknown> = { chat_id: chatId, text }

  if (options?.inline_keyboard) {
    body.reply_markup = { inline_keyboard: options.inline_keyboard }
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
