import {
  CreatePageParameters,
  UpdatePageParameters
} from '@notionhq/client/build/src/api-endpoints'
import URI from 'urijs'
import { GchangesToNotion } from './gchanges2notion.js'
import { StoredItems } from './notion.js'
import { changedItems, getFilterMimeTypeTransformer } from './util.js'

export function* thumbParamTeransFormer(
  ite: ReturnType<GchangesToNotion.ParamTransfomer>
): ReturnType<GchangesToNotion.ParamTransfomer> {
  for (const [paramCmd, item, file] of ite) {
    if (item.thumbnailLink) {
      const uri = new URI(item.thumbnailLink)
      if (uri.query() === '' && uri.domain() === 'googleusercontent.com') {
        paramCmd.param.cover = {
          type: 'external',
          external: {
            url: item.thumbnailLink
          }
        }
      }
    }
    yield [paramCmd, item, file]
  }
}

function* _genCreatePageParameters(
  opts: GchangesToNotion.FileItemsOpts,
  storedItems: StoredItems,
  items: GoogleAppsScript.Drive.Schema.Change[]
): ReturnType<GchangesToNotion.ParamTransfomer> {
  const fileTransfomers = opts.fileTransfomers || [
    getFilterMimeTypeTransformer({
      ignoreTypes: ['application/vnd.google-apps.folder']
    })
  ]
  const filterTransformer: GchangesToNotion.FileTransfomer = function* (ite) {
    for (const i of ite) {
      yield i
    }
  }
  let ite: ReturnType<GchangesToNotion.FileTransfomer> = filterTransformer(
    changedItems(
      opts,
      items.filter(({ file }) => file).map(({ file }) => file || {})
    )
  )
  for (const i of fileTransfomers) {
    ite = i(ite)
  }
  for (const [item, file] of ite) {
    const existPageId = storedItems.getPageId(item.guid)
    if (existPageId === '') {
      // ゴミ箱にある場合、なにもしない
      if (!file.labels?.trashed) {
        const param: CreatePageParameters = {
          parent: {
            database_id: opts.database_id
          },
          properties: {
            title: {
              title: [{ type: 'text', text: { content: file.title || '' } }]
            },
            entryUpdated: {
              date: { start: new Date(Date.now()).toISOString() }
            },
            guid: {
              rich_text: [{ type: 'text', text: { content: item.guid } }]
            },
            mimeType: {
              select: { name: item.mimeType }
            },
            type: {
              select: { name: item.type }
            },
            excerpt: {
              rich_text: [{ type: 'text', text: { content: item.excerpt } }]
            },
            description: {
              rich_text: [{ type: 'text', text: { content: item.description } }]
            },
            link: {
              url: item.link
            },
            modified: {
              date: { start: item.modified }
            }
          }
        }
        yield [{ cmd: 'create', param }, item, file]
      }
    } else {
      if (!file.labels?.trashed) {
        const param: UpdatePageParameters = {
          page_id: existPageId,
          properties: {
            title: {
              title: [{ type: 'text', text: { content: file.title || '' } }]
            },
            entryUpdated: {
              date: { start: new Date(Date.now()).toISOString() }
            },
            mimeType: {
              select: { name: item.mimeType }
            },
            type: {
              select: { name: item.type }
            },
            excerpt: {
              rich_text: [{ type: 'text', text: { content: item.excerpt } }]
            },
            description: {
              rich_text: [{ type: 'text', text: { content: item.description } }]
            },
            link: {
              url: item.link
            },
            modified: {
              date: { start: item.modified }
            }
          }
        }
        yield [{ cmd: 'update', param }, item, file]
      } else {
        const param: UpdatePageParameters = {
          page_id: existPageId,
          archived: true
        }
        yield [{ cmd: 'delete', param }, item, file]
      }
    }
  }
}

export function* genCreatePageParameters(
  opts: GchangesToNotion.FileItemsOpts,
  storedItems: StoredItems,
  items: GoogleAppsScript.Drive.Schema.Change[]
): ReturnType<GchangesToNotion.ParamTransfomer> {
  const paramTransfomers = opts.paramTransfomers || [thumbParamTeransFormer]
  let ite: ReturnType<GchangesToNotion.ParamTransfomer> =
    _genCreatePageParameters(opts, storedItems, items)
  for (const i of paramTransfomers) {
    ite = i(ite)
  }
  for (const item of ite) {
    yield item
  }
}
