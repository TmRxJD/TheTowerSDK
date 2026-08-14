/**
 * Reading The Tower's community wiki.
 *
 * The wiki is on Fandom, which serves **wikitext** — templates, infoboxes,
 * `[[File:...]]` links and vertical wikitables — rather than anything you can
 * render directly. This turns that into Markdown.
 *
 * ```ts
 * import { fetchFandomPageAsMarkdown } from 'thetowersdk/wiki'
 *
 * const markdown = await fetchFandomPageAsMarkdown('Cards')
 * ```
 *
 * Or the two halves separately, when you fetch pages your own way:
 *
 * ```ts
 * import { convertFandomWikitextToMarkdown } from 'thetowersdk/wiki'
 *
 * const markdown = convertFandomWikitextToMarkdown(wikitext, { pageTitle: 'Cards' })
 * ```
 *
 * ## What is here and what is not
 *
 * The **conversion** is here: it is ours, it is plain string work, and it is
 * the part that took the effort. The wiki's **content** is not, and will not
 * be: Fandom text is CC-BY-SA and this package is MIT, so shipping the pages
 * themselves would put two incompatible licences in one bundle. Fetch it at
 * build time and honour the wiki's licence in whatever you ship.
 *
 * Be a good citizen of someone else's API: it is a volunteer-run wiki, so
 * fetch once into a cache rather than per request, and leave a gap between
 * calls when pulling many pages.
 */

import { convertFandomWikitextToMarkdown } from './wiki-fandom-wikitext'
import type { FandomWikitextContext } from './wiki-fandom-wikitext'

export * from './wiki-fandom-media'
export * from './wiki-fandom-raw-tables'
export * from './wiki-fandom-wikitext'
export * from './wiki-fandom-wikitext-table'

/** Where the community wiki's API lives. */
export const FANDOM_API_URL
  = 'https://the-tower-idle-tower-defense.fandom.com/api.php'

export interface FetchFandomOptions {
  /** Override for a mirror, a proxy, or a test double. */
  apiUrl?: string
  /** Swapped out in tests; defaults to the global. */
  fetchImpl?: typeof globalThis.fetch
}

/**
 * The raw wikitext of one page, by its title.
 *
 * Throws rather than returning null, unlike the save extractors: a save with a
 * missing section is normal and an old file degrades gracefully, but a wiki
 * page you asked for by name either exists or your title is wrong, and a
 * silent null there just moves the error somewhere less useful.
 */
export async function fetchFandomWikitext(
  title: string,
  options: FetchFandomOptions = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: title,
  })

  const response = await fetchImpl(`${options.apiUrl ?? FANDOM_API_URL}?${params}`)
  if (!response.ok) {
    throw new Error(`Fandom API HTTP ${response.status} for ${title}`)
  }

  const payload = await response.json() as {
    query?: { pages?: Record<string, {
      missing?: unknown
      revisions?: Array<{ slots?: { main?: { '*'?: string } }, '*'?: string }>
    }> }
  }

  const page = Object.values(payload?.query?.pages ?? {})[0]
  if (!page || page.missing !== undefined) {
    throw new Error(`Fandom page not found: ${title}`)
  }

  // Two shapes, depending on whether the wiki answers with slots. Both are
  // current: which one you get depends on the MediaWiki version behind it.
  const revision = page.revisions?.[0]
  const content = revision?.slots?.main?.['*'] ?? revision?.['*']
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(`Empty wikitext for ${title}`)
  }

  return content
}

/**
 * Fetch a page and convert it in one step.
 *
 * `templates` and `transclusions` are the pages this one pulls in with `{{…}}`;
 * pass them and they are expanded, omit them and the markers are dropped. The
 * page title is not decoration — the converter uses it to resolve a page's
 * self-references, so it comes from the title you asked for rather than being
 * left to the caller to repeat.
 */
export async function fetchFandomPageAsMarkdown(
  title: string,
  options: FetchFandomOptions & Omit<FandomWikitextContext, 'pageTitle'> = {},
): Promise<string> {
  const wikitext = await fetchFandomWikitext(title, options)
  return convertFandomWikitextToMarkdown(wikitext, {
    pageTitle: title,
    templates: options.templates,
    transclusions: options.transclusions,
  })
}
