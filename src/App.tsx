import { useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Mic, MicOff, Square, Waves } from 'lucide-react'
import { Button } from './components/ui/button'
import { listenForE2, MicrophoneInput, microphoneError, type PitchReading } from './audio'

type Session = 'idle' | 'requesting' | 'listening'
export default function App() {
  const [session, setSession] = useState<Session>('idle')
  const [reading, setReading] = useState<PitchReading | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const active = useRef<MicrophoneInput | null>(null)
  const stopListening = useRef<(() => void) | null>(null)

  function stop(message = '') {
    stopListening.current?.()
    stopListening.current = null
    active.current?.destroy()
    active.current = null
    setReading(null)
    setSession('idle')
    setNotice(message)
  }

  useEffect(() => {
    const onHidden = () => { if (document.hidden && active.current) stop('调音已暂停，麦克风已释放。返回后请手动开始。') }
    const onLeave = () => stop()
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onLeave)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onLeave)
      stopListening.current?.()
      active.current?.destroy()
      active.current = null
    }
  }, [])

  async function start() {
    if (active.current) return
    setError('')
    setNotice('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('当前页面无法使用麦克风，请使用 HTTPS 安全连接或本机 localhost。')
      return
    }
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
      stopListening.current = listenForE2(input, setReading)
    } catch (cause) {
      if (active.current !== input) return
      input.destroy()
      active.current = null
      setSession('idle')
      setError(microphoneError(cause))
    }
  }

  const inTune = reading !== null && Math.abs(reading.cents) <= 5
  const status = reading ? inTune ? '已调准' : Math.abs(reading.cents) > 100 ? '偏离目标较大' : reading.cents < 0 ? '调高' : '调低' : session === 'listening' ? '等待弹奏' : session === 'requesting' ? '等待麦克风授权' : '准备调音'
  const signedCents = reading ? `${reading.cents > 0 ? '+' : ''}${Math.round(reading.cents)}` : '—'
  const scaleLimit = reading && Math.abs(reading.cents) > 50 ? Math.ceil(Math.abs(reading.cents) / 100) * 100 : 50

  return <main className="workbench">
    <header><div className="eyebrow"><Waves size={16} aria-hidden="true" /> GUITAR LEARN</div><span className="stage">音频验证 · 01</span></header>
    <div className="title-row"><h1>调音</h1><span className="mode">第 6 弦 · E2</span></div>
    <div className="subheading"><span>标准调弦</span><span>A4 <b>440</b> Hz</span></div>
    <section className="strings" aria-label="标准调弦，当前验证第 6 弦 E2">
      {['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].map((note, index) => <div key={note} className={`string-lane ${index === 0 ? 'current' : ''}`}>
        <span className="string-number">{6 - index}<span className="sr-only"> 弦</span></span>
        <div className="wire" style={{ width: Math.max(1, 3 - index * .4) }} />
        {index === 0 ? <div className="current-reading"><span className="target-label">目标 E2</span><strong className="note" aria-label="实际音高">{reading?.note ?? '—'}</strong><span className="cents" aria-label="音分偏差">{signedCents}</span><span className="unit">音分</span></div> : <span className="quiet-note">{note}</span>}
      </div>)}
    </section>
    <div className="tuning-scale" aria-label="音分参考刻度">
      <div className="scale-ticks" /><div className="in-tune-zone" style={{ left: `${50 - 250 / scaleLimit}%`, width: `${500 / scaleLimit}%` }} />
      {reading && <div className="needle" style={{ left: `${50 + reading.cents / scaleLimit * 50}%` }} />}
      <div className="scale-labels"><span>−{scaleLimit}</span><span>0</span><span>+{scaleLimit}</span></div>
    </div>
    <section className={`feedback ${inTune ? 'in-tune' : ''}`} aria-live="polite">
      <div className="status-line">{reading ? inTune ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" /> : session === 'listening' ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}<h2>{status}</h2></div>
      <p>{reading && Math.abs(reading.cents) > 100 ? '请核对目标弦与调弦状态' : session === 'listening' ? '请单独拨第 6 弦，保持声音清晰' : session === 'requesting' ? '请在浏览器提示中允许使用麦克风' : '拿好吉他，单独拨响最粗的一根弦'}</p>
    </section>
    {error && <div className="error-box" role="alert"><CircleAlert size={20} aria-hidden="true" /><p>{error}</p></div>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="actions">{session === 'idle' ? <Button className="w-full" onClick={() => void start()}><Mic size={19} aria-hidden="true" />{error ? '重试麦克风' : '开始调音'}</Button> : <Button className="w-full" onClick={() => stop('调音已停止，麦克风已释放。')}><Square size={17} aria-hidden="true" />{session === 'requesting' ? '取消启动' : '停止调音'}</Button>}</div>
    <footer><p>本阶段验证 E2 收音，其他弦暂不开放选择。</p><p>音频仅在当前浏览器处理，不录音、不上传。</p></footer>
  </main>
}
