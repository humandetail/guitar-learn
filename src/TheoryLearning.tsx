import { useEffect, useRef, useState } from 'react'
import { theoryStages, theoryTopics } from './theory'
import { freshTheoryProgress, loadTheoryProgress, saveTheoryProgress, theoryStatus, type TheoryProgress } from './theory-storage'
import type { Settings } from './model'
import { playExercise, stopExerciseAudio } from './exercise-audio'
import type { TabEvent } from './exercises'
import type { TheoryTask } from './theory'
import './theory.css'

function initial() {
  try { return { progress: loadTheoryProgress(), error: '', blocked: false } }
  catch { return { progress: freshTheoryProgress(), error: '乐理进度无法读取，原始数据未覆盖。仍可阅读和练习。', blocked: true } }
}
export type TheorySession = ReturnType<typeof initial>
export default function Theory({ topicId, onBack, active, settings, session }: { topicId: string | null; onBack: () => void; active: boolean; settings: Settings; session: { current: TheorySession | null } }) {
  const [loaded] = useState(() => session.current ?? initial())
  const [progress, setProgress] = useState(loaded.progress)
  const [error, setError] = useState(loaded.error)
  const [blocked, setBlocked] = useState(loaded.blocked)
  useEffect(() => { session.current = error ? { progress, error, blocked } : null }, [progress, error, blocked, session])
  const [selected, setSelected] = useState(topicId)
  const [question, setQuestion] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState('')
  const generation = useRef(0)
  const owned = useRef(false)
  function stop() { generation.current++; if (owned.current) stopExerciseAudio(); owned.current = false; setPlaying(false) }
  useEffect(() => { stop(); setAudioError(''); return stop }, [selected, question, active])
  async function play(events: TabEvent[] | undefined = task?.events) {
    if (!active || !events || owned.current) return
    const token = ++generation.current
    owned.current = true; setPlaying(true); setAudioError('')
    try {
      const cancel = await playExercise({ exercise: { id: topic!.id, title: topic!.title, description: '', bpm: 60, beatsPerBar: 4, events }, bpm: 60, reference: settings.reference,
        onEvent: () => {}, onEnd: () => { if (token === generation.current) { owned.current = false; setPlaying(false) } } })
      if (token !== generation.current) cancel()
    } catch (error) { if (token === generation.current) { owned.current = false; setPlaying(false); setAudioError(error instanceof Error ? error.message : '无法播放，请重试。') } }
  }
  const topic = theoryTopics.find(item => item.id === selected)
  const task = topic?.tasks[question]
  useEffect(() => { document.querySelector('.page-content')?.scrollTo(0, 0) }, [selected, question])
  function write(next: TheoryProgress) {
    setProgress(next)
    if (blocked) return
    try { saveTheoryProgress(next); setError('') }
    catch { setError('乐理进度未保存，当前操作仍保留，请重试保存。关闭后可能丢失。') }
  }
  function retrySave() {
    if (!blocked) { write(progress); return }
    try { setProgress(loadTheoryProgress()); setBlocked(false); setError('') }
    catch { setError('乐理进度仍无法读取，原始数据未覆盖。仍可阅读和练习。') }
  }
  function open(id: string) { setSelected(id); setQuestion(0); setFeedback('') }
  const notice = error && <div role="alert" className="learning-save-error"><p>{error}</p><button onClick={retrySave}>{blocked ? '重新读取乐理进度' : '重试保存乐理进度'}</button></div>
  return <section className="learning-screen theory-screen" aria-label="乐理学习">
    <div className="title-row"><button className="learning-back" onClick={onBack}>{topicId ? '返回原课程' : '返回课程目录'}</button>{topic && <button onClick={() => { setSelected(null); setFeedback('') }}>乐理目录</button>}</div>
    {notice}
    {!topic ? <><h1>乐理学习与复习</h1><p className="learning-body">边弹边理解，随时复习。不影响弹奏课的继续学习。</p>{theoryStages.map((stage, index) => <section key={stage}><h2>阶段 {index + 1} · {stage}</h2>{theoryTopics.filter(item => item.stage === index + 1).map(item => <button className="theory-topic" key={item.id} onClick={() => open(item.id)}>{item.title} · {theoryStatus(item.id, progress)}</button>)}</section>)}<p>进度保存在本浏览器，不与微信同步。</p></> : <>
      <p className="eyebrow">阶段 {topic.stage} · {theoryStages[topic.stage - 1]}</p><h1>{topic.title}</h1>
      <p>状态：{theoryStatus(topic.id, progress)}{error && '（本次操作尚未保存）'}</p>
      <div className="learning-instructions">{topic.paragraphs.map(text => <p key={text}>{text}</p>)}</div>
      <button className="learning-tool-button" onClick={() => write({ ...progress, read: [...new Set([...progress.read, topic.id])] })}>标记已阅读</button>
      {task && <section className="theory-task" aria-label="知识小任务"><h2>小任务 {question + 1} / {topic.tasks.length}</h2><p>{task.prompt}</p>
        {task.events && <div className="theory-controls"><button disabled={!active} onClick={() => playing ? stop() : void play()}>{playing ? '停止示范' : '播放合成示范'}</button><small>合成示范 · 60 BPM · 可重复听</small></div>}
        {audioError && <p role="alert">{audioError}</p>}
        <TaskOptions task={task} onAnswer={id => { const correct = id === task.answer; setFeedback(`${correct ? '回答正确' : '再想一想'}。${task.explanation}`); if (correct) write({ ...progress, read: [...new Set([...progress.read, topic.id])], passed: [...new Set([...progress.passed, task.id])] }) }} />
        <div role="status" aria-live="polite">{feedback}</div>
        <div className="theory-controls"><button onClick={() => setFeedback('')}>重新作答</button><button onClick={() => { setFeedback(`已跳过，可稍后重试。${task.explanation}`); write({ ...progress, read: [...new Set([...progress.read, topic.id])] }) }}>跳过本题</button></div>
        <div className="theory-controls"><button disabled={question === 0} onClick={() => { setQuestion(question - 1); setFeedback('') }}>上一题</button><button disabled={question === topic.tasks.length - 1} onClick={() => { setQuestion(question + 1); setFeedback('') }}>下一题</button></div>
      </section>}
      {topic.examples && <section aria-label="编配案例示范"><h2>听一听，再照着弹</h2><p>每个位置一拍；同一位置的音同时拨，标出的低音延续四拍。合成示范 · 60 BPM。</p>{topic.examples.map(example => <article className="theory-task" key={example.id}><h3>{example.title}</h3><button className="learning-tool-button" disabled={playing || !active} onClick={() => void play(example.events)}>播放{example.title}</button><ol>{example.events.map((event, index) => <li key={index}>第 {Math.floor(index / 4) + 1} 小节第 {index % 4 + 1} 拍：{event.notes.map(note => `${note.string} 弦 ${note.fret} 品${note.role === 'bass' ? '（低音延续四拍）' : ''}`).join(' + ')}</li>)}</ol></article>)}{playing && <button className="learning-tool-button" onClick={stop}>停止案例示范</button>}{audioError && <p role="alert">{audioError}</p>}</section>}
      <section className="theory-self"><h2>拿琴试一试</h2><p>{topic.selfCheck}</p><label><input type="checkbox" checked={progress.selfChecked.includes(topic.id)} onChange={event => write({ ...progress, selfChecked: event.target.checked ? [...new Set([...progress.selfChecked, topic.id])] : progress.selfChecked.filter(id => id !== topic.id) })} />我已自行检查（不代表系统验证演奏能力）</label></section>
    </>}
  </section>
}

