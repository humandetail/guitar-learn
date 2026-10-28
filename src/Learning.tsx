import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3, Music2, Settings as SettingsIcon } from 'lucide-react'
import { Button } from './components/ui/button'
import { PageActions } from './PageActions'
import ChordDiagram from './ChordDiagram'
import { builtinChords } from './chords'
import type { Settings } from './model'
import { lessons, type LessonStep, type LessonTool } from './lessons'
import { freshLearningProgress, loadLearningProgress, saveLearningProgress, type LearningProgress } from './learning-storage'
import BeginnerDiagrams from './BeginnerDiagrams'
import TabExercise from './TabExercise'
import { exercises } from './exercises'
import Repertoire from './Repertoire.tsx'
import './learning.css'

function initialProgress() {
  try { return { progress: loadLearningProgress(), error: '', blocked: false } }
  catch { return { progress: freshLearningProgress(), error: '原学习进度无法读取，已保留原始数据。你仍可浏览课程，本次进度暂不保存。', blocked: true } }
}

function LessonDiagram({ kind, settings }: { kind: NonNullable<LessonStep['diagram']>; settings: Settings }) {
  if (kind === 'anatomy' || kind === 'notation' || kind === 'rhythm-values') return <BeginnerDiagrams kind={kind} />
  if (kind === 'em' || kind === 'am') {
    const name = kind === 'em' ? 'Em' : 'Am'
    return <figure className="lesson-diagram lesson-chord-figure">
      <ChordDiagram chord={builtinChords.find(chord => chord.name === name)!} settings={{ ...settings, showFingers: true }} compact showStringButtons={false} />
      <figcaption>{name} · 圆点里的数字是手指编号<br />1 食指 · 2 中指 · 3 无名指 · 4 小指{settings.leftHanded ? ' · 左手镜像' : ''}</figcaption>
    </figure>
  }
  if (kind === 'strings') {
    const strings = settings.leftHanded ? [1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1]
    const notes = ['E', 'B', 'G', 'D', 'A', 'E']
    return <figure className="lesson-diagram">
      <div className="lesson-string-map" role="img" aria-label="吉他最粗的是第六弦，最细的是第一弦；第六到第一弦标准音名为 E、A、D、G、B、E。">
        {strings.map(string => <div className="lesson-string" key={string}><span>{string} 弦</span><i style={{ width: `${1 + string * .5}px` }} /><strong>{notes[string - 1]}</strong></div>)}
      </div>
      <figcaption>{settings.leftHanded ? '细弦 → 粗弦（左手镜像）' : '粗弦 → 细弦'} · 认弦号，不靠上下猜</figcaption>
    </figure>
  }
  if (kind === 'frets') return <figure className="lesson-diagram">
    <svg className="lesson-frets" viewBox="0 0 340 170" role="img" aria-label="品丝是金属条。第一品是琴枕与第一根品丝之间的区域。图中蓝点在第 3 弦第 2 品，指尖放在第二品区域内，靠近第二根品丝，不压在金属条上。">
      <text x="35" y="28" textAnchor="middle">琴枕</text>
      {[1, 2, 3].map((fret, index) => <text key={fret} x={100 + index * 85} y="28" textAnchor="middle">第 {fret} 品</text>)}
      {[0, 1, 2, 3, 4, 5].map(index => <g key={index}><text x="16" y={54 + index * 15} textAnchor="middle">{6 - index}</text><line x1="40" x2="310" y1={50 + index * 15} y2={50 + index * 15} stroke="#a6b4ce" strokeWidth={2.3 - index * .25} /></g>)}
      {[40, 140, 225, 310].map((x, index) => <line key={x} x1={x} x2={x} y1="45" y2="130" stroke={index === 0 ? '#55627a' : '#a6b4ce'} strokeWidth={index === 0 ? 6 : 3} />)}
      <circle cx="208" cy="95" r="12" fill="#254dff" /><path d="M208 111v24" stroke="#254dff" strokeWidth="2" /><text x="208" y="157" textAnchor="middle" fill="#254dff">指尖靠近品丝</text>
    </svg>
    <figcaption>蓝点：第 3 弦第 2 品，避开金属条。</figcaption>
  </figure>
  return <figure className="lesson-diagram">
    <div className="lesson-beats" role="img" aria-label="一小节四拍，均匀数一二三四，每拍向下弹一次。第一拍是重拍。">
      {[1, 2, 3, 4].map(beat => <div className={beat === 1 ? 'lesson-beat first' : 'lesson-beat'} key={beat}><strong>{beat}</strong><span>↓</span><small>{beat === 1 ? '重拍' : '下拨'}</small></div>)}
    </div><figcaption>均匀数「1、2、3、4」，再从 1 开始。</figcaption>
  </figure>
}

