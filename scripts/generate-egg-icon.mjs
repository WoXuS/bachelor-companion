import {deflateSync} from 'node:zlib'
import {writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const SIZE = 228
const SUPERSAMPLE = 4
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images')

const SHELL = [240, 184, 70]
const SHELL_LIGHT = [252, 218, 138]
const BAND = [62, 46, 18]

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

function encodePng(width, height, rgba) {
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(width, 0)
    ihdr.writeUInt32BE(height, 4)
    ihdr[8] = 8
    ihdr[9] = 6
    const stride = width * 4
    const raw = Buffer.alloc(height * (stride + 1))
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, {level: 9})),
        chunk('IEND', Buffer.alloc(0)),
    ])
}

function sampleEgg(nx, ny) {
    const rx = 0.68
    const ryTop = 0.96
    const ryBottom = 0.82
    const ry = ny < 0 ? ryTop : ryBottom
    if ((nx / rx) ** 2 + (ny / ry) ** 2 > 1) return null

    if (Math.sin(ny * 9 + Math.cos(nx * 5) * 0.9) > 0.55) return BAND

    const glare = Math.hypot(nx + 0.3, ny + 0.42)
    const t = Math.max(0, 1 - glare / 0.5) ** 2
    return SHELL.map((c, i) => Math.round(c + (SHELL_LIGHT[i] - c) * t))
}

const hi = SIZE * SUPERSAMPLE
const rgba = Buffer.alloc(SIZE * SIZE * 4)

for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
        let r = 0
        let g = 0
        let b = 0
        let hits = 0
        for (let sy = 0; sy < SUPERSAMPLE; sy++) {
            for (let sx = 0; sx < SUPERSAMPLE; sx++) {
                const px = x * SUPERSAMPLE + sx
                const py = y * SUPERSAMPLE + sy
                const nx = (px / hi) * 2 - 1
                const ny = (py / hi) * 2 - 1
                const c = sampleEgg(nx, ny)
                if (c) {
                    r += c[0]
                    g += c[1]
                    b += c[2]
                    hits++
                }
            }
        }
        const total = SUPERSAMPLE * SUPERSAMPLE
        const i = (y * SIZE + x) * 4
        if (hits === 0) continue
        rgba[i] = Math.round(r / hits)
        rgba[i + 1] = Math.round(g / hits)
        rgba[i + 2] = Math.round(b / hits)
        rgba[i + 3] = Math.round((hits / total) * 255)
    }
}

const png = encodePng(SIZE, SIZE, rgba)
for (const name of ['easter-egg.png', 'loader.png']) {
    writeFileSync(join(OUT_DIR, name), png)
    console.log(`wrote ${join(OUT_DIR, name)}`)
}
