function padDatePart(value) {
  return String(value).padStart(2, '0')
}

export function formatDocumentTimestamp(date = new Date()) {
  const year = date.getFullYear()
  const month = padDatePart(date.getMonth() + 1)
  const day = padDatePart(date.getDate())
  const hours = padDatePart(date.getHours())
  const minutes = padDatePart(date.getMinutes())
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export function createNewDocumentContent(date = new Date()) {
  return `# 新建文档 · ${formatDocumentTimestamp(date)}\n\n`
}