export default function Learning({ onOpenTool, onSettings, settings, active }: { onOpenTool: (tool: LessonTool) => void; onSettings: () => void; settings: Settings; active: boolean }) {
  const [initial] = useState(initialProgress)
  const [progress, setProgress] = useState(initial.progress)
  const [error, setError] = useState(initial.error)
  const [blocked, setBlocked] = useState(initial.blocked)
  const [repertoireOpen, setRepertoireOpen] = useState(false)
  const pending = useRef<LearningProgress | null>(null)
  const screen = useRef<HTMLElement>(null)
  const lesson = lessons.find(item => item.id === progress.lessonId)!
  const lessonIndex = lessons.indexOf(lesson)
  const step = lesson.steps[progress.step]
  const checking = progress.step === lesson.steps.length
  const practiceTool = progress.step === lesson.steps.length - 1 ? step?.tool : undefined
  const checked = progress.checks[lesson.id] ?? []
  const allChecked = checked.length === lesson.checks.length
  const allComplete = progress.completed.length === lessons.length
  const firstIncomplete = lessons.find(item => !progress.completed.includes(item.id))
  const nextLesson = lessons.slice(lessonIndex + 1).find(item => !progress.completed.includes(item.id)) ?? firstIncomplete
  const resumeLesson = progress.completed.includes(lesson.id) ? firstIncomplete ?? lessons[0] : lesson
  const hasStarted = progress.lessonId !== lessons[0].id || progress.step > 0 || progress.completed.length > 0
  const sections = [...new Set(lessons.map(item => item.section))]

  useEffect(() => {
    if (active) screen.current?.closest('.page-content')?.scrollTo(0, 0)
  }, [active, progress.view, progress.lessonId, progress.step, repertoireOpen])

  function write(next: LearningProgress, requireSave = false) {
    pending.current = next
    if (!requireSave) setProgress(next)
    if (blocked) return false
    try {
      saveLearningProgress(next)
      setProgress(next); setError(''); pending.current = null
      return true
    } catch {
      setError('学习进度未保存。当前内容和自查选择已保留，请重试保存；关闭页面后可能丢失。')
      return false
    }
  }
  function retry() {
    if (blocked) {
      try { const loaded = loadLearningProgress(); setProgress(loaded); setBlocked(false); setError(''); pending.current = null }
      catch { setError('原学习进度仍无法读取，原始数据未覆盖。可继续浏览课程。') }
    } else if (pending.current) write(pending.current, true)
  }
  function openLesson(id: string, resume = false) {
    setRepertoireOpen(false)
    write({ ...progress, view: 'lesson', lessonId: id, step: resume && id === progress.lessonId ? progress.step : 0 })
  }
  function toggleCheck(index: number) {
    const next = checked.includes(index) ? checked.filter(value => value !== index) : [...checked, index]
    write({ ...progress, checks: { ...progress.checks, [lesson.id]: next } })
  }
  function completeLesson() {
    if (!allChecked) return
    write({ ...progress, view: 'complete', completed: [...new Set([...progress.completed, lesson.id])] }, true)
  }
  const settingsButton = <button type="button" className="icon-button" aria-label="设置" onClick={onSettings}><SettingsIcon size={20} aria-hidden="true" /></button>
  const errorNotice = error && <div className="learning-save-error" role="alert"><p>{error}</p><button type="button" onClick={retry}>{blocked ? '重新读取进度' : '重试保存'}</button></div>
  const repertoireEntry = <button type="button" className="learning-repertoire-entry" onClick={() => setRepertoireOpen(true)}><Music2 size={24} aria-hidden="true" /><span><strong>分级曲库</strong><small>从第一首旋律，练到弹唱与指弹</small></span><ChevronRight size={18} aria-hidden="true" /></button>

  if (repertoireOpen) return <Repertoire settings={settings} active={active} onBack={() => setRepertoireOpen(false)} onOpenLesson={id => openLesson(id)} />

  if (progress.view === 'overview') return <section className="learning-screen learning-overview" ref={screen} aria-label="入门课程">
    <div className="title-row"><h1>从零开始学</h1>{settingsButton}</div>
    <p className="learning-intro">先认琴、读谱、练基本功，再一步步走向弹唱与独奏。</p>
    {repertoireEntry}
    <div className="learning-course-progress"><span>{allComplete ? '入门课程已完成' : `已完成 ${progress.completed.length} / ${lessons.length} 节`}</span></div>
    <div className="learning-progress-track" role="progressbar" aria-label="入门课程进度" aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={progress.completed.length}><span style={{ width: `${progress.completed.length / lessons.length * 100}%` }} /></div>
    {errorNotice}
    <nav className="learning-sections" aria-label="学习阶段">{sections.map((section, index) => <button key={section} type="button" onClick={() => { const heading = document.getElementById(`learning-section-${index}`); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start' }) }}>{section}</button>)}</nav>
    {sections.map((section, sectionIndex) => <section className="learning-section" key={section} aria-labelledby={`learning-section-${sectionIndex}`}>
    <h2 id={`learning-section-${sectionIndex}`} tabIndex={-1}>{section}</h2>
    <ol className="learning-course-list">{lessons.filter(item => item.section === section).map(item => {
      const index = lessons.indexOf(item)
      const completed = progress.completed.includes(item.id)
      return <li key={item.id}><button type="button" onClick={() => openLesson(item.id)} aria-label={`${index + 1}. ${item.title}${completed ? '，已完成，可复习' : ''}`}><span className={`learning-course-number${completed ? ' complete' : ''}`}>{completed ? <Check size={20} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span><span className="learning-course-copy"><strong>{item.title}</strong><span>{item.summary}</span><small>{completed ? '已完成 · 可随时复习' : item.duration}</small></span><ChevronRight size={18} aria-hidden="true" /></button></li>
    })}</ol></section>)}
    <p className="learning-local-note">学习进度保存在这个浏览器中，随时可以回来继续。</p>
    <PageActions page="learn"><Button className="learning-action primary-action" onClick={() => openLesson(resumeLesson.id, !allComplete && resumeLesson.id === progress.lessonId)}>{allComplete ? '从第一课复习' : hasStarted ? '继续学习' : '开始第一课'}<ArrowRight size={18} aria-hidden="true" /></Button></PageActions>
  </section>

  if (progress.view === 'complete') return <section className="learning-screen learning-complete" ref={screen} aria-label="本课完成">
    <div className="title-row"><button className="learning-back" onClick={() => write({ ...progress, view: 'overview' })}><ArrowLeft size={18} aria-hidden="true" />课程目录</button>{settingsButton}</div>
    <div className="learning-complete-hero"><CheckCircle2 size={48} aria-hidden="true" /><h1>{allComplete ? '完成你的第一段学习' : '这一课，练过了'}</h1><p>{lesson.title}</p></div>
    <div className="learning-complete-summary"><h2>你已经亲自检查</h2><ul>{lesson.checks.map(check => <li key={check}><Check size={18} aria-hidden="true" /><span>{check}</span></li>)}</ul></div>
    <p className="learning-body">{allComplete ? '接下来可以重复弹唱短句和旋律加低音的练习，也可以回到认谱、爬格子或和弦课巩固。完成自查是起点，不代表已熟练掌握所有弹唱与独奏。' : nextLesson ? `下一课：${nextLesson.title}。准备好了再继续，也可以先重复这一课。` : '回到课程目录，挑一课继续巩固。'}</p>
    {repertoireEntry}
    {errorNotice}
    <PageActions page="learn"><Button className="learning-action" variant="outline" onClick={() => openLesson(lesson.id)}>再练一次</Button><Button className="learning-action primary-action learning-next-lesson" aria-label={allComplete || !nextLesson ? '返回课程' : '开始下一课'} onClick={() => allComplete || !nextLesson ? write({ ...progress, view: 'overview' }) : openLesson(nextLesson.id)}><span>{allComplete || !nextLesson ? '返回课程' : '开始下一课'}{!allComplete && nextLesson && <small>{nextLesson.title}</small>}</span><ArrowRight size={18} aria-hidden="true" /></Button></PageActions>
  </section>

  return <section className="learning-screen learning-detail" ref={screen} aria-label={lesson.title}>
    <div className="title-row"><button className="learning-back" onClick={() => write({ ...progress, view: 'overview' })}><ArrowLeft size={18} aria-hidden="true" />课程目录</button>{settingsButton}</div>
    <div className="learning-lesson-meta"><span>第 {lessonIndex + 1} 课 / {lessons.length}</span><span><Clock3 size={14} aria-hidden="true" />{lesson.duration}</span></div>
    <h1>{lesson.title}</h1>
    {progress.step === 0 && <p className="learning-goal">这一课：{lesson.goal}</p>}
    <div className="learning-step-meta"><span>{checking ? '动手后，自查一下' : `步骤 ${progress.step + 1} / ${lesson.steps.length}`}</span><span>{checking ? '按自己的实际情况勾选' : '看懂 → 动手 → 练习'}</span></div>
    <div className="learning-progress-track" role="progressbar" aria-label="本课进度" aria-valuemin={0} aria-valuemax={lesson.steps.length + 1} aria-valuenow={progress.step + 1}><span style={{ width: `${(progress.step + 1) / (lesson.steps.length + 1) * 100}%` }} /></div>
    <div className="learning-step" key={`${lesson.id}-${progress.step}`}>
      {checking ? <><h2>这些，你亲自做到了吗？</h2><p className="learning-body">按实际练习情况勾选，未做到的可以回去再练。</p><div className="learning-checks">{lesson.checks.map((check, index) => <label key={check}><input type="checkbox" checked={checked.includes(index)} onChange={() => toggleCheck(index)} /><span>{check}</span></label>)}</div></> : <><h2>{step.title}</h2>{step.diagram && <LessonDiagram kind={step.diagram} settings={settings} />}{step.exercise && <TabExercise key={step.exercise} exercise={exercises[step.exercise]} reference={settings.reference} active={active} />}<div className="learning-instructions">{step.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{step.tool && !practiceTool && <button className="learning-tool-button" type="button" onClick={() => onOpenTool(step.tool!)}>{step.tool.label}<ArrowRight size={18} aria-hidden="true" /></button>}</>}
    </div>
    {errorNotice}
    <PageActions page="learn">{practiceTool ? <>
      <Button className="learning-action learning-prev-icon" variant="outline" aria-label="上一步" onClick={() => write({ ...progress, step: progress.step - 1 })}><ArrowLeft size={18} aria-hidden="true" /></Button>
      <Button className="learning-action primary-action learning-practice-tool" onClick={() => onOpenTool(practiceTool)}>{practiceTool.label}</Button>
      <Button className="learning-action learning-self-check" variant="outline" onClick={() => write({ ...progress, step: progress.step + 1 })}>开始自查</Button>
    </> : <>
      <Button className="learning-action" variant="outline" onClick={() => progress.step === 0 ? write({ ...progress, view: 'overview' }) : write({ ...progress, step: progress.step - 1 })}>{progress.step === 0 ? '返回课程' : '上一步'}</Button>
      <Button className="learning-action primary-action" disabled={checking && (!allChecked || blocked)} onClick={() => checking ? completeLesson() : write({ ...progress, step: progress.step + 1 })}>{checking ? '完成本课' : progress.step === lesson.steps.length - 1 ? '开始自查' : '下一步'}{!checking && <ArrowRight size={18} aria-hidden="true" />}</Button>
    </>}</PageActions>
  </section>
}
