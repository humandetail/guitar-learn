import { useEffect, useRef, useState, type RefObject } from 'react'
import { Button } from './components/ui/button'
import TabExercise from './TabExercise'
import type { Strike } from './experience-audio'
import { twinkle } from './experience-content'
import { challengeNames, readExperienceProgress, saveExperienceProgress, type ChallengeId } from './experience-progress'
import { stringNumbers } from './experience-strings'
import type { TabEvent, TabExerciseData } from './exercises'
import RhythmChallenge, { type RhythmActions } from './RhythmChallenge'

export type PlayedGuitar = { notes: Strike[]; stroke: boolean; strokeAt?: number; chord: string | null }
export type GuitarInput = RefObject<((input: PlayedGuitar) => void) | null>

const basics: TabEvent[] = [...stringNumbers.map(string => ({ string, fret: 0 })), { string: 1, fret: 1 }, { string: 1, fret: 2 }]
  .map(note => ({ notes: [note], beats: 1 }))
const melody = twinkle.bars.flatMap(bar => bar.events)
const phraseLength = twinkle.bars[0].events.length + twinkle.bars[1].events.length
const firstPhrase = melody.slice(0, phraseLength)

function initialProgress() {
  try { return { passed: readExperienceProgress(), message: '' } }
  catch { return { passed: [], message: '体验馆进度无法读取，已保留原数据。仍可在本次会话练习。' } }
}

function noteText(note: Strike) { return `第 ${note.string} 弦${note.fret === 0 ? '空弦' : `第 ${note.fret} 品`}` }

function NoteChallenge({ id, active, reference, input, onPass, stopSound, resetGuitar, onOpenRepertoire }: {
  id: 'basics' | 'melody'; active: boolean; reference: number; input: GuitarInput; onPass: () => void
  stopSound: () => void; resetGuitar: () => void; onOpenRepertoire: () => void
}) {
  const [range, setRange] = useState<'phrase' | 'song'>('phrase')
  const [index, setIndex] = useState(0)
  const [message, setMessage] = useState('')
  const [scoreOpen, setScoreOpen] = useState(false)
  const cursor = useRef(0)
  const events = id === 'basics' ? basics : range === 'phrase' ? firstPhrase : melody
  const target = events[index]
  const done = index === events.length

  useEffect(() => {
    if (!active) return
    input.current = ({ notes, stroke }) => {
      const expected = events[cursor.current]?.notes[0]
      if (!expected || !notes.length) return
      const note = notes[0]
      if (stroke || notes.length !== 1 || note.string !== expected.string || note.fret !== expected.fret) {
        setMessage(`请拨${noteText(expected)}${stroke ? '，这一音请单独拨。' : `，刚才弹的是${noteText(note)}。`}`)
        return
      }
      const next = ++cursor.current
      setIndex(next)
      if (next < events.length) { setMessage(''); return }
      if (id === 'melody' && range === 'phrase') { setMessage('两小节练完了，可以再练一次或挑战整首。'); return }
      setMessage('本关通过 · 你完成了屏幕上的弹奏练习。')
      onPass()
    }
    return () => { input.current = null }
  }, [active, events, id, input, onPass, range])

  function reset(next: typeof range) {
    stopSound()
    resetGuitar()
    cursor.current = 0
    setRange(next)
    setIndex(0)
    setMessage('')
  }

  let score: TabExerciseData | null = null
  let position = 0
  if (id === 'melody') {
    const current = Math.min(index, events.length - 1)
    let startBar = 0
    let before = 0
    while (current >= before + twinkle.bars[startBar].events.length) before += twinkle.bars[startBar++].events.length
    const pair = startBar - startBar % 2
    if (pair !== startBar) before -= twinkle.bars[pair].events.length
    const bars = twinkle.bars.slice(pair, pair + 2)
    position = current - before
    score = { id: `experience-twinkle-${range}-${pair}`, title: `《小星星》第 ${pair + 1}–${pair + bars.length} 小节`, description: '', bpm: twinkle.bpm, beatsPerBar: 4, startBar: pair + 1, events: bars.flatMap(bar => bar.events) }
  }

  return <>
    <h2>{challengeNames[id]}</h2>
    {id === 'basics' && <p className="experience-instruction">先从第 6 弦拨到第 1 弦，再按第 1 弦的第 1、2 品。</p>}
    {id === 'melody' && <p className="experience-instruction">先练两小节。相同音要分别拨，句尾长音拨一次后数满时值。</p>}
    <p className="experience-target" role="status" aria-label="当前目标">{target ? `${index + 1} / ${events.length} · ${noteText(target.notes[0])}${id === 'melody' ? ` · ${target.beats} 拍` : ''}` : `${events.length} / ${events.length} · 已完成`}</p>
    <p className="experience-instruction" role="status" aria-label="关卡反馈">{message}</p>
    <div className="experience-challenge-actions">
      <Button variant="outline" onClick={() => reset(range)}>{range === 'song' ? '重练整首' : id === 'melody' ? '重练两小节' : '重练本关'}</Button>
      {id === 'melody' && range === 'phrase' && done && <Button onClick={() => reset('song')}>挑战整首</Button>}
      {id === 'melody' && range === 'song' && <Button variant="outline" onClick={() => reset('phrase')}>回到两小节</Button>}
      {id === 'melody' && range === 'song' && done && <Button variant="outline" onClick={onOpenRepertoire}>去分级曲库练琴</Button>}
    </div>
    {score && <details className="experience-score" onToggle={event => setScoreOpen(event.currentTarget.open)}>
      <summary>查看六线谱与试听</summary>
      <TabExercise exercise={score} reference={reference} active={active && scoreOpen} interactivePractice={{ position, onDemoStart: stopSound }} />
    </details>}
  </>
}

