export type SharedToolCategory = 'calculator' | 'tracker' | 'other'

export interface SharedToolDefinition {
  id: string
  name: string
  category: SharedToolCategory
  path: string
  external?: string
  icon: string
  color?: string
  botCommand?: string
  includeInSiteHub?: boolean
  includeInBotHub?: boolean
  botHubLabel?: string
}

export const sharedToolsCatalog: SharedToolDefinition[] = [
  { id: 'tracker', name: 'Run Tracker', category: 'tracker', path: '/', icon: 'mdi-format-list-checkbox', color: 'light-blue', botCommand: 'track', botHubLabel: 'Battle Report' },
  { id: 'leaderboard', name: 'Leaderboard', category: 'tracker', path: '/leaderboard', icon: 'mdi-trophy', color: 'amber' },
  { id: 'charts', name: 'Chart Studio', category: 'other', path: '/tools/chart', icon: 'mdi-chart-box-multiple', color: 'light-blue-darken-1', botCommand: 'chart' },
  { id: 'cph-calculator', name: 'CPH Calculator', category: 'calculator', path: '/tools?dialog=cph-calculator', icon: 'mdi-chart-timeline-variant', color: 'lime-darken-2', botCommand: 'cph' },
  { id: 'tournament-checklist', name: 'Tournament Checklist', category: 'other', path: '/tools?dialog=tournament-checklist', icon: 'mdi-format-list-checks', color: 'green-darken-1', botCommand: 'checklist' },
  { id: 'creator-codes', name: 'Creator Codes', category: 'other', path: '/tools?dialog=creator-codes', icon: 'mdi-account-star', color: 'amber-darken-2', botCommand: 'creator' },
  { id: 'define-acronyms', name: 'Define Acronyms', category: 'other', path: '/tools?dialog=define-acronyms', icon: 'mdi-alphabetical-variant', color: 'indigo-darken-1', botCommand: 'define' },
  { id: 'reminders', name: 'Reminders', category: 'other', path: '/tools?dialog=remind', icon: 'mdi-bell-ring-outline', color: 'red-darken-1', botCommand: 'remind' },
  { id: 'thorns-calculator', name: 'Thorns Calculator', category: 'calculator', path: '/calculators/thorns', icon: 'mdi-cactus', color: 'teal', botCommand: 'thorns' },
  { id: 'lab-tracker', name: 'Lab Tracker', category: 'tracker', path: '/trackers/labs', icon: 'mdi-flask', color: 'green' },
  { id: 'battle-conditions', name: 'Battle Conditions', category: 'other', path: '/tools', icon: 'mdi-sword-cross', color: 'amber-darken-2', botCommand: 'battle_conditions', includeInSiteHub: false },
  { id: 'module-tracker', name: 'Module Tracker', category: 'tracker', path: '/trackers/modules', icon: 'mdi-chip', color: 'purple-darken-1' },
  { id: 'workshop-calculator', name: 'Workshop Calculator', category: 'calculator', path: '/calculators/workshop', icon: 'mdi-hammer-wrench', color: 'indigo', botCommand: 'workshop' },
  { id: 'workshop-tracker', name: 'Workshop Tracker', category: 'tracker', path: '/trackers/workshop', icon: 'mdi-hammer-screwdriver', color: 'orange-darken-2' },
  { id: 'shard-splitter', name: 'Shard Splitter', category: 'calculator', path: '/calculators/shard-splitter', icon: 'mdi-call-split', color: 'pink', botCommand: 'shard' },
  { id: 'bot-medal-splitter', name: 'Medal Splitter', category: 'calculator', path: '/calculators/bot-medal-splitter', icon: 'mdi-scale-balance', color: 'amber-darken-2' },
  { id: 'ultimate-weapons-tracker', name: 'Ultimate Weapons Tracker', category: 'tracker', path: '/trackers/uw', icon: 'mdi-sword-cross', color: 'deep-orange' },
  { id: 'bots-tracker', name: 'Bots Tracker', category: 'tracker', path: '/trackers/bots', icon: 'mdi-robot', color: 'orange-darken-1' },
  { id: 'guardians-tracker', name: 'Guardians Tracker', category: 'tracker', path: '/trackers/guardians', icon: 'mdi-shield-account', color: 'blue-grey' },
  { id: 'vault-tracker', name: 'Vault Tracker', category: 'tracker', path: '/trackers/vault', icon: 'mdi-safe', color: 'brown' },
  { id: 'relics-tracker', name: 'Relics & Themes', category: 'tracker', path: '/trackers/relics', icon: 'mdi-treasure-chest', color: 'amber-darken-2' },
  { id: 'lifetime-stats', name: 'Lifetime Stats', category: 'tracker', path: '/trackers/lifetime', icon: 'mdi-chart-line-variant', color: 'deep-purple', botCommand: 'lifetime' },
  { id: 'damage-reduction', name: 'Damage Reduction', category: 'calculator', path: '/calculators/damage-reduction', icon: 'mdi-shield-off', color: 'red' },
  { id: 'enemy-stats', name: 'Enemy Stats', category: 'calculator', path: '/calculators/enemy-stats', icon: 'mdi-skull-crossbones', color: 'orange-darken-2' },
  { id: 'enemy-drops', name: 'Resource Drops', category: 'calculator', path: '/calculators/enemy-drops', icon: 'mdi-treasure-chest', color: 'amber-darken-3' },
  { id: 'dissonance-calculator', name: 'Dissonance Calculator', category: 'calculator', path: '/calculators/dissonance', icon: 'mdi-waveform', color: 'deep-purple-darken-1' },
  { id: 'labs-calculator', name: 'Labs Calculator', category: 'calculator', path: '/calculators/labs', icon: 'mdi-flask', color: 'blue', botCommand: 'lab' },
  { id: 'modules-calculator', name: 'Modules Calculator', category: 'calculator', path: '/calculators/modules', icon: 'mdi-chip', color: 'cyan', botCommand: 'module' },
  { id: 'uptime-calculator', name: 'Uptime Calculator', category: 'calculator', path: '/calculators/uptime', icon: 'mdi-timer', color: 'green' },
  { id: 'bots-calculator', name: 'Bots Calculator', category: 'calculator', path: '/calculators/bots', icon: 'mdi-robot', color: 'orange', botCommand: 'bots' },
  { id: 'guardians-calculator', name: 'Guardians Calculator', category: 'calculator', path: '/calculators/guardians', icon: 'mdi-shield-account', color: 'blue-grey', botCommand: 'guardian' },
  { id: 'cards-tracker', name: 'Cards Tracker', category: 'tracker', path: '/trackers/cards', icon: 'mdi-cards', color: 'teal-accent-4' },
  { id: 'uw-calculator', name: 'Ultimate Weapons', category: 'calculator', path: '/calculators/uw', icon: 'mdi-sword', color: 'red-accent-4', botCommand: 'stone' },
  { id: 'ask', name: 'Ask a Question', category: 'other', path: '/tools', icon: 'mdi-help-circle', color: 'blue-grey-darken-1', botCommand: 'ask', includeInSiteHub: false, botHubLabel: 'Ask TowerAI (Experimental)' },
  { id: '8ball', name: 'Magic 8-Ball', category: 'other', path: '/tools', icon: 'mdi-shape-square-rounded-plus', color: 'purple', botCommand: '8ball', includeInSiteHub: false },
]

