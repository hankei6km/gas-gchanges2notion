import { jest } from '@jest/globals'
import { GchangesToNotion } from '../src/main.js'
import {
  asText,
  changedItems,
  getContentLines,
  getFilterMimeTypeTransformer,
  getType,
  isTextType
} from '../src/util.js'

const saveDrive = global.Drive
const saveDriveApp = global.DriveApp
const saveUtilities = global.Utilities
const saveDocumentApp = global.DocumentApp
const saveSpreadsheetApp = global.SpreadsheetApp
const saveSlidesApp = global.SlidesApp
afterEach(() => {
  global.Drive = saveDrive
  global.DriveApp = saveDriveApp
  global.Utilities = saveUtilities
  global.DocumentApp = saveDocumentApp
  global.SpreadsheetApp = saveSpreadsheetApp
  global.SlidesApp = saveSlidesApp
})
function getMockNewBlob() {
  return jest.fn().mockImplementation((v) => {
    return {
      getBytes: jest.fn<void, [string]>().mockImplementation(() => v)
    }
  })
}

describe('isTextType()', () => {
  it('should return true', () => {
    expect(isTextType('text/plain')).toBeTruthy()
    expect(isTextType('text/html')).toBeTruthy()
    expect(isTextType('text')).toBeTruthy()
  })
  it('should return false', () => {
    expect(isTextType('')).toBeFalsy()
    expect(isTextType()).toBeFalsy()
    expect(isTextType('application/vnd.google-apps.document')).toBeFalsy()
  })
})

describe('getContentLines()', () => {
  it('should return all lines', () => {
    global.Utilities = {
      newBlob: getMockNewBlob()
    } as any

    const mockLines = `test-1
    test-2
    test-3`
    expect(getContentLines(mockLines)).toEqual(mockLines)
  })

  it('should limit lines by maxContentLength', () => {
    global.Utilities = {
      newBlob: getMockNewBlob()
    } as any

    let mockLines = 'test-1\n'
    for (let i = 0; i < 1900; i++) {
      mockLines = `${mockLines}_`
    }
    expect(getContentLines(mockLines)).toEqual('test-1')
  })
})

describe('getType()', () => {
  it('should return type', () => {
    expect(getType('application/vnd.google-apps.document')).toEqual('document')
    expect(getType('application/vnd.google-apps.spreadsheet')).toEqual(
      'spreadsheet'
    )
    expect(getType('text/plain')).toEqual('text')
    expect(getType('text/csv')).toEqual('csv')
    expect(getType('application/pdf')).toEqual('pdf')
  })
})

describe('getFilterMimeTypeTransformer()', () => {
  it('should filter by mime type', () => {
    function* mockGen(): Generator<[any, any]> {
      yield [{ mimeType: 'text/plain' }, 'item-1']
      yield [{ mimeType: 'application/vnd.google-apps.folder' }, 'item-2']
      yield [{ mimeType: 'image/jpeg' }, 'item-3']
      yield [{ mimeType: 'text/csv' }, 'item-4']
    }
    const filterMimeTypeTransformer = getFilterMimeTypeTransformer({
      ignoreTypes: ['application/vnd.google-apps.folder', 'image/jpeg']
    })
    const items: any[] = []
    for (const item of filterMimeTypeTransformer(mockGen())) {
      items.push(item)
    }
    expect(items).toEqual([
      [{ mimeType: 'text/plain' }, 'item-1'],
      [{ mimeType: 'text/csv' }, 'item-4']
    ])
  })
})