export default function ExperienceChallenges({ selected, active, reference, input, onSelect, stopSound, resetGuitar, onOpenRepertoire, rhythmActions }: {
  selected: ChallengeId | null; active: boolean; reference: number; input: GuitarInput
  onSelect: (id: ChallengeId) => void; stopSound: () => void; resetGuitar: () => void; onOpenRepertoire: () => void; rhythmActions: RhythmActions
}) {
  const [progress, setProgress] = useState(initialProgress)

  function persist(passed: ChallengeId[]) {
    try { setProgress({ passed: saveExperienceProgress(passed), message: '' }) }
    catch { setProgress({ passed, message: '体验馆进度未保存到浏览器。当前通过结果仍保留，可以重试保存。原有数据未覆盖。' }) }
  }

  return <div hidden={!active} className="experience-challenges">
    <section className="experience-card" aria-label="关卡目录">
      <div className="experience-challenge-heading"><h2>闯关学</h2><span>通过 {progress.passed.length} / 3</span></div>
      <div className="experience-levels">
        {(Object.entries(challengeNames) as [ChallengeId, string][]).map(([id, name]) =>
          <button type="button" key={id} aria-label={name} aria-pressed={selected === id} onClick={() => onSelect(id)}>{name}{progress.passed.includes(id) && <span>已通过</span>}</button>)}
      </div>
      {progress.message && <p role="alert" className="error-text">{progress.message} <button type="button" className="learning-tool-button" onClick={() => persist(progress.passed)}>重试保存</button></p>}
    </section>
    {selected && <section className="experience-card experience-challenge" aria-label="当前关卡">
      {selected === 'rhythm' ? <RhythmChallenge active={active} input={input} actions={rhythmActions} onPass={() => persist([...new Set([...progress.passed, selected])])} /> : <NoteChallenge key={selected}
        id={selected} active={active} reference={reference} input={input} onPass={() => persist([...new Set([...progress.passed, selected])])} stopSound={stopSound} resetGuitar={resetGuitar} onOpenRepertoire={onOpenRepertoire} />}
    </section>}
  </div>
}
