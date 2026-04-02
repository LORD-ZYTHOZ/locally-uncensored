import type { AgentToolDef, OllamaTool } from '../types/agent-mode'
import { executeTool } from './agents'
import { fetchExternal } from './backend'
import type { ToolName } from '../types/agents'

// ── Tool Definitions ──────────────────────────────────────────────

export const AGENT_TOOL_DEFS: AgentToolDef[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information. Returns titles, URLs, and short snippets. Use web_fetch on promising URLs to read full content.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query string' },
        maxResults: { type: 'number', description: 'Maximum results to return (default: 5)' },
      },
      required: ['query'],
    },
    permission: 'auto',
  },
  {
    name: 'web_fetch',
    description: 'Fetch a web page URL and return its text content. Use this AFTER web_search to read the full content of a result. Returns cleaned text, not HTML.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch' },
        maxLength: { type: 'number', description: 'Maximum characters to return (default: 4000)' },
      },
      required: ['url'],
    },
    permission: 'auto',
  },
  {
    name: 'file_read',
    description: 'Read the contents of a file from the local filesystem within the agent workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
      },
      required: ['path'],
    },
    permission: 'auto',
  },
  {
    name: 'file_write',
    description: 'Write content to a file. Creates the file if it does not exist, overwrites if it does.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'The content to write' },
      },
      required: ['path', 'content'],
    },
    permission: 'confirm',
  },
  {
    name: 'code_execute',
    description: 'Execute code in a sandboxed environment. Supports Python and shell commands. Returns stdout, stderr, and exit code.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The code to execute' },
        language: { type: 'string', description: 'Programming language: "python" or "shell"', enum: ['python', 'shell'] },
      },
      required: ['code'],
    },
    permission: 'confirm',
  },
  {
    name: 'image_generate',
    description: 'Generate an image from a text description using the local ComfyUI image generation pipeline.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Text description of the image to generate' },
        negativePrompt: { type: 'string', description: 'Things to avoid in the generated image' },
      },
      required: ['prompt'],
    },
    permission: 'confirm',
  },
]

// ── Convert to Ollama Format ──────────────────────────────────────

export function getOllamaTools(): OllamaTool[] {
  return AGENT_TOOL_DEFS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

// ── Lookup Helpers ────────────────────────────────────────────────

export function getToolByName(name: string): AgentToolDef | undefined {
  return AGENT_TOOL_DEFS.find((t) => t.name === name)
}

export function getToolPermission(name: string): 'auto' | 'confirm' {
  const tool = getToolByName(name)
  return tool?.permission ?? 'confirm'
}

// ── Execute Tool (wraps errors as string results — never throws) ─

export async function executeAgentTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  try {
    // Handle web_fetch separately (not in legacy agents.ts)
    if (name === 'web_fetch') {
      return await executeWebFetch(args.url, args.maxLength)
    }

    // Reuse the existing executeTool from agents.ts for other tools
    return await executeTool(name as ToolName, args)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return `Error: ${message}`
  }
}

// ── web_fetch: Fetch URL → Extract Text → Return ────────────────

async function executeWebFetch(url: string, maxLength: number = 4000): Promise<string> {
  if (!url) return 'Error: No URL provided'

  try {
    // Fetch the page content
    const html = await fetchExternal(url)

    // Convert HTML to readable text
    const text = htmlToText(html)

    // Truncate if needed
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '\n\n[...truncated]'
    }

    return text || 'Error: Page returned empty content'
  } catch (err) {
    return `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`
  }
}

/**
 * Convert HTML to clean readable text.
 * Strips tags, decodes entities, preserves structure.
 */
function htmlToText(html: string): string {
  // Use DOMParser if available (browser environment)
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Remove script, style, nav, header, footer elements
    const removeSelectors = 'script, style, nav, header, footer, .nav, .header, .footer, .sidebar, .menu, .ad, .advertisement, [role="navigation"], [role="banner"]'
    doc.querySelectorAll(removeSelectors).forEach(el => el.remove())

    // Try to find main content area
    const main = doc.querySelector('main, article, [role="main"], .content, .article, .post, #content, #main')
    const target = main || doc.body

    if (!target) return ''

    // Get text content with basic formatting
    let text = ''
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
    let node: Node | null = walker.nextNode()

    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim()
        if (t) text += t + ' '
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as Element).tagName.toLowerCase()
        if (['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr'].includes(tag)) {
          text += '\n'
        }
        if (['h1', 'h2', 'h3'].includes(tag)) {
          text += '# '
        }
      }
      node = walker.nextNode()
    }

    // Clean up whitespace
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .trim()
  }

  // Fallback: simple regex-based HTML stripping
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