describe('asText()', () => {
  it('should get text from plain text', () => {
    const mockGetAs = jest.fn().mockReturnValue({
      getDataAsString: jest.fn().mockReturnValue('test-plain-text')
    })
    const fileObj = {
      getAs: mockGetAs
    }
    expect(asText('text/plain', 'text', fileObj as any, 'test-id')).toEqual(
      'test-plain-text'
    )
    expect(mockGetAs).toBeCalledWith('text/plain')
  })

  it('should get text from DcumentApp', () => {
    const mockOpenById = jest.fn().mockReturnValue({
      getBody: jest.fn().mockReturnValue({
        getText: jest.fn().mockReturnValue('test-document-text')
      })
    })
    global.DocumentApp = {
      openById: mockOpenById
    } as any
    expect(
      asText(
        'application/vnd.google-apps.document',
        'document',
        {} as any,
        'test-id'
      )
    ).toEqual('test-document-text')
    expect(mockOpenById).toBeCalledWith('test-id')
  })

  it('should get text from SpreadsheetApp', () => {
    const mockRange = jest.fn().mockReturnValue({
      getDisplayValues: jest.fn().mockReturnValue([
        ['test-val-1-1', 'test-val-1-2'],
        ['test-val-2-1', 'test-val-2-2'],
        ['test-val-3-1', 'test-val-3-2']
      ])
    })
    const mockOpenById = jest.fn().mockReturnValue({
      getActiveSheet: jest.fn().mockReturnValue({
        getDataRange: jest.fn().mockReturnValue({
          getRow: jest.fn().mockReturnValueOnce(1).mockReturnValueOnce(1),
          getColumn: jest.fn().mockReturnValueOnce(4).mockReturnValueOnce(4),
          getNumRows: jest.fn().mockReturnValueOnce(3).mockReturnValueOnce(100),
          getNumColumns: jest
            .fn()
            .mockReturnValueOnce(2)
            .mockReturnValueOnce(100)
        }),
        getRange: mockRange
      })
    })
    global.SpreadsheetApp = {
      openById: mockOpenById
    } as any
    expect(
      asText(
        'application/vnd.google-apps.spreadsheet',
        'spreadsheet',
        {} as any,
        'test-id'
      )
    ).toEqual(`test-val-1-1\ttest-val-1-2
test-val-2-1\ttest-val-2-2
test-val-3-1\ttest-val-3-2`)
    // max を超えた場合の確認
    asText(
      'application/vnd.google-apps.spreadsheet',
      'spreadsheet',
      {} as any,
      'test-id'
    )
    expect(mockOpenById).toBeCalledWith('test-id')
    expect(mockRange).toBeCalledWith(1, 4, 3, 2)
    expect(mockRange).toBeCalledWith(1, 4, 70, 70)
  })

  it('should get text from SlidesApp', () => {
    const mockGetShapes1 = [
      {
        getText: jest.fn().mockReturnValueOnce({
          asString: jest.fn().mockReturnValueOnce('test-shape1-1')
        })
      },
      {
        getText: jest.fn().mockReturnValueOnce({
          asString: jest.fn().mockReturnValueOnce('test-shape1-2')
        })
      }
    ]
    const mockGetShapes2 = [
      {
        getText: jest.fn().mockReturnValueOnce({
          asString: jest.fn().mockReturnValueOnce('test-shape2-1')
        })
      },
      {
        getText: jest.fn().mockReturnValueOnce({
          asString: jest.fn().mockReturnValueOnce('test-shape2-2')
        })
      }
    ]
    const mockSlide1 = {
      getShapes: jest.fn().mockReturnValue(mockGetShapes1)
    }
    const mockSlide2 = {
      getShapes: jest.fn().mockReturnValue(mockGetShapes2)
    }
    const mockOpenById = jest.fn().mockReturnValue({
      getSlides: jest.fn().mockReturnValue([mockSlide1, mockSlide2])
    })
    global.SlidesApp = {
      openById: mockOpenById
    } as any
    expect(
      asText(
        'application/vnd.google-apps.presentation',
        'presentation',
        {} as any,
        'test-id'
      )
    ).toEqual(`test-shape1-1
test-shape1-2
---
test-shape2-1
test-shape2-2`)
    expect(mockOpenById).toBeCalledWith('test-id')
  })
})

describe('changedItems()', () => {
  it('should return file items from drive', () => {
    const mockList = [
      {
        id: 'test-id-1',
        mimeType: 'application/vnd.google-apps.photo',
        modifiedDate: '2022-04-18',
        description: 'test-description-1',
        thumbnailLink: 'test-thumbnail-link-1'
      },
      {
        id: 'test-id-2',
        mimeType: 'text/plain',
        modifiedDate: '2022-04-17'
      }
    ]
    const mockFileObj1 = {
      getUrl: jest.fn().mockReturnValueOnce('test-url-1')
    }
    const mockFileObj2 = {
      getUrl: jest.fn().mockReturnValueOnce('test-url-2'),
      getAs: jest.fn().mockReturnValueOnce({
        getDataAsString: jest.fn().mockReturnValueOnce('test-content-2')
      })
    }
    const mockFileById = jest
      .fn()
      .mockReturnValueOnce(mockFileObj1)
      .mockReturnValueOnce(mockFileObj2)
    global.DriveApp = {
      getFileById: mockFileById
    } as any
    global.Utilities = {
      newBlob: getMockNewBlob()
    } as any

    const items: [
      GchangesToNotion.FileItem,
      GoogleAppsScript.Drive.Schema.File
    ][] = []

    const g = changedItems(
      {
        database_id: ''
      },
      mockList
    )
    for (const item of g) {
      items.push(item)
    }

    expect(mockFileById).toBeCalledWith('test-id-1')
    expect(mockFileById).toBeCalledWith('test-id-2')
    expect(items).toEqual([
      [
        {
          fileObj: mockFileObj1,
          guid: 'test-id-1',
          mimeType: 'application/vnd.google-apps.photo',
          type: 'photo',
          excerpt: '',
          description: 'test-description-1',
          link: 'test-url-1',
          modified: '2022-04-18T00:00:00.000Z',
          thumbnailLink: 'test-thumbnail-link-1'
        },
        {
          id: 'test-id-1',
          mimeType: 'application/vnd.google-apps.photo',
          modifiedDate: '2022-04-18',
          description: 'test-description-1',
          thumbnailLink: 'test-thumbnail-link-1'
        }
      ],
      [
        {
          fileObj: mockFileObj2,
          mimeType: 'text/plain',
          type: 'text',
          guid: 'test-id-2',
          excerpt: 'test-content-2',
          description: '',
          link: 'test-url-2',
          modified: '2022-04-17T00:00:00.000Z'
        },
        {
          id: 'test-id-2',
          mimeType: 'text/plain',
          modifiedDate: '2022-04-17'
        }
      ]
    ])
  })
})
