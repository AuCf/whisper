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

// Code blocks with copy button and mermaid support
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
    <span>${displayLang}</span>
    <button type="button" class="code-copy-btn">Copy</button>
  </div><pre><code class="hljs language-${language}">${highlighted}</code></pre></div>`
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
