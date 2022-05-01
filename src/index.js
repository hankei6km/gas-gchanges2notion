/**
 * gas-gchanges2notion
 * @copyright (c) 2022 hankei6km
 * @license MIT
 * see "LICENSE.txt" "OPEN_SOURCE_LICENSES.txt" of "gas-gchanges2notion.zip" in
 * releases(https://github.com/hankei6km/gas-gchanges2notion/releases)
 */

'use strict'

/**
 * Send items that are fetched via feed to Notion
 *
 * @param {string} apiKey
 * @param {FileItemsOpts} opts
 * @param {Drive_v2.Drive.V2.Schema.ChangeList} changeList
 * @returns {void}
 */
function send(apiKey, opts, changeList) {
  return _entry_point_.GchangesToNotion.send(apiKey, opts, changeList)
}

/**
 * Get filterMimeTypeTransformer()
 *
 * @returns {function}
 */
function getFilterMimeTypeTransformer(opts) {
  return _entry_point_.GchangesToNotion.getFilterMimeTypeTransformer(opts)
}

/**
 * Get thumbParamTeransFormer()
 *
 * @returns {function}
 */
function getThumbParamTeransFormer() {
  return _entry_point_.GchangesToNotion.getThumbParamTeransFormer()
}
