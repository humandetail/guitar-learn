import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Activity, AudioLines, BookOpen, ClipboardCheck, GraduationCap, Settings as SettingsIcon, ArrowLeft } from 'lucide-react'
import Tuner from './Tuner'
import Metronome from './Metronome.tsx'
import Chords from './Chords.tsx'
import Practice from './Practice'
import History from './History'
import DataManager from './DataManager'
import Learning from './Learning'
import type { LessonTool } from './lessons'
import { builtinChords } from './chords'
import { PageActionContext } from './PageActions'
import { Button } from './components/ui/button'
import { defaultSettings, type Chord, type PracticeRecord, type Settings } from './model'
import { loadSettings, localDataWarning, saveSettings, loadCustomChords, saveCustomChords, loadRecords, saveRecords, mergeRecordFile, recordFile, downloadJson } from './storage'
import { isMicrophoneActive, stopMicrophone } from './audio-bus'
import { stopReferenceAudio } from './reference-audio'
import { stopExerciseAudio } from './exercise-audio'

type Page = 'learn' | 'tuner' | 'metronome' | 'chords' | 'practice' | 'settings' | 'history' | 'data'
function initialSettings() {
  const problems: string[] = []
  const blocked: ('settings' | 'chords' | 'records')[] = []
  function load<T>(key: 'settings' | 'chords' | 'records', name: string, read: () => T, fallback: T) { try { return read() } catch { blocked.push(key); problems.push(`${name}无法读取，原始数据未覆盖。`); return fallback } }
  return { value: load('settings', '设置', loadSettings, { ...defaultSettings }), chords: load('chords', '和弦', loadCustomChords, []), records: load('records', '练习记录', loadRecords, []), error: problems.join(' '), blocked }
}
export default function App() {
  const contentArea = useRef<HTMLDivElement>(null)
  const [actionHost, setActionHost] = useState<HTMLDivElement | null>(null)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    const resize = () => {
      const viewport = window.visualViewport
      const focused = document.activeElement
      const editing = focused instanceof HTMLTextAreaElement || focused instanceof HTMLInputElement && !['checkbox', 'range', 'button'].includes(focused.type)
      const keyboard = !!viewport && viewport.scale === 1 && editing && window.innerHeight - viewport.height > 120
      setKeyboardOpen(keyboard)
      setViewportHeight(viewport?.scale === 1 ? viewport.height : null)
      if (keyboard) requestAnimationFrame(() => focused?.scrollIntoView({ block: 'nearest' }))
    }
    const focusChanged = () => requestAnimationFrame(resize)
    resize()
    window.visualViewport?.addEventListener('resize', resize)
    window.addEventListener('resize', resize)
    document.addEventListener('focusin', focusChanged)
    document.addEventListener('focusout', focusChanged)
    return () => {
      window.visualViewport?.removeEventListener('resize', resize)
      window.removeEventListener('resize', resize)
      document.removeEventListener('focusin', focusChanged)
      document.removeEventListener('focusout', focusChanged)
    }
  }, [])
  const [initial] = useState(initialSettings)
  const [settings, setSettings] = useState(initial.value)
  const [page, setPage] = useState<Page>('learn')
  const previousPage = useRef<Page>('learn')
  const settingsOrigin = useRef<Page>('learn')
  const [lessonTool, setLessonTool] = useState<LessonTool | null>(null)
  const [chordRequest, setChordRequest] = useState<{ id: string } | null>(null)
  const [error, setError] = useState(initial.error)
  const [practiceActive, setPracticeActive] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [practiceRequest, setPracticeRequest] = useState(0)
  const [customChords, setCustomChords] = useState<Chord[]>(initial.chords)
  const [records, setRecords] = useState<PracticeRecord[]>(initial.records)
  const recordsRef = useRef(records); recordsRef.current = records
  const [target, setTarget] = useState<Chord>(builtinChords.find(chord => chord.name === 'Am')!)
  const allChords = [...builtinChords, ...customChords]
  const effectiveTarget = allChords.find(chord => chord.id === target.id) ?? builtinChords.find(chord => chord.name === 'Am')!
  function changeChords(next: Chord[]) { if (initial.blocked.includes('chords')) throw new Error('原和弦存档无法读取，已保护原始内容，请先导出原始存档。'); saveCustomChords(next); setCustomChords(next) }
  function changeRecords(next: PracticeRecord[]) { if (initial.blocked.includes('records')) throw new Error('原练习存档无法读取，已保护原始内容，请先导出原始存档。'); saveRecords(next); recordsRef.current = next; setRecords(next) }
  function saveRecord(record: PracticeRecord) { changeRecords(mergeRecordFile(JSON.stringify(recordFile([record])), recordsRef.current)) }
  function changeSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch }
    try { if (initial.blocked.includes('settings')) throw new Error('设置存档受保护'); saveSettings(next); setSettings(next); setError(''); return true }
    catch { setError('设置保存失败，原有设置仍保留，请检查本地存储空间后重试。'); return false }
  }
  function openLessonTool(tool: LessonTool) {
    if (tool.target === 'practice' && hasUnsaved && !window.confirm('本轮结果尚未保存。确定放弃并开始课程练习？')) return
    if (tool.bpm !== undefined && !changeSettings({ bpm: tool.bpm, beats: 4, subdivision: 1 })) return
    const chord = builtinChords.find(item => item.name === tool.chord)
    if (chord && tool.target === 'chords') setChordRequest({ id: chord.id })
    if (chord && tool.target === 'practice') {
      stopMicrophone(); setHasUnsaved(false); setTarget(chord); setPracticeRequest(value => value + 1)
    }
    setLessonTool(tool)
    navigate(tool.target)
  }
  function navigate(next: Page) {
    if (next !== 'learn') stopExerciseAudio()
    if (next === 'learn') { setLessonTool(null); stopReferenceAudio() }
    if (next === 'settings' && !['settings', 'history', 'data'].includes(page)) settingsOrigin.current = page
    if (['history', 'data'].includes(next) && next !== page) previousPage.current = page
    if (!['settings', 'tuner', 'practice'].includes(next) || (next === 'tuner' && practiceActive) || (next === 'practice' && isMicrophoneActive() && !practiceActive)) stopMicrophone()
    setPage(next)
    window.scrollTo(0, 0)
    contentArea.current?.scrollTo(0, 0)
  }
  return <PageActionContext.Provider value={{ page, host: actionHost }}><main className={`workbench${keyboardOpen ? ' keyboard-open' : ''}`} style={viewportHeight ? { '--workbench-height': `${viewportHeight}px` } as CSSProperties : undefined}>
    <header className="app-header" hidden={['learn', 'settings', 'history', 'data'].includes(page)}><span className="eyebrow">GUITAR LEARN</span><button className="icon-button" aria-label="设置" onClick={() => navigate('settings')}><SettingsIcon size={20} /></button></header>
    <div className={`page-content${lessonTool && ['tuner', 'metronome', 'chords', 'practice'].includes(page) ? ' lesson-tool-content' : ''}`} ref={contentArea}>
    {lessonTool && ['tuner', 'metronome', 'chords', 'practice'].includes(page) && <button className="lesson-return" onClick={() => { setLessonTool(null); navigate('learn') }}><ArrowLeft size={16} aria-hidden="true" /><span>返回课程 · 继续刚才的一步</span></button>}
    <section className="page-screen" hidden={page !== 'learn'}><Learning active={page === 'learn'} settings={settings} onOpenTool={openLessonTool} onSettings={() => navigate('settings')} /></section>
    <section className="page-screen" hidden={page !== 'tuner'}><Tuner reference={settings.reference} /></section>
    <section className="page-screen" hidden={page !== 'metronome'}><Metronome learning={page === 'learn'} settings={settings} onChange={changeSettings} /></section>
    <section className="page-screen" hidden={page !== 'chords'}><Chords requestedChord={chordRequest} active={page === 'chords'} settings={settings} customChords={customChords} onChange={changeChords} onPractice={chord => { if (hasUnsaved && !window.confirm('本轮结果尚未保存。请先导出或保存；确定放弃并开始新目标？')) return; stopMicrophone(); setHasUnsaved(false); setTarget(chord); setPracticeRequest(value => value + 1); navigate('practice') }} /></section>
    <section className="page-screen" hidden={page !== 'practice'}><Practice key={practiceRequest} onUnsavedChange={setHasUnsaved} chords={allChords} target={effectiveTarget} onTarget={setTarget} settings={settings} onActiveChange={setPracticeActive} onSave={saveRecord} onHistory={() => navigate('history')} /></section>
    {page === 'history' && <History records={records} onChange={changeRecords} onBack={() => navigate(previousPage.current)} />}
    {page === 'data' && <DataManager chords={customChords} records={records} onChords={changeChords} onRecords={changeRecords} onBack={() => navigate(previousPage.current)} />}
    {page === 'settings' && <section className="panel settings-panel"><div className="title-row"><button className="icon-button" aria-label="返回练习" onClick={() => navigate(settingsOrigin.current)}><ArrowLeft /></button><h1>设置</h1></div>
      <div className="field-row"><label htmlFor="reference">基准音 A4</label><div className="stepper"><Button variant="outline" aria-label="降低基准音" disabled={practiceActive || settings.reference <= 430} onClick={() => changeSettings({ reference: settings.reference - 1 })}>−</Button><input id="reference" aria-label="基准音 A4" type="number" min="430" max="450" step="1" value={settings.reference} disabled={practiceActive} onChange={event => {
        const value = Number(event.target.value)
        if (Number.isInteger(value) && value >= 430 && value <= 450) changeSettings({ reference: value })
        else setError('基准音须为 430–450 Hz，步长 1 Hz。')
      }} /><Button variant="outline" aria-label="提高基准音" disabled={practiceActive || settings.reference >= 450} onClick={() => changeSettings({ reference: settings.reference + 1 })}>＋</Button></div></div>
      <p className="muted">430–450 Hz · 步长 1 Hz{practiceActive ? ' · 本轮检测中不可修改' : ''}</p><Button variant="outline" disabled={practiceActive} onClick={() => changeSettings({ reference: 440 })}>恢复 440 Hz</Button>
      <label className="field-row">手指编号<input type="checkbox" checked={settings.showFingers} onChange={event => changeSettings({ showFingers: event.target.checked })} /></label>
      <label className="field-row">左手镜像<input type="checkbox" checked={settings.leftHanded} onChange={event => changeSettings({ leftHanded: event.target.checked })} /></label>
      <div className="stack"><Button variant="outline" onClick={() => navigate('history')}>练习记录</Button><Button variant="outline" onClick={() => navigate('data')}>数据管理</Button></div><p className="muted">{localDataWarning}</p><details className="app-explanation"><summary>音频与隐私说明</summary><p>音频仅在当前浏览器处理，不录音、不上传。检测只核对音高，不验证手型、实际发声弦位或消音效果。</p></details>
    </section>}
    {initial.error && <div className="error-box" role="alert"><div><p>{initial.error}已禁止覆盖损坏的存档。</p><Button variant="outline" onClick={() => downloadJson('guitar-learn-raw-storage.json', { settings: localStorage.getItem('guitar-learn.settings.v1'), chords: localStorage.getItem('guitar-learn.chords.v1'), records: localStorage.getItem('guitar-learn.records.v1') })}>导出原始本地存档</Button></div></div>}
    {error && error !== initial.error && <p className="error-box" role="alert">{error}</p>}
    </div><div className="workbench-bottom"><div className="page-actions" role="region" aria-label="当前页面操作" ref={setActionHost} />
    <nav className="bottom-nav" aria-label="练习模块">{([
      ['learn', '学习', GraduationCap], ['tuner', '调音', AudioLines], ['metronome', '节拍', Activity], ['chords', '和弦', BookOpen], ['practice', '检测', ClipboardCheck],
    ] as const).map(([key, label, Icon]) => <button key={key} aria-current={page === key ? 'page' : undefined} onClick={() => navigate(key)}><Icon size={20} /><span>{label}</span></button>)}</nav>
  </div></main></PageActionContext.Provider>
}