function toAbsoluteUrl(path: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

function renderBotHubLine(tool: SharedToolDefinition, siteBaseUrl: string): string {
  const displayName = resolveBotHubDisplayName(tool)
  const commandSuffix = tool.botCommand ? ` **/${tool.botCommand}**` : ''
  if (tool.includeInSiteHub === false && !tool.external) {
    return `**${displayName}**${commandSuffix}`
  }

  const toolUrl = tool.external ?? toAbsoluteUrl(tool.path, siteBaseUrl)
  return `[**${displayName}**](${toolUrl})${commandSuffix}`
}

function resolveBotHubDisplayName(tool: SharedToolDefinition): string {
  if (tool.botHubLabel) {
    return tool.botHubLabel
  }

  if (tool.category === 'calculator') {
    return tool.name.replace(/\s+Calculator$/i, '').trim()
  }

  if (tool.category === 'tracker') {
    return tool.name.replace(/\s+Tracker$/i, '').trim()
  }

  return tool.name
}

function sortToolsForBotHub(tools: SharedToolDefinition[]): SharedToolDefinition[] {
  return [...tools].sort((left, right) => resolveBotHubDisplayName(left).localeCompare(resolveBotHubDisplayName(right)))
}

function getBotHelpAndFeedbackLines(guildId?: string | null): string[] {
  const feedbackUrl = guildId === '850137217828388904'
    ? 'https://discord.com/channels/850137217828388904/1343679564966002779'
    : 'https://discord.com/channels/1343406545920196608/1373107292547055718'

  return [feedbackUrl]
}

export function buildBotToolsHubDescription(siteBaseUrl: string, guildId?: string | null): string {
  const visible = sharedToolsCatalog.filter(tool => tool.includeInBotHub !== false)
  const calculators = sortToolsForBotHub(visible.filter(tool => tool.category === 'calculator'))
  const trackers = sortToolsForBotHub(visible.filter(tool => tool.category === 'tracker'))
  const others = sortToolsForBotHub(visible.filter(tool => tool.category === 'other'))

  const lines: string[] = [
    `Click [**blue links**](${toAbsoluteUrl('/tools', siteBaseUrl)}) to open the tools in your browser.`,
    'Use optional slash commands where listed below.',
    '',
    '**Calculators:**',
    ...calculators.map(tool => renderBotHubLine(tool, siteBaseUrl)),
    '',
    '**Trackers:**',
    ...trackers.map(tool => renderBotHubLine(tool, siteBaseUrl)),
  ]

  if (others.length > 0) {
    lines.push('', '**Other Tools:**', ...others.map(tool => renderBotHubLine(tool, siteBaseUrl)))
  }

  lines.push('', '**Help & Feedback:**', ...getBotHelpAndFeedbackLines(guildId))

  return lines.join('\n')
}
