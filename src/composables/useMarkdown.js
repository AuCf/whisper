import { marked } from 'marked'
import hljs from 'highlight.js'
import markedKatex from 'marked-katex-extension'
import mermaid from 'mermaid'
import { createHeadingSlugger } from '../markdown/headingAnchors.js'

// Safe resolution for CJS/ESM default exports
const getfn = (mod) => (typeof mod === 'function' ? mod : mod?.default || mod)
const safeKatex = getfn(markedKatex)

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Mermaid theme configurations
const mermaidThemes = {
  dark: {
    theme: 'dark',
    darkMode: true,
    themeVariables: {
      primaryColor: '#1c2128',
      primaryTextColor: '#e6edf3',
      primaryBorderColor: '#30363d',
      lineColor: '#58a6ff',
      secondaryColor: '#21262d',
      tertiaryColor: '#161b22',
      background: '#0d1117',
      mainBkg: '#1c2128',
      nodeBorder: '#30363d',
      clusterBkg: '#161b22',
      titleColor: '#e6edf3',
      edgeLabelBackground: '#21262d',
      attributeBackgroundColorEven: '#161b22',
      attributeBackgroundColorOdd: '#1c2128',
    },
  },
  light: {
    theme: 'default',
    darkMode: false,
    themeVariables: {
      primaryColor: '#dbeafe',
      primaryTextColor: '#1f2328',
      primaryBorderColor: '#d0d7de',
      lineColor: '#0969da',
      secondaryColor: '#f0f6ff',
      tertiaryColor: '#f6f8fa',
      background: '#ffffff',
      mainBkg: '#dbeafe',
      nodeBorder: '#d0d7de',
      clusterBkg: '#f6f8fa',
      titleColor: '#1f2328',
      edgeLabelBackground: '#f6f8fa',
      attributeBackgroundColorEven: '#f6f8fa',
      attributeBackgroundColorOdd: '#ffffff',
    },
  },
  solarized: {
    theme: 'dark',
    darkMode: true,
    themeVariables: {
      primaryColor: '#073642',
      primaryTextColor: '#839496',
      primaryBorderColor: '#586e75',
      lineColor: '#268bd2',
      secondaryColor: '#073642',
      tertiaryColor: '#002b36',
      background: '#002b36',
      mainBkg: '#073642',
      nodeBorder: '#586e75',
      clusterBkg: '#002b36',
      titleColor: '#93a1a1',
      edgeLabelBackground: '#073642',
      attributeBackgroundColorEven: '#002b36',
      attributeBackgroundColorOdd: '#073642',
    },
  },
}

/**
 * Initialize or reinitialize Mermaid with theme-appropriate settings.
 * @param {string} themeName - 'dark' | 'light' | 'solarized'
 */
export function reinitMermaid(themeName = 'dark') {
  const config = mermaidThemes[themeName] || mermaidThemes.dark
  try {
    mermaid.initialize({
      startOnLoad: false,
      ...config,
      fontFamily: 'Inter, -apple-system, sans-serif',
      fontSize: 14,
    })
  } catch (e) {
    console.warn('Mermaid init warning:', e)
  }
}

// Initialize Mermaid with dark theme by default
reinitMermaid('dark')

let mermaidCounter = 0
const headingSlugger = createHeadingSlugger()

// Configure marked with KaTeX extension
if (typeof safeKatex === 'function') {
  try {
    marked.use(
      safeKatex({
        throwOnError: false,
        output: 'html',
      })
    )
  } catch (e) {
    console.warn('KaTeX extension error:', e)
  }
}

// Custom renderer
const renderer = new marked.Renderer()

// Headings with anchor links
renderer.heading = function ({ text, depth }) {
  const id = headingSlugger.slug(text)
  return `<h${depth} id="${id}">${text}<a class="heading-anchor" href="#${id}">#</a></h${depth}>\n`
}

