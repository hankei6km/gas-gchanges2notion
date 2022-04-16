import {
  CreatePageParameters,
  UpdatePageParameters
} from '@notionhq/client/build/src/api-endpoints'
import { createPage, StoredItems, updatePage } from './notion.js'
import {
  genCreatePageParameters,
  thumbParamTeransFormer as _thumbParamTeransFormer
} from './params.js'
import { getFilterMimeTypeTransformer as _getFilterMimeTypeTransformer } from './util.js'

export namespace GchangesToNotion {
  export type FilterMimeTypeTransformerOpts = {
    ignoreTypes: string[]
  }
  export type FileTransfomer = (
    ite: Generator<[FileItem, GoogleAppsScript.Drive.Schema.File]>
  ) => Generator<[FileItem, GoogleAppsScript.Drive.Schema.File]>

  export type ParamsCmdCreate = {
    cmd: 'create'
    param: CreatePageParameters
  }
  export type ParamsCmdUpdate = {
    cmd: 'update'
    param: UpdatePageParameters
  }
  export type ParamsCmdDelete = {
    cmd: 'delete'
    param: UpdatePageParameters
  }
  export type ParamsCmd = ParamsCmdCreate | ParamsCmdUpdate | ParamsCmdDelete
  export type ParamTransfomer = (
    ite: Generator<[ParamsCmd, FileItem, GoogleAppsScript.Drive.Schema.File]>
  ) => Generator<[ParamsCmd, FileItem, GoogleAppsScript.Drive.Schema.File]>

  /**
   * Options for send method.
   * @typedef {Object} FileItemsOpts
   * @property {string} database_id
   * @property {number} [limit] - limit the number of items of each feeds to send to notion
   * @property {Array<string>} [ignoreIds] - ids of file to ignore in files list
   * @property {Array<FileTransfomer>} [fileTransfomers]
   * @property {Array<ParamTransfomer>} [paramTransfomers]
   * @property {string} [tempThumbFolderId]
   */
  export type FileItemsOpts = {
    database_id: string
    ignoreIds?: string[]
    limit?: number
    fileTransfomers?: FileTransfomer[]
    paramTransfomers?: ParamTransfomer[]
  }

  export type FileItem = {
    fileObj: GoogleAppsScript.Drive.File
    guid: string
    mimeType: string
    type: string
    excerpt: string
    description: string
    link: string
    modified: string
    thumbnailLink?: string | undefined
  }

  // export type StoredItems = Record<string, { page_id: string; use: boolean }>

  /**
   * Send items that are recent modiled files from Googl Drive to Notion
   *
   * @param {string} apiKey
   * @param {FileItemsOpts} opts
   * @returns {GoogleAppsScript.Drive.Schema.ChangeList }
   */
  export function send(
    apiKey: string,
    opts: FileItemsOpts,
    changeList: GoogleAppsScript.Drive.Schema.ChangeList
  ) {
    // TODO: opts の各フィールドを reuqired にしてデフォルトを設定
    // 現状、limit は changedItems() でも同じこをやっている、
    // その他のフィールドもデフォルト設定のコードが分散している
    const limit = typeof opts.limit === 'number' ? opts.limit : 10
    const storedItems = new StoredItems(apiKey, opts.database_id)
    if (changeList.items) {
      for (const [paramCmd, item] of genCreatePageParameters(
        opts,
        storedItems,
        changeList.items
      )) {
        if (paramCmd.cmd === 'create') {
          createPage(apiKey, paramCmd.param)
          storedItems.created(item.guid)
        } else if (paramCmd.cmd === 'update') {
          updatePage(apiKey, paramCmd.param)
          storedItems.updated(item.guid)
        } else if (paramCmd.cmd === 'delete') {
          updatePage(apiKey, paramCmd.param)
          storedItems.deleted(item.guid)
        }
      }
      storedItems.getOverPageIds(limit).forEach((page_id) => {
        if (page_id) {
          updatePage(apiKey, { page_id, archived: true })
        }
      })
      // const unuedItems = Object.entries(storedItems).filter(([k, v]) => !v.use)
      // unuedItems.forEach(([k, v]) => {
      //   updatePage(apiKey, { page_id: v.page_id, archived: true })
      // })
    }
    return
  }

  /**
   * Get filterTypeTransformer()
   *
   * @returns {ParamTransfomer}
   */
  export function getFilterMimeTypeTransformer(
    opts: FilterMimeTypeTransformerOpts
  ) {
    return _getFilterMimeTypeTransformer(opts)
  }

  /**
   * Get thumbParamTeransFormer()
   *
   * @returns {ParamTransfomer}
   */
  export function getThumbParamTeransFormer() {
    return _thumbParamTeransFormer
  }
}
