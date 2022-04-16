import { jest } from '@jest/globals'
const saveUrlFetchApp = global.UrlFetchApp
afterEach(() => {
  global.UrlFetchApp = saveUrlFetchApp
})

describe('send()', () => {
  it('should return void', () => {
    const mockfetch = jest.fn().mockReturnValueOnce({
      getContentText: jest.fn().mockReturnValueOnce(
        JSON.stringify({
          results: [],
          next_cursor: null,
          has_more: false
        })
      )
    })
    global.UrlFetchApp = {
      fetch: mockfetch
    }
    expect(
      send(
        'test-api-key',
        {
          dataase_id: 'test-database-id'
        },
        { imtes: [] }
      )
    ).toBeUndefined()
  })
})

describe('getFilterMimeTypeTransformer()', () => {
  it('should get function', () => {
    const p = getFilterMimeTypeTransformer({ ignoreTypes: [] })
    expect(typeof p).toEqual('function')
  })
})

describe('getThumbParamTeransFormer()', () => {
  it('should get function', () => {
    const p = getThumbParamTeransFormer()
    expect(typeof p).toEqual('function')
  })
})
