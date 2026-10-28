import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronRight, Music2 } from 'lucide-react'
import { Button } from './components/ui/button'
import { PageActions } from './PageActions'
import ChordDiagram from './ChordDiagram'
import TabExercise from './TabExercise'
import { builtinChords } from './chords'
import type { Settings } from './model'
import type { TabEvent, TabExerciseData } from './exercises'
import { gradedRepertoire } from './graded-repertoire'
import { repertoireLevels, type GradedScore, type RepertoireLevel, type RepertoireRoute } from './repertoire-types'
import './repertoire.css'

type Props = { settings: Settings; active: boolean; onBack: () => void; onOpenLesson: (id: string) => void }
type ScoreMode = 'score' | 'accompaniment' | 'vocal'
type RouteFilter = 'all' | Exclude<RepertoireRoute, 'foundation'>
const routeNames = { foundation: '共同基础', singing: '弹唱', fingerstyle: '指弹' }

function chordEvent(name: string): TabEvent {
  const chord = builtinChords.find(item => item.name === name)!
  return {
    beats: 4,
    chord: name,
    notes: chord.frets.flatMap((fret, index) => fret === null ? [] : [{ string: 6 - index, fret, ...(chord.fingers?.[index] ? { finger: chord.fingers[index]! } : {}) }]),
  }
}

