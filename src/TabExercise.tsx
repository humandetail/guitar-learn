import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Play, Square } from 'lucide-react'
import { Button } from './components/ui/button'
import type { TabEvent, TabExerciseData } from './exercises'
import { playExercise, stopExerciseAudio } from './exercise-audio'
import './tab-exercise.css'

const fingerNames = ['', '食指', '中指', '无名指', '小指']
const stringNumbers = [1, 2, 3, 4, 5, 6]
const roles = { melody: '旋律', bass: '低音', fill: '填充音' }
const beatText = (beats: number) => beats === .5 ? '半' : String(beats)

function describeEvent(event: TabEvent) {
  if (!event.notes.length) return `休止 ${event.beats} 拍：轻触琴弦让声音停下来，继续数拍。`
  if (event.notes.every(note => note.role)) {
    const voices = event.notes.map(note => {
      const duration = note.sustainBeats ?? event.beats
      const timing = duration < event.beats ? `响${beatText(duration)}拍后止音` : `留${beatText(duration)}拍`
      return `${roles[note.role!]}：${note.string}弦${note.fret === 0 ? '空弦' : `${note.fret}品`}${note.finger ? `（${fingerNames[note.finger]}）` : ''}，${timing}`
    })
    return `${event.notes.length > 1 ? '同拨：' : ''}${voices.join('；')}。${beatText(event.beats)}拍后弹下一列。`
  }
  const positions = event.notes.map(note => `${note.role ? `${roles[note.role]}：` : ''}第 ${note.string} 弦${note.fret === 0 ? '空弦' : `第 ${note.fret} 品`}${note.finger ? `（${fingerNames[note.finger]}）` : ''}${note.sustainBeats && note.sustainBeats !== event.beats ? note.sustainBeats > event.beats ? `，保留 ${beatText(note.sustainBeats)} 拍` : `，响${beatText(note.sustainBeats)}拍后止音` : ''}`).join('、')
  if (event.notes.some(note => (note.sustainBeats ?? event.beats) !== event.beats)) return `${event.notes.length > 1 ? '同时拨响：' : '拨响：'}${positions}。${beatText(event.beats)}拍后弹下一列。`
  return `${event.chord ? `${event.chord} 和弦：` : event.notes.length > 1 ? '同时拨响：' : '拨响：'}${positions}。持续${event.beats === .5 ? '半拍' : ` ${event.beats} 拍`}${event.beats > 1 ? '，中途不重复拨弦' : ''}。`
}

function splitBars(exercise: TabExerciseData, maxColumns: number) {
  const bars: { bar: number; continuation: boolean; last: boolean; indices: number[] }[] = []
  let current: number[] = []
  let beats = 0
  let bar = exercise.startBar ?? 1
  function addBar() {
    for (let start = 0; start < current.length; start += maxColumns) {
      bars.push({ bar, continuation: start > 0, last: start + maxColumns >= current.length, indices: current.slice(start, start + maxColumns) })
    }
    current = []; beats = 0; bar++
  }
  exercise.events.forEach((event, index) => {
    if (beats && beats + event.beats > exercise.beatsPerBar) addBar()
    current.push(index); beats += event.beats
    if (beats >= exercise.beatsPerBar) addBar()
  })
  if (current.length) addBar()
  return bars
}

type Props = { exercise: TabExerciseData; reference: number; active: boolean; onBpmChange?: (bpm: number) => void; collapsibleHelp?: boolean }

