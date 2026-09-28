import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createNewDocumentContent,
  formatDocumentTimestamp,
} from '../src/markdown/newDocument.js'

test('formats new document timestamps with zero-padded local date parts', () => {
  const date = new Date(2026, 8, 7, 9, 5)

  assert.equal(formatDocumentTimestamp(date), '2026-09-07 09:05')
})

test('creates a Markdown heading containing the current timestamp', () => {
  const date = new Date(2026, 8, 28, 14, 30)

  assert.equal(createNewDocumentContent(date), '# 新建文档 · 2026-09-28 14:30\n\n')
})
