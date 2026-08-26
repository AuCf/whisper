import test from 'node:test'
import assert from 'node:assert/strict'

import { generateMindmapCode, useMarkdown } from '../src/composables/useMarkdown.js'

test('renders repeatable heading anchors for every document render', () => {
  const { render } = useMarkdown()
  const markdown = '# 标题\n\n# 标题'

  const first = render(markdown)
  const second = render(markdown)

  assert.match(first, /id="标题"/)
  assert.match(first, /id="标题-2"/)
  assert.equal(second, first)
})

test('renders highlighted code without exposing highlight markup as text', () => {
  const { render } = useMarkdown()
  const html = render('```javascript\nconst answer = 42\n```')

  assert.match(html, /class="hljs language-javascript"/)
  assert.match(html, /hljs-keyword/)
  assert.doesNotMatch(html, /&lt;span class=&quot;hljs-/)
})

test('renders KaTeX formulas', () => {
  const { render } = useMarkdown()
  const html = render('$E = mc^2$')

  assert.match(html, /class="katex"/)
})

test.todo('renders GitHub alert blocks with the current Marked token API')

test('keeps Mermaid source escaped until browser post-processing', () => {
  const { render } = useMarkdown()
  const html = render('```mermaid\ngraph TD\nA[<script>] --> B\n```')

  assert.match(html, /class="mermaid"/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})

test('generates a mindmap from document headings', () => {
  const code = generateMindmapCode('# Whisper\n## 编辑\n### 预览')

  assert.equal(code, 'mindmap\n  root((Whisper))\n    编辑\n      预览\n')
})
