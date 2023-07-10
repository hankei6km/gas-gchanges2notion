import { jest } from '@jest/globals'
import { GchangesToNotion } from '../src/gchanges2notion.js'
import { StoredItems } from '../src/notion.js'

const saveDrive = global.Drive
const saveDriveApp = global.DriveApp
const saveDateNow = global.Date.now
afterEach(() => {
  global.Drive = saveDrive
  global.DriveApp = saveDriveApp
  global.Date.now = saveDateNow
})

jest.unstable_mockModule('../src/util.js', () => {
  const mockGetFilterMimeTypeTransformer = jest.fn()
  const mockChangedItems = jest.fn()
  const reset = (items: GchangesToNotion.FileItem[]) => {
    mockGetFilterMimeTypeTransformer.mockReset().mockReturnValue(function* () {
      for (const i of items) {
        yield i
      }
    })
    mockChangedItems.mockReset().mockImplementation(function* () {
      for (const i of items) {
        yield i
      }
    })
  }

  reset([])
  return {
    getFilterMimeTypeTransformer: mockGetFilterMimeTypeTransformer,
    changedItems: mockChangedItems,
    _reset: reset,
    _getMocks: () => ({
      mockChangedItems,
      mockGetFilterMimeTypeTransformer
    })
  }
})

const mockUtil = await import('../src/util.js')
const { mockFiletems } = (mockUtil as any)._getMocks()
const { genCreatePageParameters } = await import('../src/params.js')

describe('genCreatePageParameters()', () => {
  it('should return CreatePageParameters items', () => {
    const mockItems: [
      GchangesToNotion.FileItem,
      GoogleAppsScript.Drive.Schema.File
    ][] = [
      [
        {
          fileObj: {
            getThumbnail: jest.fn().mockReturnValue({
              copyBlob: jest.fn().mockReturnValue('test-blob-1')
            })
          } as any,
          guid: 'test-id-1',
          mimeType: 'image/jpeg',
          type: 'jpeg',
          excerpt: 'test-content-1',
          description: 'test-description-1',
          link: 'test-url-1',
          modified: '2022-04-18T00:00:00.000Z',
          thumbnailLink:
            'https://test.googleusercontent.com/test-thumbnail-link-1'
        },
        {
          title: 'test-title-1',
          id: 'test-id-1',
          modifiedDate: '2022-04-18',
          thumbnailLink: 'test-thumbnail-link-1'
        }
      ],
      [
        {
          fileObj: {
            getThumbnail: jest.fn().mockReturnValue({
              copyBlob: jest.fn().mockReturnValue('test-blob-2')
            })
          } as any,
          guid: 'test-id-2',
          mimeType: 'text/plain',
          type: 'text',
          excerpt: 'test-content-2',
          description: 'test-description-2',
          link: 'test-url-2',
          modified: '2022-04-17T00:00:00.000Z'
        },
        {
          title: 'test-title-2',
          id: 'test-id-2',
          modifiedDate: '2022-04-17'
        }
      ]
    ]
    ;(mockUtil as any)._reset(mockItems)
    const mockGet = jest.fn().mockReturnValue({
      thumbnailLink: 'test-thumbnail-link-new-1'
    })
    const mockRemove = jest.fn()
    global.Drive = {
      Files: {
        get: mockGet,
        remove: mockRemove
      }
    } as any

    const mockGetFiles = jest.fn().mockReturnValue({
      hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(true),
      next: jest
        .fn()
        .mockReturnValueOnce({
          getId: jest.fn().mockReturnValue('test-remove-id-1')
        })
        .mockReturnValueOnce({
          getId: jest.fn().mockReturnValue('test-remove-id-2')
        })
    })
    const mockGetFolderById = jest.fn().mockReturnValue({
      createFile: jest.fn().mockReturnValue({
        setName: jest.fn().mockReturnValue({
          getId: jest.fn()
        })
      }),
      getFiles: mockGetFiles
    })
    const mockFileObj1 = {
      getUrl: jest.fn().mockReturnValueOnce('test-url-1')
    }
    const mockFileObj2 = {
      getUrl: jest.fn().mockReturnValueOnce('test-url-2')
    }
    const mockFileById = jest
      .fn()
      .mockReturnValueOnce(mockFileObj1)
      .mockReturnValueOnce(mockFileObj2)
    global.DriveApp = {
      getFolderById: mockGetFolderById,
      getFileById: mockFileById
    } as any

    const mockStoredItems: any = {
      getPageId: jest
        .fn()
        .mockReturnValueOnce('')
        .mockReturnValueOnce('test-page-id-2')
    }
    const g = genCreatePageParameters(
      {
        database_id: 'test-database-id'
      },
      mockStoredItems,
      []
    )
    const mockFakeNow = new Date('2022-04-20').getTime()
    Date.now = jest.fn<() => number>().mockReturnValue(mockFakeNow)

    const params: [
      GchangesToNotion.ParamsCmd,
      GchangesToNotion.FileItem,
      GoogleAppsScript.Drive.Schema.File
    ][] = []
    for (const param of g) {
      params.push(param)
    }

    expect(mockStoredItems.getPageId).toBeCalledWith('test-id-1')
    expect(mockStoredItems.getPageId).toBeCalledWith('test-id-2')

    expect(params).toEqual([
      [
        {
          cmd: 'create',
          param: {
            parent: {
              database_id: 'test-database-id'
            },
            cover: {
              type: 'external',
              external: {
                url: 'https://test.googleusercontent.com/test-thumbnail-link-1'
              }
            },
            properties: {
              title: {
                title: [{ type: 'text', text: { content: 'test-title-1' } }]
              },
              entryUpdated: {
                date: { start: '2022-04-20T00:00:00.000Z' }
              },
              guid: {
                rich_text: [{ type: 'text', text: { content: 'test-id-1' } }]
              },
              mimeType: {
                select: { name: 'image/jpeg' }
              },
              type: {
                select: { name: 'jpeg' }
              },
              excerpt: {
                rich_text: [
                  { type: 'text', text: { content: 'test-content-1' } }
                ]
              },
              description: {
                rich_text: [
                  { type: 'text', text: { content: 'test-description-1' } }
                ]
              },
              link: {
                url: 'test-url-1'
              },
              modified: {
                date: { start: '2022-04-18T00:00:00.000Z' }
              }
            }
          }
        },
        ...mockItems[0]
      ],
      [
        {
          cmd: 'update',
          param: {
            page_id: 'test-page-id-2',
            properties: {
              title: {
                title: [{ type: 'text', text: { content: 'test-title-2' } }]
              },
              entryUpdated: {
                date: { start: '2022-04-20T00:00:00.000Z' }
              },
              mimeType: {
                select: { name: 'text/plain' }
              },
              type: {
                select: { name: 'text' }
              },
              excerpt: {
                rich_text: [
                  { type: 'text', text: { content: 'test-content-2' } }
                ]
              },
              description: {
                rich_text: [
                  { type: 'text', text: { content: 'test-description-2' } }
                ]
              },
              link: {
                url: 'test-url-2'
              },
              modified: {
                date: { start: '2022-04-17T00:00:00.000Z' }
              }
            }
          }
        },
        ...mockItems[1]
      ]
    ])
  })
})
