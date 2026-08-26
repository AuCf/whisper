import test from 'node:test'
import assert from 'node:assert/strict'

import { createHeadingSlugger } from '../src/markdown/headingAnchors.js'

test('heading slugger normalizes Markdown text and HTML entities', () => {
  const slugger = createHeadingSlugger()

  assert.equal(slugger.slug('Hello **Whisper** &amp; 中文'), 'hello-whisper-中文')
  assert.equal(slugger.slug('[Guide](https://example.com)'), 'guide')
})

test('heading slugger creates stable unique anchors and can reset', () => {
  const slugger = createHeadingSlugger()

  assert.equal(slugger.slug('重复标题'), '重复标题')
  assert.equal(slugger.slug('重复标题'), '重复标题-2')
  slugger.reset()
  assert.equal(slugger.slug('重复标题'), '重复标题')
})

test('heading slugger falls back for punctuation-only headings', () => {
  const slugger = createHeadingSlugger()

  assert.equal(slugger.slug('✨!?'), 'section')
})
