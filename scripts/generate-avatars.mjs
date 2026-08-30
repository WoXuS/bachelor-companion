import {deflateSync} from 'node:zlib'
import {mkdirSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const SIZE = 512
const GRID = 5
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'participants')

const CRC_TABLE = Uint32Array.from({length: 256}, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
})

function crc32(buf) {
    let c = 0xffffffff
    for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(data.length, 0)
    head.write(type, 4, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
    return Buffer.concat([head, data, crc])
}

function encodePng(width, height, rgb) {
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(width, 0)
    ihdr.writeUInt32BE(height, 4)
    ihdr[8] = 8
    ihdr[9] = 2
    const raw = Buffer.alloc(height * (width * 3 + 1))
    for (let y = 0; y < height; y++) {
        raw[y * (width * 3 + 1)] = 0
        rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3)
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, {level: 9})),
        chunk('IEND', Buffer.alloc(0)),
    ])
}

function hash(seed) {
    let h = 2166136261
    for (const ch of seed) {
        h ^= ch.charCodeAt(0)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

function hslToRgb(h, s, l) {
    const a = s * Math.min(l, 1 - l)
    const f = (n) => {
        const k = (n + h * 12) % 12
        return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
    }
    return [f(0), f(8), f(4)]
}

function renderIdenticon(seed) {
    const h = hash(seed)
    const hue = (h % 360) / 360
    const fg = hslToRgb(hue, 0.62, 0.62)
    const bg = hslToRgb(hue, 0.34, 0.17)

    const half = Math.ceil(GRID / 2)
    const cells = []
    for (let y = 0; y < GRID; y++) {
        const row = []
        for (let x = 0; x < half; x++) row.push(((h >>> ((y * half + x) % 29)) & 1) === 1)
        for (let x = half; x < GRID; x++) row.push(row[GRID - 1 - x])
        cells.push(row)
    }

    const rgb = Buffer.alloc(SIZE * SIZE * 3)
    const cell = SIZE / GRID
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const on = cells[Math.floor(y / cell)][Math.floor(x / cell)]
            const [r, g, b] = on ? fg : bg
            const i = (y * SIZE + x) * 3
            rgb[i] = r
            rgb[i + 1] = g
            rgb[i + 2] = b
        }
    }
    return encodePng(SIZE, SIZE, rgb)
}

const slugs = process.argv.slice(2)
if (slugs.length === 0) {
    console.error('usage: node scripts/generate-avatars.mjs <slug> [slug...]')
    process.exit(1)
}

mkdirSync(OUT_DIR, {recursive: true})
for (const slug of slugs) {
    const file = join(OUT_DIR, `${slug}.png`)
    writeFileSync(file, renderIdenticon(slug))
    console.log(`wrote ${file}`)
}