// Code blocks with Mac OS dots, language label, and copy button
renderer.code = function ({ text, lang }) {
  const requestedLanguage = (lang || '').trim().split(/\s+/)[0].toLowerCase()

  if (requestedLanguage === 'mermaid') {
    const id = `mermaid-${++mermaidCounter}`
    return `<div class="mermaid" id="${id}">${escapeHtml(text)}</div>`
  }

  const language = hljs.getLanguage(requestedLanguage) ? requestedLanguage : 'plaintext'
  const highlighted = hljs.highlight(text || '', { language }).value
  const displayLang = escapeHtml(requestedLanguage || 'text')

  return `<div class="code-block"><div class="code-block-header">
    <div class="code-header-left">
      <div class="mac-dots">
        <span class="mac-dot red"></span>
        <span class="mac-dot yellow"></span>
        <span class="mac-dot green"></span>
      </div>
      <span>${displayLang}</span>
    </div>
    <button type="button" class="code-copy-btn">Copy</button>
  </div><pre><code class="hljs language-${language}">${highlighted}</code></pre></div>`
}

// Blockquotes with GitHub Alert Callouts support (> [!NOTE], > [!TIP], etc.)
renderer.blockquote = function ({ text }) {
  const alertMatch = text.match(/^<p>\s*\[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*<br\s*\/?>?\s*/i)
    || text.match(/^<p>\s*\[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i)

  if (alertMatch) {
    const type = alertMatch[1].toUpperCase()
    const cleanText = text.replace(alertMatch[0], '<p>')

    const alertIcons = {
      NOTE: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      TIP: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A5 5 0 0 1 12 5a5 5 0 0 1 3.5 9.5c-.7.7-1.5 1.6-1.5 2.5h-4c0-.9-.8-1.8-1.5-2.5z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>',
      IMPORTANT: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm1-5h-2V7h2z"/></svg>',
      WARNING: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      CAUTION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    }

    const typeLower = type.toLowerCase()
    return `<div class="markdown-alert markdown-alert-${typeLower}">
      <div class="markdown-alert-title">${alertIcons[type] || ''} ${type}</div>
      <div class="markdown-alert-content">${cleanText}</div>
    </div>`
  }

  return `<blockquote>\n${text}</blockquote>\n`
}

// Links - open in browser/new window
renderer.link = function ({ href, title, text }) {
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
}

marked.use({
  renderer,
  gfm: true,
  breaks: true,
})

// Render mermaid diagrams after HTML is injected
async function renderMermaid(container) {
  if (!container) return
  const mermaidEls = container.querySelectorAll('.mermaid')
  if (!mermaidEls.length) return

  for (const el of mermaidEls) {
    const code = el.textContent
    const id = el.id || `mermaid-${Date.now()}`
    try {
      const { svg } = await mermaid.render(id + '-svg', code)
      el.innerHTML = svg
    } catch (err) {
      el.innerHTML = `<div style="color:var(--red);font-size:12px;padding:12px;">Mermaid error: ${err.message}</div>`
    }
  }
}

function bindCodeCopyButtons(container) {
  const buttons = container?.querySelectorAll('.code-copy-btn') ?? []
  for (const button of buttons) {
    if (button.dataset.copyBound === 'true') continue
    button.dataset.copyBound = 'true'
    button.addEventListener('click', async () => {
      const code = button.closest('.code-block')?.querySelector('code')?.textContent ?? ''
      try {
        await navigator.clipboard.writeText(code)
        button.textContent = '✓ Copied'
        button.classList.add('copied')
        setTimeout(() => {
          button.textContent = 'Copy'
          button.classList.remove('copied')
        }, 2000)
      } catch (err) {
        console.error('Copy code failed:', err)
        button.textContent = 'Copy failed'
      }
    })
  }
}

export function useMarkdown() {
  function render(markdown) {
    if (!markdown) return ''
    try {
      headingSlugger.reset()
      return marked.parse(markdown)
    } catch (err) {
      return `<div style="color:var(--red);padding:16px;">Parse error: ${err.message}</div>`
    }
  }

  async function postProcess(container) {
    if (!container) return
    bindCodeCopyButtons(container)
    await renderMermaid(container)
  }

  return { render, postProcess }
}
