import { useEffect, useRef, useState } from 'react'
import { Button } from './components/ui/button'
import { registerReferenceStop } from './audio-bus'
import type { GuitarInput } from './ExperienceChallenges'
import { MetronomeClock } from './metronome-clock'

const targets = [{ beat: 4, chord: 'G' }, { beat: 6, chord: 'G' }, { beat: 8, chord: 'C' }, { beat: 10, chord: 'C' }]
type Round = { clock: MetronomeClock; firstBeat: number | null; beat: number; hits: Set<number> }
export type RhythmActions = { chord: string | null; selectChord: (chord: string) => void; strum: () => void }

export default function RhythmChallenge({ active, input, onPass, actions }: { active: boolean; input: GuitarInput; onPass: () => void; actions: RhythmActions }) {
  const [bpm, setBpm] = useState(60)
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(-1)
  const [hits, setHits] = useState(0)
  const [message, setMessage] = useState('')
  const round = useRef<Round | null>(null)

  function stop() {
    round.current?.clock.stop()
    round.current = null
    setRunning(false)
    setBeat(-1)
  }

  useEffect(() => {
    if (!active) { stop(); return }
    const interrupt = () => {
      if (!round.current) return
      stop()
      setMessage('本轮暂停，点击「开始跟拍」重新开始。')
    }
    const hide = () => { if (document.hidden) interrupt() }
    const unsubscribe = registerReferenceStop(interrupt)
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', interrupt)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('pagehide', interrupt)
      round.current?.clock.stop()
      round.current = null
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    input.current = ({ strokeAt, chord }) => {
      const current = round.current
      const now = current?.clock.currentTime
      if (strokeAt === undefined || !current || now == null) return
      if (current.firstBeat === null || current.beat < 3) { setMessage('先听四拍预备，下一小节再扫。'); return }
      const age = (performance.now() - strokeAt) / 1000
      if (age > .4) { setMessage('把琴弦连起来扫，试试一拍内完成。'); return }
      const elapsed = (now - age - current.firstBeat) / (60 / bpm)
      const nearest = targets.reduce((closest, target) => Math.abs(target.beat - elapsed) < Math.abs(closest.beat - elapsed) ? target : closest)
      const offset = elapsed - nearest.beat
      if (offset < -.28) { setMessage('早了一点，等到标出「扫」的拍子。'); return }
      if (offset > .28) { setMessage('晚了一点，跟着标出「扫」的拍子再试。'); return }
      if (current.hits.has(nearest.beat)) return
      if (chord !== nearest.chord) { setMessage(`这一拍请先选 ${nearest.chord} 和弦，再扫弦。`); return }
      current.hits.add(nearest.beat)
      setHits(current.hits.size)
      setMessage('跟上了。')
    }
    return () => { input.current = null }
  }, [active, bpm, input])

  async function start() {
    stop()
    setHits(0); setMessage(''); setRunning(true)
    const clock = new MetronomeClock({ bpm, beats: 4, subdivision: 1 }, (_step, _rhythm, time) => {
      const current = round.current
      if (!current || current.clock !== clock) return
      current.firstBeat ??= time
      const beat = ++current.beat
      if (beat < 12) { setBeat(beat); return }
      const passed = current.hits.size === targets.length
      stop()
      if (passed) {
        setMessage('本关通过 · 你完成了屏幕上的弹奏练习。')
        onPass()
      } else setMessage(`本轮跟上 ${current.hits.size} / ${targets.length} 次。可以降速，再从预备拍开始。`)
    }, () => { stop(); setMessage('节拍已暂停，请重新开始。') })
    const attempt: Round = { clock, firstBeat: null, beat: -1, hits: new Set() }
    round.current = attempt
    try { await clock.start() }
    catch {
      if (round.current !== attempt) return
      stop(); setMessage('节拍声音无法启动，请检查浏览器声音设置后重试。')
    }
  }

  const step = beat % 4 + 1
  const chord = beat < 8 ? 'G' : 'C'
  const action = step === 1 || step === 3 ? '扫' : '等'
  return <>
    <h2>第二关 · 跟拍扫弦</h2>
    <p className="experience-instruction">预备四拍。先选 G，第 1、3 拍各扫一次。下一小节换 C，再扫两次。</p>
    <div className="experience-challenge-actions">
      <label className="experience-tempo">跟拍速度<select value={bpm} onChange={event => { stop(); setBpm(Number(event.target.value)); setHits(0); setMessage('速度已调整，点击「开始跟拍」重来。') }}>
        {[40, 50, 60, 70, 80].map(speed => <option key={speed} value={speed}>{speed} BPM</option>)}
      </select></label>
      <Button onClick={running ? () => { stop(); setMessage('本轮已停止。') } : () => void start()}>{running ? '停止跟拍' : '开始跟拍'}</Button>
    </div>
    <p className="experience-target" role="status" aria-label="当前节拍">{beat < 0 ? '待开始' : beat < 4 ? `预备 · ${step} / 4` : `第 ${Math.floor(beat / 4)} 小节 · 第 ${step} 拍 · ${chord} · ${action}`}</p>
    <div className="segmented experience-rhythm-actions" role="group" aria-label="跟拍操作">
      {['G', 'C'].map(name => <button type="button" key={name} aria-label={`跟拍选 ${name} 和弦`} aria-pressed={actions.chord === name} onClick={() => actions.selectChord(name)}>{name}</button>)}
      <Button onClick={actions.strum}>扫一下</Button>
    </div>
    <p className="experience-instruction">跟上 {hits} / {targets.length} 次</p>
    <p className="experience-instruction" role="status" aria-label="关卡反馈">{message}</p>
  </>
}
