function normalizeHeadingText(value) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  }

  return String(value ?? '')
    .replace(/&(amp|lt|gt|quot|#39);/g, entity => entities[entity] ?? entity)
    .replace(/<[^>]*>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim()
}

export function createHeadingSlugger() {
  const counts = new Map()

  return {
    reset() {
      counts.clear()
    },
    slug(value) {
      const base = normalizeHeadingText(value)
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'section'
      const count = (counts.get(base) ?? 0) + 1
      counts.set(base, count)
      return count === 1 ? base : `${base}-${count}`
    },
  }
}