function SongScore({ song, settings, active, onBack, onOpenLesson }: Props & { song: GradedScore }) {
  const [mode, setMode] = useState<ScoreMode>('score')
  const [rangeStart, setRangeStart] = useState<number | null>(0)
  const [practiceBpm, setPracticeBpm] = useState(song.bpm)
  const screen = useRef<HTMLElement>(null)
  const controls = useRef<HTMLDivElement>(null)
  const rangeId = useId()
  const start = rangeStart ?? 0
  const end = rangeStart === null ? song.bars.length : Math.min(start + 2, song.bars.length)
  const rangeLabel = rangeStart === null ? `全曲 · ${song.bars.length} 小节` : `第 ${start + 1}–${end} 小节`
  const selectedBars = song.bars.slice(start, end)
  const chordNames = [...new Set(song.bars.map(bar => bar.chord))]
  const chords = chordNames.flatMap(name => {
    const chord = builtinChords.find(item => item.name === name)
    return chord ? [chord] : []
  })
  const isAccompaniment = mode === 'accompaniment' || (song.route === 'singing' && mode === 'score')
  const scoreName = mode === 'vocal' ? '旋律跟唱' : isAccompaniment ? '伴奏' : song.route === 'fingerstyle' ? '指弹' : '旋律'
  const exercise: TabExerciseData = {
    id: `repertoire-${song.id}-${mode}-${rangeStart ?? 'all'}`,
    title: `${scoreName} · ${rangeLabel}`,
    description: mode === 'accompaniment' ? '第 1 拍轻扫一次，数满四拍。示范为合成和弦，不含人声。' : mode === 'vocal' ? '跟随谱下文字唱；示范不含人声。' : '',
    bpm: practiceBpm,
    beatsPerBar: 4,
    startBar: start + 1,
    events: mode === 'vocal' && song.vocalBars ? song.vocalBars.slice(start, end).flat() : mode === 'accompaniment' ? selectedBars.map(bar => chordEvent(bar.chord)) : selectedBars.flatMap(bar => bar.events),
  }

  useEffect(() => {
    if (active) screen.current?.closest('.page-content')?.scrollTo(0, 0)
  }, [active])

  function showScore() {
    requestAnimationFrame(() => (screen.current?.querySelector('.tab-event.selected')?.closest('.tab-bar') ?? controls.current)?.scrollIntoView({ block: 'start' }))
  }
  function chooseRange(next: number | null) { setRangeStart(next); showScore() }
  function chooseMode(next: ScoreMode) { setMode(next); showScore() }

  return <section className="repertoire-screen repertoire-detail" ref={screen} aria-label={`${song.title}曲谱`}>
    <button className="learning-back" type="button" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />返回曲库</button>
    <div className="repertoire-song-heading"><p>L{song.level} · {song.subtitle}</p><h1>{song.title}</h1></div>
    <p className="repertoire-meta">{song.key} · {routeNames[song.route]} · 全曲 {song.bars.length} 小节</p>
    <div className="repertoire-score-controls" ref={controls}>
      {song.legacyAccompaniment && <div className="repertoire-modes" role="group" aria-label="曲谱类型">
        <button type="button" aria-pressed={mode === 'score'} onClick={() => chooseMode('score')}>旋律谱<span>先练 · 单音</span></button>
        <button type="button" aria-pressed={mode === 'accompaniment'} onClick={() => chooseMode('accompaniment')}>伴奏谱<span>后练 · 和弦</span></button>
      </div>}
      {song.vocalBars && <div className="repertoire-modes" role="group" aria-label="曲谱类型">
        <button type="button" aria-pressed={mode === 'score'} onClick={() => chooseMode('score')}>弹唱伴奏<span>弹伴奏 · 自己唱</span></button>
        <button type="button" aria-pressed={mode === 'vocal'} onClick={() => chooseMode('vocal')}>旋律跟唱<span>先找音 · 再配唱</span></button>
      </div>}
      {mode === 'accompaniment' && <p className="repertoire-mode-note">先练会 {chordNames.join('、')} 的按法与切换，再轻扫和弦、用“啦”哼旋律。</p>}
      <details className="repertoire-technique">
        <summary>开练前：{song.technique.title}</summary>
        <ol>{song.technique.steps.map(step => <li key={step}>{step}</li>)}</ol>
        {song.route === 'fingerstyle' && <p>蓝色数字是旋律，带下划线的是低音，浅色数字是填充音。标有延音时，弹下一列仍让前一音继续响；具体保留几拍，点谱面看动作说明。</p>}
      </details>
      {isAccompaniment && chords.length > 0 && <details className="repertoire-chords">
        <summary>查看 {chordNames.join(' / ')} 和弦指法</summary>
        <p>圆点里的数字是按弦手指：1 食指、2 中指、3 无名指、4 小指。○ 是空弦，× 的弦不要弹。{settings.leftHanded ? '指法图已按左手镜像显示，TAB 弦序不变。' : ''}</p>
        {chords.map(chord => <div className="repertoire-chord" key={chord.id}><h3>{chord.name}</h3><ChordDiagram chord={chord} settings={{ ...settings, showFingers: true }} compact showStringButtons={false} /><p>扫弦从第 {6 - chord.frets.findIndex(fret => fret !== null)} 弦开始；分解伴奏只拨谱面标出的弦。</p></div>)}
      </details>}
      {song.lyrics && <details className="repertoire-lyrics"><summary>{song.lyrics.title}</summary><p>{song.lyrics.note}</p><div>{song.lyrics.lines.map((line, index) => <p key={index}>{line}</p>)}</div><p>字与旋律的对应位置见“旋律跟唱”；伴奏谱显示手上要弹的音。</p></details>}
      <div className="repertoire-range"><label htmlFor={rangeId}>练习范围</label><select id={rangeId} value={rangeStart === null ? 'all' : String(rangeStart)} onChange={event => chooseRange(event.target.value === 'all' ? null : Number(event.target.value))}>
        <option value="all">全曲 · {song.bars.length} 小节</option>
        {Array.from({ length: Math.ceil(song.bars.length / 2) }, (_, index) => index * 2).map(bar => <option key={bar} value={bar}>第 {bar + 1}–{Math.min(bar + 2, song.bars.length)} 小节</option>)}
      </select></div>
    </div>
    <TabExercise key={exercise.id} exercise={exercise} reference={settings.reference} active={active} onBpmChange={setPracticeBpm} collapsibleHelp={!song.legacyAccompaniment} />
    <div className="repertoire-practice-notes"><h2>这一首怎么练</h2><p className="repertoire-focus">{song.focus}</p><ol>{song.tips.map(tip => <li key={tip}>{tip}</li>)}</ol></div>
    <div className="repertoire-readiness"><h2>练到这里，再往下走</h2><ul>{song.readiness.map(item => <li key={item}>{item}</li>)}</ul><p>按自己的实际弹奏检查；分级供学习安排参考，可以随时回头复习。</p></div>
    <div className="repertoire-prerequisites"><h2>需要时，回去复习</h2><div>{song.prerequisites.map(item => <button type="button" key={item.lessonId} onClick={() => onOpenLesson(item.lessonId)}>{item.label}<ArrowRight size={16} aria-hidden="true" /></button>)}{mode === 'accompaniment' && <button type="button" onClick={() => onOpenLesson('singing')}>第一次边弹边唱<ArrowRight size={16} aria-hidden="true" /></button>}</div></div>
    <details className="repertoire-source"><summary>来源与版本</summary><p>{song.sourceNote}</p><ul>{song.source.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></details>
    <PageActions page="learn">{rangeStart === null ? <><Button variant="outline" onClick={onBack}>返回曲库</Button><Button className="primary-action" onClick={() => chooseRange(0)}>从头分段练<ArrowRight size={18} aria-hidden="true" /></Button></> : <>{start === 0 && !song.legacyAccompaniment ? <Button variant="outline" onClick={showScore}>看谱练习</Button> : <Button variant="outline" disabled={start === 0} onClick={() => chooseRange(Math.max(0, start - 2))}><ArrowLeft size={18} aria-hidden="true" />上一段</Button>}<Button className="primary-action" onClick={() => chooseRange(end === song.bars.length ? null : end)}>{end === song.bars.length ? '查看全曲' : '下一段'}<ArrowRight size={18} aria-hidden="true" /></Button></>}</PageActions>
  </section>
}

export default function Repertoire(props: Props) {
  const [songId, setSongId] = useState<string | null>(null)
  const [route, setRoute] = useState<RouteFilter>('all')
  const [level, setLevel] = useState<RepertoireLevel | 'all'>('all')
  const screen = useRef<HTMLElement>(null)
  const libraryScroll = useRef(0)
  const levelId = useId()
  const song = gradedRepertoire.find(item => item.id === songId)
  const routeScores = gradedRepertoire.filter(item => route === 'all' || item.route === 'foundation' || item.route === route)
  const visibleLevels = repertoireLevels.filter(item => routeScores.some(score => score.level === item.level))
  const visibleScores = routeScores.filter(item => level === 'all' || item.level === level)
  useEffect(() => {
    if (props.active && !songId) screen.current?.closest('.page-content')?.scrollTo(0, libraryScroll.current)
  }, [props.active, songId])
  function openScore(id: string) {
    libraryScroll.current = screen.current?.closest('.page-content')?.scrollTop ?? 0
    setSongId(id)
  }
  function chooseRoute(next: RouteFilter) {
    setRoute(next)
    if (level !== 'all' && !gradedRepertoire.some(item => item.level === level && (next === 'all' || item.route === 'foundation' || item.route === next))) setLevel('all')
  }
  if (song) return <SongScore key={song.id} {...props} song={song} onBack={() => setSongId(null)} />
  return <section className="repertoire-screen" ref={screen} aria-label="分级曲库">
    <button className="learning-back" type="button" onClick={props.onBack}><ArrowLeft size={18} aria-hidden="true" />返回课程</button>
    <div className="repertoire-title"><Music2 size={24} aria-hidden="true" /><h1>分级曲库</h1></div>
    <p className="repertoire-intro">零基础从 L1 开始，同一首歌逐级练习。</p>
    <div className="repertoire-filters">
      <div className="repertoire-route-filter" role="group" aria-label="学习路线">{([{ value: 'all', label: '全部' }, { value: 'singing', label: '弹唱' }, { value: 'fingerstyle', label: '指弹' }] as const).map(item => <button key={item.value} type="button" aria-pressed={route === item.value} onClick={() => chooseRoute(item.value)}>{item.label}</button>)}</div>
      <div className="repertoire-range"><label htmlFor={levelId}>学习阶段</label><select id={levelId} value={level} onChange={event => setLevel(event.target.value === 'all' ? 'all' : Number(event.target.value) as RepertoireLevel)}><option value="all">全部阶段</option>{visibleLevels.map(item => <option key={item.level} value={item.level}>L{item.level} · {item.title}</option>)}</select></div>
      <p className="repertoire-filter-note" aria-live="polite">{route === 'all' ? `${new Set(visibleScores.map(item => item.songId)).size} 首旋律 · ${visibleScores.length} 份编配` : `含 L1 共同基础 · ${visibleScores.length} 份编配`}</p>
    </div>
    {visibleLevels.filter(item => level === 'all' || level === item.level).map(stage => <section className="repertoire-stage" key={stage.level} aria-labelledby={`repertoire-level-${stage.level}`}>
      <div className="repertoire-stage-heading"><h2 id={`repertoire-level-${stage.level}`}><span>L{stage.level}</span>{stage.title}</h2><p>{stage.goal}</p></div>
      <ol className="repertoire-list">{visibleScores.filter(item => item.level === stage.level).map((item, index) => <li key={item.id}><button type="button" onClick={() => openScore(item.id)} aria-label={item.legacyAccompaniment ? `练习${item.title}` : `练习${item.title}·${item.subtitle}`}><span className="repertoire-order">{String(index + 1).padStart(2, '0')}</span><span className="repertoire-list-copy"><strong>{item.title}</strong><span className="repertoire-list-version">{item.subtitle} · {item.bars.length} 小节</span><span>{item.summary}</span><small>先会：{item.prerequisites.map(prerequisite => prerequisite.label).join('、')}</small></span><ChevronRight size={18} aria-hidden="true" /></button></li>)}</ol>
    </section>)}
    <p className="repertoire-library-note">L1 是共同基础；弹唱走 L2 → L3。指弹先学会课程里的和弦与分解伴奏，再练 L4 → L5。等级表示本项目编配的学习顺序，不是考级级别。</p>
    <PageActions page="learn"><Button variant="outline" onClick={props.onBack}>返回课程</Button>{visibleScores[0] && <Button className="primary-action" onClick={() => openScore(visibleScores[0].id)}>开始 L{visibleScores[0].level}<ArrowRight size={18} aria-hidden="true" /></Button>}</PageActions>
  </section>
}
