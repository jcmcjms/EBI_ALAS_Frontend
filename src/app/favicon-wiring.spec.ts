/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = join(import.meta.dirname, '../..')

type FileKind = 'png' | 'svg' | 'ico' | 'unknown'

function detectFileKind(filePath: string): FileKind {
  const bytes = readFileSync(filePath)
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png'
  }
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return 'ico'
  }
  const head = bytes.toString('utf8', 0, Math.min(bytes.length, 512)).trimStart()
  if (head.startsWith('<svg') || head.startsWith('<?xml')) {
    return 'svg'
  }
  return 'unknown'
}

function kindForDeclaredType(type: string): FileKind {
  if (type === 'image/png') return 'png'
  if (type === 'image/svg+xml') return 'svg'
  if (type === 'image/x-icon' || type === 'image/vnd.microsoft.icon' || type === 'image/ico') return 'ico'
  return 'unknown'
}

describe('favicon wiring', () => {
  it('serves an icon whose file format matches the declared MIME type', () => {
    const html = readFileSync(join(projectRoot, 'index.html'), 'utf8')
    const tag = html.match(/<link\b[^>]*\brel="icon"[^>]*>/i)?.[0]
    expect(tag, 'index.html must declare a rel="icon" link').toBeTruthy()

    const href = tag!.match(/\bhref="([^"]+)"/i)?.[1]
    const type = tag!.match(/\btype="([^"]+)"/i)?.[1]
    expect(href, 'icon link must include href').toBeTruthy()
    expect(type, 'icon link must include type').toBeTruthy()

    const publicRelative = href!.replace(/^\//, '')
    const assetPath = join(projectRoot, 'public', publicRelative)
    expect(existsSync(assetPath), `icon asset missing at public/${publicRelative}`).toBe(true)

    const actual = detectFileKind(assetPath)
    const expected = kindForDeclaredType(type!)
    expect(actual, `public/${publicRelative} bytes must match type="${type}"`).toBe(expected)
  })
})