function TaskOptions({ task, onAnswer }: { task: TheoryTask; onAnswer: (id: string) => void }) {
  if (task.kind === 'fretboard') {
    const frets = Array.from({ length: Math.max(...task.options.map(option => option.fret ?? 0)) + 1 }, (_, index) => index)
    return <div role="group" aria-label="指板点选" className="theory-board" style={{ gridTemplateColumns: `28px repeat(${frets.length}, minmax(44px, 1fr))` }}>
      <span aria-hidden="true">弦</span>{frets.map(fret => <span className="theory-board-head" key={`head-${fret}`}>{fret === 0 ? '空弦' : `${fret} 品`}</span>)}
      {[1, 2, 3, 4, 5, 6].flatMap(string => [<span key={`string-${string}`} className="theory-board-head">{string}</span>, ...frets.map(fret => {
        const option = task.options.find(item => item.string === string && item.fret === fret)
        return <div className="theory-board-cell" key={`${string}-${fret}`}>{option ? <button aria-label={option.label} onClick={() => onAnswer(option.id)}><span aria-hidden="true">{fret === 0 ? '○' : '●'}</span><small>{option.label.split(' · ')[1]}</small></button> : <span aria-hidden="true">—</span>}</div>
      })])}
      <small className="theory-board-caption">上方为 1 弦，下方为 6 弦；0 为空弦。点选蓝色候选位置。</small>
    </div>
  }
  if (task.kind === 'staff') return <svg className="theory-staff" viewBox="0 0 320 180" role="group" aria-label="谱面点选">
    {[50, 66, 82, 98, 114].map(y => <line key={y} x1="8" x2="312" y1={y} y2={y} stroke="#65748c" />)}
    <text x="10" y="105" fontSize="64">𝄞</text>
    {task.options.map((option, index) => {
      const x = 90 + index * 75, y = 114 - (option.staffStep ?? 0) * 8
      return <g key={option.id} role="button" tabIndex={0} aria-label={option.label} onClick={() => onAnswer(option.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onAnswer(option.id) } }}>
        <rect x={x - 24} y={y - 23} width="48" height="46" rx="8" fill="#e9efff" fillOpacity=".25" />
        {(option.staffStep ?? 0) < 0 && <line x1={x - 17} x2={x + 17} y1="130" y2="130" stroke="#65748c" />}
        <ellipse cx={x} cy={y} rx="10" ry="7" fill="#254dff" transform={`rotate(-15 ${x} ${y})`} /><line x1={x + 9} x2={x + 9} y1={y} y2={y - 30} stroke="#254dff" strokeWidth="2" />
        <text x={x} y="171" textAnchor="middle" fontSize="12">{String.fromCharCode(65 + index)}</text>
      </g>
    })}
  </svg>
  return <div className="theory-options" role="group" aria-label="答案选项">{task.options.map(option => <button key={option.id} onClick={() => onAnswer(option.id)}>{option.label}</button>)}</div>
}
