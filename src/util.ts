import { GchangesToNotion } from './gchanges2notion.js'

const maxContentLines = 70
// https://developers.notion.com/reference/request-limits#limits-for-property-values
// > text.content	2000 characters
// (characters とあるが、たぶんバイト数)
// Utilities.newBlob(line).getBytes().length でカウントするとときどきオーバーする。
// 暫定対応で 1900 にしておく
// TODO: excerpt のカウントを Notion の API とあわせる
const maxContentLength = 1900

export function isTextType(mimeType?: string | undefined): boolean {
  return mimeType?.split('/', 1)[0] === 'text'
}
export function getContentLines(s: string): string {
  const maxLines = s.split('\n', maxContentLines)
  const lines: string[] = []
  let len = 0
  for (const line of maxLines) {
    len = len + Utilities.newBlob(line).getBytes().length
    if (len >= maxContentLength) {
      break
    }
    lines.push(line)
    if (lines.length >= maxContentLines) {
      break
    }
  }

  return lines.join('\n')
}

export function getType(mimeType: string): string {
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    // 'application/vnd.google-apps.'.length = 28
    return mimeType.slice(28)
  }
  if (mimeType === 'text/plain') {
    return 'text'
  }
  const s = mimeType.split('/', 2)
  if (s.length === 2) {
    return s[1]
  }
  return s[0]
}

export function getFilterMimeTypeTransformer({
  ignoreTypes
}: GchangesToNotion.FilterMimeTypeTransformerOpts): GchangesToNotion.FileTransfomer {
  return function* filterTypeTransformer(ite) {
    for (const [item, file] of ite) {
      if (!ignoreTypes.some((i) => i === item.mimeType)) {
        yield [item, file]
      }
    }
  }
}

export function asText(
  mimeType: string,
  fileType: string,
  fileObj: GoogleAppsScript.Drive.File,
  id: string
): string {
  if (isTextType(mimeType)) {
    return fileObj.getAs('text/plain').getDataAsString()
  } else if (fileType === 'document') {
    return DocumentApp.openById(id).getBody().getText()
  } else if (fileType === 'spreadsheet') {
    const ss = SpreadsheetApp.openById(id).getActiveSheet()
    const range = ss.getDataRange()
    const rows = range.getNumRows()
    const cols = range.getNumColumns()
    const values =
      ss
        .getRange(
          range.getRow(),
          range.getColumn(),
          rows > maxContentLines ? maxContentLines : rows,
          cols > maxContentLines ? maxContentLines : cols
        )
        ?.getDisplayValues() || []
    return values
      .map((v) => {
        return v.join('\t')
      })
      .join('\n')
  } else if (fileType === 'presentation') {
    return SlidesApp.openById(id)
      .getSlides()
      .map((slide) =>
        slide
          .getShapes()
          .map((shape) => shape.getText().asString())
          .join('\n')
      )
      .join('\n---\n')
  }
  return ''
}

export function* changedItems(
  opts: GchangesToNotion.FileItemsOpts,
  items: GoogleAppsScript.Drive.Schema.File[]
): Generator<[GchangesToNotion.FileItem, GoogleAppsScript.Drive.Schema.File]> {
  const ignoreIds = opts.ignoreIds || []
  const limit = typeof opts.limit === 'number' ? opts.limit : 10
  let idx = 0
  for (const item of items) {
    if (idx >= limit) {
      break
    }
    const id = item.id || ''
    const mimeType = item.mimeType || ''
    const fileType = getType(mimeType)
    const parents: string[] = item.parents?.map(({ id }) => id || '') || []
    if (!ignoreIds.some((i) => i === id)) {
      const fileObj = DriveApp.getFileById(id)
      let content: string = ''
      try {
        content = asText(mimeType, fileType, fileObj, id)
      } catch (e) {}
      content = getContentLines(content)
      const recentItem: GchangesToNotion.FileItem = {
        fileObj,
        guid: id,
        mimeType,
        type: fileType,
        excerpt: content,
        description: item.description || '',
        link: fileObj.getUrl(),
        modified: new Date(item.modifiedDate || Date.now()).toISOString(),
        thumbnailLink: item.thumbnailLink
      }
      yield [recentItem, item]
      idx++
    }
  }
}
