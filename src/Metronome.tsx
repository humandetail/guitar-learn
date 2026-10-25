import { useEffect, useRef, useState } from 'react'
import { Button } from './components/ui/button'
import type { Settings } from './model'
import { isMicrophoneActive, subscribeAudioState } from './audio-bus'
import { MetronomeClock, type Rhythm } from './metronome-clock'

const sameRhythm = (a: Rhythm, b: Rhythm) => a.bpm === b.bpm && a.beats === b.beats && a.subdivision === b.subdivision
export default function Metronome({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  const [running, setRunning] = useState(false)
  const [applied, setApplied] = useState<Rhythm>(settings)
  const [step, setStep] = useState(0)
  const [input, setInput] = useState(String(settings.bpm))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [micActive, setMicActive] = useState(isMicrophoneActive)
  const [soundBlocked, setSoundBlocked] = useState(isMicrophoneActive)
  const clock = useRef<MetronomeClock | null>(null)
  const live = useRef({ settings, soundBlocked })
  live.current = { settings, soundBlocked }
  const starting = useRef(false)

  function stop(message = '') {
    clock.current?.stop()
    clock.current = null
    starting.current = false
    setRunning(false)
    setStep(0)
    setNotice(message)
  }
  useEffect(() => {
    const sync = () => {
      const active = isMicrophoneActive()
      setMicActive(active)
      if (active) { setSoundBlocked(true); clock.current?.sound(false) }
    }
    const unsubscribe = subscribeAudioState(sync)
    const hidden = () => { if (document.hidden && clock.current) stop('节拍已暂停，返回后请手动继续，从第一拍开始。') }
    const leave = () => stop()
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', leave)
    return () => { unsubscribe(); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', leave); clock.current?.stop(); clock.current = null }
  }, [])
  useEffect(() => { setInput(String(settings.bpm)) }, [settings.bpm])
  useEffect(() => {
    clock.current?.update(settings)
    if (!clock.current) setApplied(settings)
  }, [settings.bpm, settings.beats, settings.subdivision])
  useEffect(() => { clock.current?.sound(settings.sound && !soundBlocked && !isMicrophoneActive()) }, [settings.sound, soundBlocked])

  function changeBpm(value: string) {
    setInput(value)
    const bpm = Number(value)
    if (!value.trim() || !Number.isInteger(bpm) || bpm < 30 || bpm > 240) { setError('请输入 30–240 的整数 BPM'); return }
    setError('')
    onChange({ bpm })
  }
  async function start() {
    if (clock.current || starting.current) return
    starting.current = true
    setNotice('')
    setError('')
    const engine = new MetronomeClock(live.current.settings, (next, rhythm) => { setStep(next); setApplied(rhythm) }, () => stop('音频时钟已中断，请手动继续，从第一拍开始。'))
    clock.current = engine
    engine.sound(live.current.settings.sound && !live.current.soundBlocked && !isMicrophoneActive())
    try {
      await engine.start()
      if (clock.current !== engine) return
      if (document.hidden) { stop('节拍已暂停，返回后请手动继续。'); return }
      starting.current = false
      setApplied(live.current.settings)
      setRunning(true)
    } catch {
      if (clock.current !== engine) return
      stop()
      setError('无法启动节拍音频，请检查浏览器声音设置后重试。')
    }
  }

  const rhythm = running ? applied : settings
  const beat = Math.floor(step / rhythm.subdivision)
  const sub = step % rhythm.subdivision
  const pending = running && !sameRhythm(applied, settings)
  return <div className="metronome">
    <div className="title-row"><h1>节拍器</h1><span className="mode">跟上每一拍</span></div>
    <section className="panel" aria-label="速度设置">
      <div className="field-row"><Button aria-label="降低 BPM" disabled={settings.bpm <= 30} onClick={() => changeBpm(String(settings.bpm - 1))}>−</Button><label className="bpm-number">BPM<input aria-label="BPM" type="number" min="30" max="240" step="1" value={input} aria-invalid={!!error} onChange={e => changeBpm(e.target.value)} /></label><Button aria-label="提高 BPM" disabled={settings.bpm >= 240} onClick={() => changeBpm(String(settings.bpm + 1))}>＋</Button></div>
      <input aria-label="速度滑块" type="range" min="30" max="240" step="1" value={settings.bpm} onChange={e => changeBpm(e.target.value)} />
      <div className="field-row"><span>30</span><span>240</span></div>
    </section>
    {error && <p role="alert" className="error-box">{error}</p>}
    <div className="form-grid">
      <fieldset><legend>每小节拍数</legend><div className="segmented">{([2, 3, 4] as const).map(beats => <Button key={beats} variant="outline" aria-pressed={settings.beats === beats} onClick={() => onChange({ beats })}>{beats} 拍</Button>)}</div></fieldset>
      <fieldset><legend>细分</legend><div className="segmented">{([{ value: 1, label: '四分' }, { value: 2, label: '八分' }, { value: 4, label: '十六分' }] as const).map(({ value, label }) => <Button key={value} variant="outline" aria-pressed={settings.subdivision === value} onClick={() => onChange({ subdivision: value })}>{label}</Button>)}</div></fieldset>
    </div>
    <section className="beat-tracks" aria-label="节拍轨道" style={{ display: 'grid', gridTemplateColumns: `repeat(${rhythm.beats}, 1fr)`, gap: 8 }}>
      {Array.from({ length: rhythm.beats }, (_, i) => <div key={i} className={`beat-track ${running && beat === i ? 'current' : ''} ${i === 0 ? 'accent' : ''}`} aria-label={`第 ${i + 1} 拍${i === 0 ? ' 重音' : ''}`} aria-current={running && beat === i ? 'step' : undefined}><strong>{i + 1}</strong><span>{i === 0 ? '重音' : '主拍'}</span>{Array.from({ length: rhythm.subdivision }, (_, j) => <i key={j} className={running && beat === i && sub === j ? 'pulse active' : 'pulse'} />)}</div>)}
    </section>
    <p aria-label="当前节拍" className="beat-position">{running ? `第 ${beat + 1} 拍 · ${sub === 0 ? beat === 0 ? '小节重音' : '主拍' : `细分 ${sub + 1}`} · ${rhythm.beats}/4 · ${rhythm.bpm} BPM` : '准备开始 · 从第一拍进入'}</p>
    <label className="field-row"><span>播放 click 声音</span><input type="checkbox" aria-label="播放 click 声音" checked={settings.sound} onChange={e => onChange({ sound: e.target.checked })} /></label>
    {pending && <p role="status" className="notice">下一小节应用：{settings.bpm} BPM · {settings.beats} 拍 · {settings.subdivision === 1 ? '四分' : settings.subdivision === 2 ? '八分' : '十六分'}</p>}
    {soundBlocked && <p className="notice">{micActive ? '麦克风使用中，click 已暂停，视觉节拍继续。' : '麦克风检测已结束，请手动恢复节拍器声音。'}</p>}
    {soundBlocked && <Button variant="outline" disabled={micActive || !settings.sound} onClick={() => { if (!isMicrophoneActive() && settings.sound) setSoundBlocked(false) }}>恢复节拍器声音</Button>}
    {notice && <p role="status" className="notice">{notice}</p>}
    <div className="actions"><Button className="w-full" onClick={running ? () => stop('节拍已停止。') : () => void start()}>{running ? '停止节拍' : notice.includes('暂停') || notice.includes('中断') ? '继续节拍' : '开始节拍'}</Button></div>
    <p className="muted">click 为合成短音；关闭声音仍可跟随视觉拍点。</p>
  </div>
}
