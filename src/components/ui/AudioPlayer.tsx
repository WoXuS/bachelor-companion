'use client'

import * as React from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'

export default function AudioPlayer({ src }: { src: string }) {
    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const [playing, setPlaying] = React.useState(false)
    const [duration, setDuration] = React.useState(0)
    const [current, setCurrent] = React.useState(0)
    const [muted, setMuted] = React.useState(false)
    const [volume, setVolume] = React.useState(1)

    React.useEffect(() => {
        const el = audioRef.current
        if (!el) return
        const onLoaded = () => setDuration(el.duration || 0)
        const onTime = () => setCurrent(el.currentTime || 0)
        const onEnd = () => setPlaying(false)

        el.addEventListener('loadedmetadata', onLoaded)
        el.addEventListener('timeupdate', onTime)
        el.addEventListener('ended', onEnd)
        return () => {
            el.removeEventListener('loadedmetadata', onLoaded)
            el.removeEventListener('timeupdate', onTime)
            el.removeEventListener('ended', onEnd)
        }
    }, [])

    const togglePlay = () => {
        const el = audioRef.current
        if (!el) return
        if (playing) {
            el.pause()
            setPlaying(false)
        } else {
            el.play().then(() => setPlaying(true)).catch(() => {})
        }
    }

    const onSeek = (v: number) => {
        const el = audioRef.current
        if (!el) return
        el.currentTime = v
        setCurrent(v)
    }

    const toggleMute = () => {
        const el = audioRef.current
        if (!el) return
        const next = !muted
        el.muted = next
        setMuted(next)
    }

    const onVolume = (v: number) => {
        const el = audioRef.current
        if (!el) return
        el.volume = v
        setVolume(v)
        if (v > 0 && muted) {
            el.muted = false
            setMuted(false)
        }
    }

    const fmt = (s: number) => {
        if (!isFinite(s)) return '0:00'
        const m = Math.floor(s / 60)
        const ss = Math.floor(s % 60).toString().padStart(2, '0')
        return `${m}:${ss}`
    }

    return (
        <div className="w-full rounded-lg border bg-white/5 p-3 flex flex-col gap-3">
            <audio ref={audioRef} src={src} preload="metadata" />
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="w-10 text-right text-xs text-muted-foreground">{fmt(current)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={Math.min(current, duration || 0)}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="range w-full accent-primary"
                />
                <span className="w-10 text-xs text-muted-foreground">{fmt(duration)}</span>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={togglePlay}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 hover:bg-primary/20 text-primary"
                    aria-label={playing ? 'Pauza' : 'Odtwarzaj'}
                >
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <button
                    onClick={toggleMute}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
                    aria-label={muted ? 'Wyciszony' : 'Głośność'}
                >
                    {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => onVolume(Number(e.target.value))}
                    className="range w-24 accent-primary"
                    aria-label="Głośność"
                />
            </div>
        </div>
    )
}
