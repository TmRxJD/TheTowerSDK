/**
 * Building a Tower bot: a command registry, and every calculator as a command for free.
 *
 * ```ts
 * import { calculatorCommands, createTowerBot } from 'thetowersdk/bot'
 *
 * const bot = createTowerBot({ commands: calculatorCommands() })
 * const reply = await bot.run('lab-research', { args: { labName: 'Damage', targetLevel: 10 } })
 * ```
 *
 * Nothing here depends on discord.js or any other gateway. A command is a name, a list of
 * declared options and a function returning a reply, so the same registry runs under any
 * library, on a CLI, and at full speed in a test.
 *
 * `templates/bot-starter.ts` is a complete working bot; `docs/BUILDING_A_BOT.md` covers
 * structure and performance.
 */

export * from './types'
export * from './calculator-command'
export * from './create-bot'
