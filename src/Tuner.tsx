import { useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Mic, MicOff, Square } from 'lucide-react'
import { Button } from './components/ui/button'
import { listenForPitch, MicrophoneInput, microphoneError, type PitchReading } from './audio'

import { claimMicrophone, subscribeMicrophoneStop } from './audio-bus'
import { openMidi, openNotes, withinCents } from './model'

type Session = 'idle' | 'requesting' | 'listening'
export default function Tuner({ reference }: { reference: number }) {
  const [selected, setSelected] = useState(0)
  const [session, setSession] = useState<Session>('idle')
  const [reading, setReading] = useState<PitchReading | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const active = useRef<MicrophoneInput | null>(null)
  const stopListening = useRef<(() => void) | null>(null)

  const releaseMicrophone = useRef<(() => void) | null>(null)

  function stop(message = '') {
    stopListening.current?.()
    stopListening.current = null
    active.current?.destroy()
    active.current = null
    releaseMicrophone.current?.()
    releaseMicrophone.current = null
    setReading(null)
    setSession('idle')
    setNotice(message)
  }

  useEffect(() => {
    const onHidden = () => { if (document.hidden && active.current) stop('调音已暂停，麦克风已释放。返回后请手动开始。') }
    const onLeave = () => stop()
    const unsubscribe = subscribeMicrophoneStop(() => { if (active.current) stop('调音已停止，麦克风已释放。') })
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onLeave)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onLeave)
      stopListening.current?.()
      active.current?.destroy()
      active.current = null
      releaseMicrophone.current?.()
      releaseMicrophone.current = null
    }
  }, [])

  useEffect(() => {
    stop()
    setError('')
  }, [reference, selected])

  async function start() {
    if (active.current) return
    setError('')
    setNotice('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('当前页面无法使用麦克风，请使用 HTTPS 安全连接或本机 localhost。')
      return
    }
    releaseMicrophone.current = claimMicrophone()
    const input = new MicrophoneInput()
    active.current = input
    setSession('requesting')
    input.onInterrupted = () => {
      if (active.current !== input) return
      stop()
      setError('麦克风连接已中断，请检查输入设备后重试。')
    }
    try {
      await input.init()
      if (active.current !== input) { input.destroy(); return }
      if (document.hidden) { stop('调音已暂停，麦克风已释放。返回后请手动开始。'); return }
      setSession('listening')
      stopListening.current = listenForPitch(input, setReading, { reference, targetMidi: openMidi[selected] })
    } catch (cause) {
      if (active.current !== input) return
      stop()
      setError(microphoneError(cause))
    }
  }

  const inTune = reading !== null && withinCents(reading.cents, 5)
  const status = reading ? inTune ? '已调准' : !withinCents(reading.cents, 100) ? '偏离目标较大' : reading.cents < 0 ? '调高' : '调低' : session === 'listening' ? '等待弹奏' : session === 'requesting' ? '等待麦克风授权' : '准备调音'
  const signedCents = reading ? `${reading.cents > 0 ? '+' : ''}${Math.round(reading.cents)}` : '—'
  const scaleLimit = reading && Math.abs(reading.cents) > 50 ? Math.ceil(Math.abs(reading.cents) / 100) * 100 : 50

  return <section aria-label="调音器">
    <div className="title-row"><h1>调音</h1><span className="mode">第 {6 - selected} 弦 · {openNotes[selected]}</span></div>
    <div className="subheading"><span>标准调弦</span><span>A4 <b>{reference}</b> Hz</span></div>
    <section className="strings" aria-label="选择目标弦" style={{ gridTemplateColumns: openNotes.map((_, index) => index === selected ? 'minmax(76px, 1.9fr)' : 'minmax(44px, 1fr)').join(' ') }}>
      {openNotes.map((note, index) => <button type="button" key={note} aria-label={`第 ${6 - index} 弦 ${note}`} aria-pressed={selected === index} onClick={() => setSelected(index)} style={{ minWidth: 44, minHeight: 44 }} className={`string-lane ${selected === index ? 'current' : ''}`}>
        <span className="string-number">{6 - index}<span className="sr-only"> 弦</span></span>
        <span className="wire" style={{ width: Math.max(1, 3 - index * .4) }} />
        {selected === index ? <span className="current-reading"><span className="target-label">目标 {note}</span><strong className="note" aria-label="实际音高">{reading?.note ?? '—'}</strong><span className="cents" aria-label="音分偏差">{signedCents}</span><span className="unit">音分</span></span> : <span className="quiet-note">{note}</span>}
      </button>)}
    </section>
    <div className="tuning-scale" aria-label="音分参考刻度">
      <div className="scale-ticks" /><div className="in-tune-zone" style={{ left: `${50 - 250 / scaleLimit}%`, width: `${500 / scaleLimit}%` }} />
      {reading && <div className="needle" style={{ left: `${50 + reading.cents / scaleLimit * 50}%` }} />}
      <div className="scale-labels"><span>−{scaleLimit}</span><span>0</span><span>+{scaleLimit}</span></div>
    </div>
    <section className={`feedback ${inTune ? 'in-tune' : ''}`} aria-live="polite">
      <div className="status-line">{reading ? inTune ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" /> : session === 'listening' ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}<h2>{status}</h2></div>
      <p>{reading && !withinCents(reading.cents, 100) ? '请核对目标弦与调弦状态' : session === 'listening' ? `请单独拨第 ${6 - selected} 弦，保持声音清晰` : session === 'requesting' ? '请在浏览器提示中允许使用麦克风' : `拿好吉他，单独拨响第 ${6 - selected} 弦`}</p>
    </section>
    {error && <div className="error-box" role="alert"><CircleAlert size={20} aria-hidden="true" /><p>{error}</p></div>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="actions">{session === 'idle' ? <Button className="w-full" onClick={() => void start()}><Mic size={19} aria-hidden="true" />{error ? '重试麦克风' : '开始调音'}</Button> : <Button className="w-full" onClick={() => stop('调音已停止，麦克风已释放。')}><Square size={17} aria-hidden="true" />{session === 'requesting' ? '取消启动' : '停止调音'}</Button>}</div>
    <footer><p>请选择目标弦；仅核对音高，不能判断实际弦位。</p><p>音频仅在当前浏览器处理，不录音、不上传。</p></footer>
  </section>
}
