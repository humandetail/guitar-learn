import { Fragment, Suspense, lazy, useEffect, useRef, useState, type ComponentType, type KeyboardEvent, type PointerEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { registerReferenceStop } from './audio-bus'
import { ExperienceAudio, type Strike } from './experience-audio'
import { stopExerciseAudio } from './exercise-audio'
import { midiNote, openMidi, type Settings } from './model'
import { stopReferenceAudio } from './reference-audio'
import ChordDiagram from './ChordDiagram'
import { builtinChords } from './chords'
import { stringNumbers, updateSweep, type Sweep, type SweepCursor } from './experience-strings'
import { experienceConcepts, experienceSamples, type ExperienceConcept } from './experience-content'
import { GuitarAnatomy } from './BeginnerDiagrams'
import { guitarParts } from './guitar-parts'
import type { LessonTool } from './lesson-types'
import ExperienceChallenges, { type GuitarInput } from './ExperienceChallenges'
import type { ChallengeId } from './experience-progress'
import type { GuitarSceneProps } from './GuitarScene'
import './guitar-experience.css'

const fretRanges = [[0, 1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]
const chords = ['C', 'G', 'Am', 'Em'].map(name => builtinChords.find(chord => chord.name === name)!)
const chordKeys: Record<string, string> = { c: 'C', g: 'G', a: 'Am', e: 'Em' }
export type ExperienceEntry = 'home' | 'open' | 'frets'
const rooms = { listen: '听一听', anatomy: '认识它', play: '弹一弹', challenge: '闯关学', real: '真琴提示' }
type Room = keyof typeof rooms
type Props = {
  settings: Settings; active: boolean; entry: ExperienceEntry; onBack: () => void
  onOpenLesson: (id: string) => void; onOpenTool: (tool: LessonTool) => void; onOpenRepertoire: () => void
}
function UnavailableScene({ onUnavailable }: GuitarSceneProps) {
  useEffect(() => onUnavailable(), [onUnavailable])
  return null
}
const GuitarScene = lazy<ComponentType<GuitarSceneProps>>(() => import('./GuitarScene').catch(() => ({ default: UnavailableScene })))

export default function GuitarExperience({ settings, active, entry, onBack, onOpenLesson, onOpenTool, onOpenRepertoire }: Props) {
  const [audio] = useState(() => new ExperienceAudio())
  const [room, setRoom] = useState<Room>('play')
  const [challenge, setChallenge] = useState<ChallengeId | null>(null)
  const [concept, setConcept] = useState<ExperienceConcept | null>(entry === 'home' ? null : entry)
  const [part, setPart] = useState(guitarParts[0])
  const [view, setView] = useState<'flat' | '3d'>('flat')
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneError, setSceneError] = useState(false)
  const [frets, setFrets] = useState<(number | null)[]>(() => stringNumbers.map(() => 0))
  const [range, setRange] = useState(0)
  const [feedback, setFeedback] = useState({ text: '点一根弦，听它的声音。', strings: [] as number[] })
  const [chordName, setChordName] = useState<string | null>(null)
  const [audioError, setAudioError] = useState('')
  const [sample, setSample] = useState<string | null>(null)
  const [sampleNotice, setSampleNotice] = useState('选择一种弹法试听。')
  const sampleRequest = useRef<{ name: string } | null>(null)
  const screen = useRef<HTMLElement>(null)
  const input: GuitarInput = useRef(null)
  const gesture = useRef<(SweepCursor & { id: number }) | null>(null)

  useEffect(() => {
    const stop = () => stopPlayback()
    const hide = () => { if (document.hidden) stop() }
    const unsubscribe = registerReferenceStop(stop)
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', stop)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('pagehide', stop)
      audio.close()
    }
  }, [audio])
  useEffect(() => { if (!active) stopPlayback() }, [active, audio])
  useEffect(() => { if (active) screen.current?.closest('.page-content')?.scrollTo(0, 0) }, [active])

  function stopPlayback() {
    if (sampleRequest.current) {
      sampleRequest.current = null
      setSample(null)
      setSampleNotice('试听已停止')
    }
    audio.stop()
  }

  function go(next: Room) {
    if (next === room) return
    stopPlayback()
    stopExerciseAudio()
    setAudioError('')
    if (next === 'listen' || next === 'real' || (next === 'challenge' && challenge === null)) setSceneReady(false)
    setRoom(next)
  }

  async function listen(example: typeof experienceSamples[number]) {
    if (!active) return
    if (sampleRequest.current?.name === example.name) { stopPlayback(); return }
    stopPlayback()
    stopReferenceAudio()
    stopExerciseAudio()
    setAudioError('')
    const request = { name: example.name }
    sampleRequest.current = request
    setSample(example.name)
    setSampleNotice(`正在播放${example.name}`)
    try {
      const started = await audio.play(example.notes, settings.reference, { onEnd: () => {
        if (sampleRequest.current !== request) return
        sampleRequest.current = null
        setSample(null)
        setSampleNotice('试听已结束')
      } })
      if (!started && sampleRequest.current === request) stopPlayback()
    } catch {
      if (sampleRequest.current !== request) return
      stopPlayback()
      setAudioError('示范声音无法启动，请检查浏览器声音设置后重试。')
    }
  }

  async function playStrings(order: number[], sweep?: Sweep) {
    if (!active) return
    const notes: Strike[] = []
    for (const string of order) {
      const fret = frets[6 - string]
      if (fret !== null) notes.push({ string, fret, delay: notes.length * (sweep?.gesture ? .008 : .024) })
    }
    if (!notes.length) {
      if (!sweep) setFeedback({ text: `第 ${order[0]} 弦 · 不弹`, strings: [] })
      return
    }
    if (sampleRequest.current) stopPlayback()
    setAudioError('')
    stopReferenceAudio()
    stopExerciseAudio()
    const strokeAt = sweep?.gesture ? sweep.startedAt : sweep ? performance.now() : undefined
    input.current?.({ notes, stroke: Boolean(sweep), strokeAt, chord: chordName })
    try {
      if (!await audio.play(notes, settings.reference, { sweep: Boolean(sweep) })) return
      const { string, fret } = notes[0]
      const description = sweep ? `扫弦 · ${notes.map(note => note.string).join(' → ')} 弦` : `第 ${string} 弦 · ${fret === 0 ? '空弦' : `第 ${fret} 品`} · ${midiNote(openMidi[6 - string] + fret)}`
      setFeedback({ text: description, strings: notes.map(note => note.string) })
    } catch { setAudioError('声音无法启动，请检查浏览器声音设置，再拨一次。') }
  }

  const strings = settings.leftHanded ? [...stringNumbers].reverse() : stringNumbers
  const visibleFrets = fretRanges[range]
  const selectedChord = chords.find(chord => chord.name === chordName)
  const openOnly = room === 'play' && (concept === 'open' || concept === 'strings')
  const canShowView = room === 'play' || room === 'anatomy' || (room === 'challenge' && challenge !== null)
  function chooseView(next: typeof view) {
    if (next === view) return
    setSceneReady(false)
    setSceneError(false)
    setView(next)
  }
  function press(string: number, fret: number) {
    if ((frets[6 - string] ?? -1) === 0 && fret === 0) return
    setChordName(null)
    setFrets(previous => previous.map((value, index) => index === 6 - string ? value === fret ? 0 : fret : value))
  }
  function selectChord(name: string | null) {
    setChordName(name)
    setFrets(chords.find(chord => chord.name === name)?.frets ?? stringNumbers.map(() => 0))
    setRange(0)
  }
  function chooseConcept(next: ExperienceConcept | null) {
    setConcept(next)
    if (next === 'strings' || next === 'open' || next === 'frets') selectChord(null)
  }
  function chooseChallenge(next: ChallengeId) {
    if (challenge === next) return
    stopPlayback()
    stopExerciseAudio()
    selectChord(null)
    setChallenge(next)
  }
  function sweepPosition(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    return (event.clientX - box.left) / box.width * stringNumbers.length
  }
  function startSweep(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || gesture.current) return
    audio.unlock()
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { id: event.pointerId, position: sweepPosition(event), direction: 0, struck: 0 }
  }
  function moveSweep(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current
    if (!current || current.id !== event.pointerId) return
    const crossed = updateSweep(current, sweepPosition(event), strings, frets)
    if (crossed.strings.length) void playStrings(crossed.strings, { gesture: true, startedAt: crossed.startedAt })
  }
  function endSweep(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id === event.pointerId) gesture.current = null
  }
  function onKeys(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || target.closest('input, select, textarea, [contenteditable]')) return
    const key = event.key.toLowerCase()
    if (/^[1-6]$/.test(key)) { event.preventDefault(); void playStrings([Number(key)]) }
    if (openOnly) return
    if (key === ' ' && !target.closest('button')) { event.preventDefault(); void playStrings(stringNumbers, {}) }
    if (Object.hasOwn(chordKeys, key)) { event.preventDefault(); selectChord(chordKeys[key]) }
  }

  return <section className="guitar-experience" aria-label="吉他体验馆" ref={screen}>
    <div className="experience-heading"><button type="button" className="learning-back" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />{entry === 'home' ? '返回学习' : '返回课程'}</button><h1>吉他体验馆</h1></div>
    <nav className="experience-rooms segmented" aria-label="吉他体验活动">
      {(Object.entries(rooms) as [Room, string][]).map(([id, label]) => <button type="button" key={id} aria-current={room === id ? 'page' : undefined} onClick={() => go(id)}>{label}</button>)}
    </nav>
    {room === 'listen' && <section className="experience-card">
      <h2>三种吉他声音</h2>
      <div className="experience-options">
        {experienceSamples.map(example => <article key={example.name}><h3>{example.name}</h3><p>{example.description}</p><button type="button" className="learning-tool-button" onClick={() => void listen(example)}>{sample === example.name ? '停止' : '播放'}{example.name}</button></article>)}
      </div>
      <p className="experience-instruction" role="status" aria-label="试听状态">{sampleNotice}</p>
      {audioError && <p className="error-text" role="alert">{audioError}</p>}
    </section>}
    {room === 'real' && <section className="experience-card">
      <h2>拿真琴时怎么练</h2>
      <div className="experience-options">
        <article><h3>按弦有杂音</h3><p>指尖靠近品丝，再逐根拨。听到打品或闷音时，先挪一点位置再试。</p><button type="button" className="learning-tool-button" onClick={() => onOpenLesson('single-notes')}>练习弹清单音</button></article>
        <article><h3>换和弦卡拍</h3><p>给换指留足拍数，先用低速在两个和弦间来回换，再慢慢加速。</p><button type="button" className="learning-tool-button" onClick={() => onOpenLesson('chord-changes')}>打开换和弦课程</button><button type="button" className="learning-tool-button" onClick={() => onOpenTool({ target: 'metronome', label: '打开节拍器', returnLabel: '返回吉他体验馆' })}>打开节拍器</button></article>
        <article><h3>音高听起来不对</h3><p>沿每根弦找到对应琴钮，逐根调到标准空弦音。</p><button type="button" className="learning-tool-button" onClick={() => onOpenTool({ target: 'tuner', label: '打开调音器', returnLabel: '返回吉他体验馆' })}>打开调音器</button></article>
        <article><h3>拿琴不稳</h3><p>让琴身靠住身体，放松肩膀，把按弦手腾出来。</p><button type="button" className="learning-tool-button" onClick={() => onOpenLesson('guitar-basics')}>查看持琴步骤</button></article>
      </div>
      <button type="button" className="learning-tool-button" onClick={onOpenRepertoire}>去分级曲库练琴</button>
    </section>}
    <ExperienceChallenges selected={challenge} active={active && room === 'challenge'} reference={settings.reference} input={input}
      onSelect={chooseChallenge} stopSound={() => { stopPlayback(); stopExerciseAudio() }} resetGuitar={() => selectChord(null)} onOpenRepertoire={onOpenRepertoire}
      rhythmActions={{ chord: chordName, selectChord, strum: () => void playStrings(stringNumbers, {}) }} />
    {canShowView && <>
      <div className="experience-views segmented" role="group" aria-label="琴面视图">
        <button type="button" aria-pressed={view === 'flat'} onClick={() => chooseView('flat')}>2D 琴面</button>
        <button type="button" aria-pressed={view === '3d'} onClick={() => chooseView('3d')}>3D 展台</button>
      </div>
      {sceneError && <p className="experience-instruction" role="status">3D 展台暂时无法加载，可以继续用 2D 弹奏。</p>}
      {view === '3d' && <Suspense fallback={<p className="experience-instruction" role="status">正在加载 3D 展台，可先用下面的 2D 控件。</p>}>
        <GuitarScene leftHanded={settings.leftHanded} part={room === 'anatomy' ? part.id : null} frets={frets} struck={feedback.strings} openOnly={openOnly}
          onPart={id => { const selected = guitarParts.find(item => item.id === id); if (selected) setPart(selected) }} onPress={press}
          onPlay={(order, sweep) => void playStrings(order, sweep)} onGesture={() => audio.unlock()} onReady={() => setSceneReady(true)}
          onUnavailable={() => { setSceneReady(false); setSceneError(true); setView('flat') }} />
      </Suspense>}
    </>}
    {room === 'anatomy' && <GuitarAnatomy part={part} onSelect={setPart} leftHanded={settings.leftHanded} showDiagram={view === 'flat' || !sceneReady} />}
    <div hidden={room !== 'play' && !(room === 'challenge' && challenge)} className="experience-play">
      {room === 'play' && <div className="experience-concepts segmented" role="group" aria-label="按概念试弹">
        <button type="button" aria-pressed={concept === null} onClick={() => chooseConcept(null)}>自由弹</button>
        {(Object.entries(experienceConcepts) as [ExperienceConcept, typeof experienceConcepts.open][]).map(([id, content]) => <button type="button" key={id} aria-pressed={concept === id} onClick={() => chooseConcept(id)}>{content.title}</button>)}
      </div>}
    <div className="experience-instrument" role="group" aria-label="弹奏区" tabIndex={0} onKeyDown={onKeys}>
      <h2>{room === 'challenge' ? '琴面' : concept ? experienceConcepts[concept].title : '自由弹'}</h2>
      {room === 'play' && concept && <p className="experience-instruction">{experienceConcepts[concept].instruction}</p>}
      <div className="experience-strings" role="group" aria-label="拨弦">
        {strings.map(string => {
          const fret = frets[6 - string]
          return <button type="button" key={string} className={feedback.strings.includes(string) ? 'struck' : ''} aria-label={`拨第 ${string} 弦`} onClick={() => void playStrings([string])}>
            <strong>{string} 弦</strong><span>{fret === null ? '×' : midiNote(openMidi[6 - string] + fret)}</span>
          </button>
        })}
      </div>
      <p role="status" aria-label="弹奏反馈" className="experience-feedback">{feedback.text}</p>
      {audioError && <p className="error-text" role="alert">{audioError}</p>}
      {!openOnly && <>
        <div className="experience-sweeps" role="group" aria-label="扫弦操作">
          <button type="button" onClick={() => void playStrings(stringNumbers, {})}>向下扫弦</button>
          <button type="button" onClick={() => void playStrings([...stringNumbers].reverse(), {})}>向上扫弦</button>
        </div>
        <div className="experience-sweep-pad" role="img" aria-label="扫弦区，横划琴弦" onPointerDown={startSweep} onPointerMove={moveSweep} onPointerUp={event => { audio.unlock(); moveSweep(event); endSweep(event) }} onPointerCancel={endSweep} onLostPointerCapture={endSweep}>
          {strings.map(string => <span key={string} className={feedback.strings.includes(string) ? 'struck' : ''} aria-hidden="true"><i />{string}</span>)}
        </div>
        <div className="experience-chords segmented" role="group" aria-label="选择和弦">
          <button type="button" aria-pressed={frets.every(fret => fret === 0)} onClick={() => selectChord(null)}>恢复空弦</button>
          {chords.map(chord => <button type="button" key={chord.id} aria-label={`选择 ${chord.name} 和弦`} aria-pressed={chord.name === chordName} onClick={() => selectChord(chord.name)}>{chord.name}</button>)}
        </div>
        <div className="experience-fret-ranges" role="group" aria-label="指板把位">{fretRanges.map((frets, index) => <button type="button" key={index} aria-pressed={range === index} onClick={() => setRange(index)}>{frets[0]}–{frets.at(-1)} 品</button>)}</div>
        <div role="group" aria-label="指板" className="experience-fretboard" style={{ gridTemplateColumns: `28px repeat(${visibleFrets.length}, minmax(44px, 1fr))` }}>
          <span aria-hidden="true">弦</span>{visibleFrets.map(fret => <span key={fret} aria-hidden="true">{fret === 0 ? '空弦' : fret}</span>)}
          {strings.map(string => <Fragment key={string}><span aria-hidden="true">{string}</span>{visibleFrets.map(fret => <button type="button" key={fret} aria-label={fret === 0 ? `第 ${string} 弦空弦` : `第 ${string} 弦第 ${fret} 品`} aria-pressed={fret === frets[6 - string]} onClick={() => press(string, fret)}><span aria-hidden="true">{fret === frets[6 - string] ? '●' : ''}</span></button>)}</Fragment>)}
        </div>
        {selectedChord && <ChordDiagram chord={selectedChord} settings={settings} compact showStringButtons={false} />}
        <p className="experience-instruction">键盘 1–6 拨弦，聚焦弹奏区后按空格扫弦，C / G / A / E 换和弦。</p>
      </>}
    </div>
    </div>
  </section>
}
