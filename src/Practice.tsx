import { useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Mic, Minus } from 'lucide-react'
import { PageActions } from './PageActions'
import { Button } from './components/ui/button'
import { listenForPitch, MicrophoneInput, microphoneError, type PitchReading } from './audio'
import { claimMicrophone, subscribeMicrophoneStop } from './audio-bus'
import { midiNote, openMidi, withinCents, type Chord, type PracticeRecord, type Settings, type StringResult } from './model'
import { downloadJson, recordFile } from './storage'

type Round = { id: string; chord: Chord; reference: number; results: (StringResult | null)[]; index: number }
export default function Practice({ chords, target, onTarget, settings, onActiveChange, onSave, onHistory, onUnsavedChange }: {
  chords: Chord[]; target: Chord; onTarget: (chord: Chord) => void; settings: Settings
  onUnsavedChange: (unsaved: boolean) => void; onActiveChange: (active: boolean) => void; onSave: (record: PracticeRecord) => void; onHistory: () => void
}) {
  const [round, setRound] = useState<Round | null>(null)
  const roundRef = useRef(round); roundRef.current = round
  const [reading, setReading] = useState<PitchReading | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState<PracticeRecord | null>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => { onUnsavedChange(completed !== null && !saved) }, [completed, saved, onUnsavedChange])
  const inputRef = useRef<MicrophoneInput | null>(null)
  const stopListener = useRef<(() => void) | null>(null)
  const release = useRef<(() => void) | null>(null)
  const onActiveRef = useRef(onActiveChange); onActiveRef.current = onActiveChange

  function stopCapture() {
    stopListener.current?.(); stopListener.current = null
    inputRef.current?.destroy(); inputRef.current = null
    release.current?.(); release.current = null
    setRequesting(false); setReading(null); onActiveRef.current(false)
  }
  function abandon(message: string) { stopCapture(); roundRef.current = null; setRound(null); setNotice(message) }
  useEffect(() => {
    const unsubscribe = subscribeMicrophoneStop(() => {
      if (inputRef.current) abandon('本轮未保存，请重新开始。')
    })
    const hidden = () => { if (document.hidden && inputRef.current) abandon('本轮未保存：页面进入后台，麦克风已释放。') }
    const leave = () => { if (inputRef.current) abandon('本轮未保存') }
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', leave)
    return () => { unsubscribe(); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', leave); stopListener.current?.(); inputRef.current?.destroy(); release.current?.() }
  }, [])
  function listen(input: MicrophoneInput, current: Round) {
    stopListener.current?.(); setReading(null)
    const index = current.index
    stopListener.current = listenForPitch(input, value => {
      if (inputRef.current !== input || roundRef.current?.id !== current.id || roundRef.current.index !== index) return
      setReading(value)
      if (!value) return
      const targetMidi = openMidi[index] + current.chord.frets[index]!
      const result: StringResult = { string: 6 - index, targetMidi, note: value.note, frequency: value.frequency, cents: value.cents, correct: value.note === midiNote(targetMidi) && withinCents(value.cents, 20) }
      setRound(previous => previous && previous.id === current.id ? { ...previous, results: previous.results.map((old, i) => i === index ? result : old) } : previous)
    }, { reference: current.reference, targetMidi: openMidi[index] + current.chord.frets[index]! })
  }
  async function start() {
    if (inputRef.current) return
    setError(''); setNotice(''); setCompleted(null); setSaved(false)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setError('请使用 HTTPS 或本机 localhost 并开启麦克风权限。'); return }
    const current: Round = { id: crypto.randomUUID(), chord: structuredClone(target), reference: settings.reference, results: target.frets.map((fret, i) => fret === null ? { string: 6 - i, targetMidi: null, note: null, frequency: null, cents: null, correct: null } : null), index: target.frets.findIndex(fret => fret !== null) }
    release.current = claimMicrophone()
    const input = new MicrophoneInput(); inputRef.current = input
    roundRef.current = current; setRound(current); onActiveRef.current(true); setRequesting(true)
    input.onInterrupted = () => { if (inputRef.current === input) { abandon('本轮未保存，麦克风已释放。'); setError('麦克风连接已中断，请检查输入设备后重试。') } }
    try {
      await input.init()
      if (inputRef.current !== input) { input.destroy(); return }
      if (document.hidden) { abandon('本轮未保存：页面已进入后台。'); return }
      setRequesting(false); listen(input, current)
    } catch (cause) {
      if (inputRef.current !== input) return
      abandon('本轮未保存'); setError(microphoneError(cause))
    }
  }
  function advance() {
    const current = roundRef.current
    if (!current || !current.results[current.index] || !inputRef.current) return
    const index = current.chord.frets.findIndex((fret, i) => i > current.index && fret !== null)
    if (index === -1) return
    const next = { ...current, index }; roundRef.current = next; setRound(next); listen(inputRef.current, next)
  }
  function remeasure() {
    const current = roundRef.current
    if (!current || !inputRef.current) return
    const next = { ...current, results: current.results.map((result, i) => i === current.index ? null : result) }
    roundRef.current = next; setRound(next); listen(inputRef.current, next)
  }
  function save(record: PracticeRecord) {
    try { onSave(record); setSaved(true); setError(''); setNotice('本轮已保存') }
    catch { setSaved(false); setError('保存失败：本轮未保存，请重试、导出本次结果或清理旧记录。') }
  }
  function finish() {
    const current = roundRef.current
    if (!current || current.results.some(result => result === null)) return
    const record: PracticeRecord = { id: current.id, practicedAt: new Date().toISOString(), chord: current.chord, reference: current.reference, results: current.results as StringResult[] }
    stopCapture(); roundRef.current = null; setRound(null); setCompleted(record); save(record)
  }
  const selected = round?.chord ?? target
  const activeResult = round?.results[round.index]
  const allMeasured = round !== null && round.results.every(result => result !== null)
  const correctLive = reading && activeResult?.correct
  const nextExists = round?.chord.frets.some((fret, i) => i > round.index && fret !== null)
  const progress = <section className="strings practice-strings" aria-label="逐弦检测进度">{selected.frets.map((fret, i) => <div key={i} className={`string-lane ${round?.index === i ? 'current' : ''}`}>
    <span className="string-number">{6 - i}</span><div className="wire" />
    <span className="quiet-note">{fret === null ? '不弹' : midiNote(openMidi[i] + fret)}</span>
    <span className="step-icon">{fret === null ? <Minus size={16} aria-label="未检测" /> : round?.results[i] ? round.results[i]!.correct ? <Check size={16} aria-label="符合目标" /> : <CircleAlert size={16} aria-label="音高不符" /> : '待测'}</span>
  </div>)}</section>
  function again() {
    if (!saved && !window.confirm('本轮结果尚未保存，确定放弃并再练一轮？')) return
    setCompleted(null); setError(''); setNotice('')
  }
  return <div className="panel practice-panel screen-layout">
    <div className="title-row"><h1>逐弦检测</h1><select aria-label="目标和弦" value={target.id} onChange={event => {
      const chord = chords.find(item => item.id === event.target.value)
      if (!chord) return
      if (completed && !saved && !window.confirm('本轮结果未保存，确定放弃并切换目标？')) return
      if (roundRef.current) abandon('已切换目标，本轮未保存。')
      onTarget(chord); setCompleted(null)
    }}>{chords.map(chord => <option key={chord.id} value={chord.id}>{chord.name}</option>)}</select></div>
    <p className="practice-meta muted">A4 {round?.reference ?? completed?.reference ?? settings.reference} Hz · 请一次只弹一根弦</p>
    {completed ? <>
      <div className="practice-result-body">
        <h2>本轮结果 · {completed.chord.name}</h2>
        <p>{completed.results.filter(result => result.correct === true).length}/{completed.results.filter(result => result.correct !== null).length} 根弦音高符合目标</p>
        <p role="status" className={saved ? 'success' : 'error-text'}>{saved ? '本轮已保存' : '本轮未保存，当前结果仍保留'}</p>
        {!saved && <p className="error-box" role="alert">{error}</p>}
        <ol className="result-list">{completed.results.map(result => <li key={result.string}><span>第 {result.string} 弦</span><span>{result.targetMidi === null ? '不弹／未检测' : `${midiNote(result.targetMidi)} · ${result.correct ? '音高符合目标 ✓' : '音高不符 !'}`}</span></li>)}</ol>
        {!saved && <div className="result-secondary-actions"><Button variant="outline" onClick={onHistory}>查看并清理旧记录</Button><Button variant="outline" onClick={again}>再练一轮</Button></div>}
      </div>
      <PageActions page="practice">{saved ? <Button className="primary-action" onClick={again}>再练一轮</Button> : <><Button className="primary-action" onClick={() => save(completed)}>重试保存</Button><Button variant="outline" onClick={() => downloadJson('guitar-learn-result.json', recordFile([completed]))}>导出本次结果</Button></>}</PageActions>
    </> : <>
      <div className="practice-work">
        {error ? <section className="error-state" role="alert"><CircleAlert aria-hidden="true" /><h2>无法使用麦克风</h2><p>{error}</p></section> : round ? <>
          <section className="practice-current">
            <p className="target-pitch">第 {6 - round.index} 弦 · 目标 {midiNote(openMidi[round.index] + round.chord.frets[round.index]!)}</p>
            <div className="live-pitch" aria-label="检测实际音高">{reading?.note ?? '—'}<small>{reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents.toFixed(1)} 音分` : ''}</small></div>
            <h2 className={correctLive ? 'success' : ''}>{requesting ? '等待麦克风授权' : reading ? correctLive ? '音高符合目标' : '音高不符' : '等待弹奏／请单独重弹'}</h2>
            <p className="practice-progress muted">{round.results.filter(result => result?.correct !== null && result !== null).length}/{round.chord.frets.filter(fret => fret !== null).length} 根发声弦已检测</p>
          </section>
          {progress}
          {activeResult && !reading && <p className="muted retained-result">本弦已有有效结果，可重测或继续。</p>}
        </> : <>{progress}<p className="practice-hint muted">仅检查音高，不验证手型、实际发声弦或消音。</p></>}
        {notice && <p className="notice" role="status">{notice}</p>}
      </div>
      <PageActions page="practice">{round ? <>
        {nextExists ? <Button className="primary-action" onClick={advance} disabled={!activeResult || requesting}>下一弦</Button> : <Button className="primary-action" onClick={finish} disabled={!allMeasured || requesting}>完成并保存</Button>}
        <Button variant="outline" onClick={remeasure} disabled={requesting}>重测本弦</Button><Button variant="outline" onClick={() => abandon('本轮未保存')}>退出本轮</Button>
      </> : <Button className="primary-action" onClick={() => void start()}><Mic size={18} aria-hidden="true" />{error ? '重试麦克风' : '开始逐弦检测'}</Button>}</PageActions>
    </>}
  </div>
}