function ExercisePanel({ exercise, reference, active, onBpmChange, collapsibleHelp }: Props) {
  const [selected, setSelected] = useState(0)
  const [bpm, setBpm] = useState(exercise.bpm)
  const [playback, setPlayback] = useState<'idle' | 'starting' | 'playing'>('idle')
  const [error, setError] = useState('')
  const [columns, setColumns] = useState(4)
  const score = useRef<HTMLDivElement>(null)
  const playbackControls = useRef<HTMLDivElement>(null)
  const stopPlayback = useRef<(() => void) | null>(null)
  const audioOwned = useRef(false)
  const generation = useRef(0)
  const speedId = useId()
  const titleId = useId()

  function cancelAudio() {
    generation.current++
    if (audioOwned.current) {
      audioOwned.current = false
      if (stopPlayback.current) stopPlayback.current()
      else stopExerciseAudio()
    }
    stopPlayback.current = null
  }
  function stop() { cancelAudio(); setPlayback('idle') }

  useEffect(() => {
    const element = score.current
    if (!element) return
    const resize = () => setColumns(Math.max(1, Math.min(4, Math.floor((element.clientWidth - 28) / 44))))
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (!active) stop() }, [active])
  useEffect(() => () => cancelAudio(), [])
  useEffect(() => {
    if (playback === 'playing') score.current?.querySelector('.tab-event.selected')?.closest('.tab-bar')?.scrollIntoView({ block: 'start' })
  }, [selected, playback])

  async function play() {
    if (!active || audioOwned.current) return
    const token = ++generation.current
    audioOwned.current = true
    playbackControls.current?.scrollIntoView({ block: 'start' })
    setError(''); setSelected(0); setPlayback('starting')
    let ended = false
    try {
      const cancel = await playExercise({
        exercise, bpm, reference,
        onEvent: index => { if (generation.current === token) { setSelected(index); setPlayback('playing') } },
        onEnd: () => {
          ended = true
          if (generation.current === token) { audioOwned.current = false; stopPlayback.current = null; setPlayback('idle') }
        },
      })
      if (generation.current !== token) { cancel(); return }
      if (!ended) { stopPlayback.current = cancel; setPlayback('playing') }
    } catch (cause) {
      if (generation.current !== token) return
      audioOwned.current = false; stopPlayback.current = null; setPlayback('idle')
      setError(cause instanceof Error ? cause.message : '示范声音无法启动，请重试。')
    }
  }
  function choose(index: number) {
    stop(); setSelected(index)
    requestAnimationFrame(() => score.current?.querySelector('.tab-event.selected')?.closest('.tab-bar')?.scrollIntoView({ block: 'start' }))
  }

  const event = exercise.events[selected]
  if (!event) return null
  const bars = splitBars(exercise, columns)
  const hasHalfBeats = exercise.events.some(event => event.beats % 1 !== 0)
  let count = 0
  const beatPositions = exercise.events.map(event => {
    const position = count % exercise.beatsPerBar
    count += event.beats
    return position % 1 ? `${Math.floor(position) + 1} 后半拍` : `第 ${position + 1} 拍`
  })
  const readingHint = <p className="tab-reading-hint">上 1 弦、下 6 弦；数字是品位，0 是空弦。从左往右弹，点一列看动作。</p>
  const speeds = [...new Set([40, 50, 60, 80, exercise.bpm])].sort((a, b) => a - b)
  return <section className={`tab-exercise${collapsibleHelp ? ' tab-exercise-compact-help' : ''}`} aria-labelledby={titleId}>
    <div className="tab-exercise-heading"><h3 id={titleId}>{exercise.title}</h3><span>4/4 拍</span></div>
    {exercise.description && <p className="tab-exercise-description">{exercise.description}</p>}
    {hasHalfBeats || collapsibleHelp ? <details className="tab-reading-help"><summary>{hasHalfBeats ? '六线谱与半拍读法' : '六线谱怎么读'}</summary>{readingHint}{hasHalfBeats && <p className="tab-reading-hint">一拍均匀数“1 和”：前半拍数数字，后半拍数“和”；1.5 拍是一拍半。列下拍数表示多久后进入下一列。</p>}</details> : readingHint}
    <div className="tab-playback-controls" ref={playbackControls}><label htmlFor={speedId}>示范速度<select id={speedId} value={bpm} onChange={e => { const value = Number(e.target.value); stop(); setBpm(value); onBpmChange?.(value) }}>{speeds.map(speed => <option value={speed} key={speed}>{speed} BPM</option>)}</select></label><Button onClick={playback === 'idle' ? () => void play() : stop}>{playback === 'idle' ? <Play size={18} aria-hidden="true" /> : <Square size={18} aria-hidden="true" />}{playback === 'idle' ? '播放合成示范' : playback === 'starting' ? '取消启动示范' : '停止示范'}</Button></div>
    <div className="tab-score" ref={score} aria-label={`${exercise.title}六线谱`}>
      {bars.map((row, rowIndex) => <div className="tab-bar" key={`${row.bar}-${rowIndex}`}>
        <p className="tab-bar-label">第 {row.bar} 小节{row.continuation ? '（接上一行）' : ''}</p>
        <div className={`tab-staff${row.last ? ' tab-bar-end' : ''}`} style={{ gridTemplateColumns: `28px ${row.indices.map(index => `minmax(44px, ${exercise.events[index].beats}fr)`).join(' ')}` } as CSSProperties}>
          <div className="tab-string-labels" aria-hidden="true">{stringNumbers.map(string => <span key={string}>{string} 弦</span>)}</div>
          {row.indices.map(index => {
            const noteEvent = exercise.events[index]
            return <button key={index} type="button" className={`tab-event${index === selected ? ' selected' : ''}`} aria-label={`第 ${index + 1} 个位置：${describeEvent(noteEvent)}`} aria-pressed={index === selected} onClick={() => choose(index)}>
              <span className="tab-event-lines" aria-hidden="true">{stringNumbers.map(string => {
                const note = noteEvent.notes.find(note => note.string === string)
                return <span className="tab-event-string" key={string}><i />{note && <strong data-role={note.role} title={note.role ? roles[note.role] : undefined}>{note.fret}</strong>}</span>
              })}</span>
              {!noteEvent.notes.length && <span className="tab-event-rest" aria-hidden="true">休止</span>}
              <span className="tab-event-length" aria-hidden="true">{beatText(noteEvent.beats)} 拍</span>
              {hasHalfBeats && <span className="tab-event-count" aria-hidden="true">{beatPositions[index]}</span>}
              {noteEvent.chord && <span className="tab-event-chord" aria-hidden="true">{noteEvent.chord}</span>}
              {noteEvent.lyric && <span className="tab-event-lyric" aria-hidden="true">{noteEvent.lyric}</span>}
            </button>
          })}
        </div>
        {row.indices.includes(selected) && <>
          <div className="tab-position" aria-live={playback === 'idle' ? 'polite' : 'off'}>
            <span className="tab-position-count">第 {selected + 1} / {exercise.events.length} 个位置{playback !== 'idle' ? ' · 合成示范中' : ''}</span>
            <p>{describeEvent(event)}</p>
            {event.lyric && <p className="tab-current-lyric">这一音唱「{event.lyric}」</p>}
          </div>
          <div className="tab-step-controls"><Button variant="outline" aria-label="前一音" disabled={selected === 0} onClick={() => choose(selected - 1)}><ChevronLeft size={18} aria-hidden="true" />前一音</Button><Button variant="outline" aria-label="后一音" disabled={selected === exercise.events.length - 1} onClick={() => choose(selected + 1)}>后一音<ChevronRight size={18} aria-hidden="true" /></Button></div>
        </>}
      </div>)}
    </div>
    {error && <p className="tab-exercise-error" role="alert">{error}</p>}
    <p className="tab-reference-note">示范使用合成音，帮助听音高与时值；不会检测你的弹奏。可以先逐音练，再跟示范连起来。</p>
  </section>
}

export default function TabExercise(props: Props) {
  return <ExercisePanel key={props.exercise.id} {...props} />
}
