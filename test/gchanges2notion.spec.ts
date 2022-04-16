import { jest } from '@jest/globals'
import { getFilterMimeTypeTransformer } from '../src/util.js'

jest.unstable_mockModule('../src/notion.js', () => {
  const mockCreatePage = jest.fn()
  const mockUpdatePage = jest.fn()
  const mockSortedItems = jest.fn()
  const mockSortedItemsMethods = {
    created: jest.fn(),
    updated: jest.fn(),
    deleted: jest.fn(),
    getOverPageIds: jest.fn()
  }
  const reset = () => {
    mockCreatePage.mockReset()
    mockUpdatePage.mockReset()
    mockSortedItemsMethods.created.mockReset()
    mockSortedItemsMethods.updated.mockReset()
    mockSortedItemsMethods.deleted.mockReset()
    mockSortedItemsMethods.getOverPageIds
      .mockReset()
      .mockReturnValue(['test-over-1', 'test-over-2'])
    mockSortedItems.mockReset().mockImplementation(() => {
      return mockSortedItemsMethods
    })
  }

  reset()
  return {
    createPage: mockCreatePage,
    updatePage: mockUpdatePage,
    StoredItems: mockSortedItems,
    _reset: reset,
    _getMocks: () => ({
      mockCreatePage,
      mockUpdatePage,
      mockSortedItems,
      mockSortedItemsMethods
    })
  }
})

jest.unstable_mockModule('../src/params.js', () => {
  const mockGenCreatePageParameters = jest.fn()
  const mockThumbParamTeransFormer = jest.fn()
  const reset = (items: any[]) => {
    mockGenCreatePageParameters.mockReset().mockImplementation(function* () {
      for (const i of items) {
        yield i
      }
    })
    mockThumbParamTeransFormer.mockReset()
  }

  reset([])
  return {
    genCreatePageParameters: mockGenCreatePageParameters,
    thumbParamTeransFormer: mockThumbParamTeransFormer,
    _reset: reset,
    _getMocks: () => ({
      mockGenCreatePageParameters,
      mockThumbParamTeransFormer
    })
  }
})

const mockNotion = await import('../src/notion.js')
const mockParams = await import('../src/params.js')
const {
  mockCreatePage,
  mockUpdatePage,
  mockSortedItems,
  mockSortedItemsMethods
} = (mockNotion as any)._getMocks()
const { mockGenCreatePageParameters, mockThumbParamTeransFormer } = (
  mockParams as any
)._getMocks()
const { GchangesToNotion: GrecentToNotion } = await import(
  '../src/gchanges2notion.js'
)

afterEach(() => {
  ;(mockNotion as any)._reset()
})

describe('GrecentToNotion.send()', () => {
  it('should call createPage', () => {
    ;(mockParams as any)._reset([
      [{ cmd: 'create', param: 'test-1' }, '', ''],
      [{ cmd: 'update', param: 'test-2' }, '', ''],
      [{ cmd: 'delete', param: 'test-3' }, '', '']
    ])

    GrecentToNotion.send(
      'test-api-key',
      {
        database_id: 'test-database-id'
      },
      { items: [] }
    )
    expect(mockSortedItems).toBeCalledWith('test-api-key', 'test-database-id')
    expect(mockCreatePage).toBeCalledWith('test-api-key', 'test-1')
    expect(mockUpdatePage).toBeCalledWith('test-api-key', 'test-2')
    expect(mockUpdatePage).toBeCalledWith('test-api-key', 'test-3')
    expect(mockUpdatePage).toBeCalledWith('test-api-key', {
      page_id: 'test-over-1',
      archived: true
    })
    expect(mockUpdatePage).toBeCalledWith('test-api-key', {
      page_id: 'test-over-2',
      archived: true
    })
  })
})

describe('GrecentToNotion.getFilterMimeTypeTransformer()', () => {
  it('should get transformer', () => {
    function* mockGen(): Generator<[any, any]> {
      yield [{ mimeType: 'a' }, 'item-1']
      yield [{ mimeType: 'b' }, 'item-2']
    }
    const t = GrecentToNotion.getFilterMimeTypeTransformer({
      ignoreTypes: ['a']
    })
    const items: any[] = []
    for (const item of t(mockGen())) {
      items.push(item)
    }
    expect(items).toEqual([[{ mimeType: 'b' }, 'item-2']])
  })
})

describe('GrecentToNotion.getThumbParamTeransFormer()', () => {
  it('should get transformer', () => {
    expect(GrecentToNotion.getThumbParamTeransFormer()).toEqual(
      mockThumbParamTeransFormer
    )
  })
})
