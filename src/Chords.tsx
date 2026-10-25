import { useState } from 'react'
import { Button } from './components/ui/button'
import ChordDiagram from './ChordDiagram'
import { builtinChords, chordFile, mergeChordFile, uniqueChordName } from './chords'
import { downloadJson, localDataWarning } from './storage'
import { playChord } from './reference-audio'
import { validateChord, type Chord, type Settings } from './model'

export default function Chords({ settings, customChords, onChange, onPractice }: { settings: Settings; customChords: Chord[]; onChange: (next: Chord[]) => void; onPractice: (chord: Chord) => void }) {
  const [selected, setSelected] = useState(builtinChords[0].id)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const chords = [...builtinChords, ...customChords]
  const chord = chords.find(item => item.id === selected) ?? chords[0]
  async function play(index?: number) {
    setNotice('')
    try { await playChord(chord, settings.reference, index); setError(''); setNotice('正在播放合成参考音') }
    catch (cause) { setError(cause instanceof Error ? cause.message : '参考音播放失败，请重试') }
  }
  const [draft, setDraft] = useState<Chord | null>(null)
  const [failed, setFailed] = useState(false)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  function edit(source?: Chord, copy = false) {
    setError(''); setNotice(''); setFailed(false)
    setDraft(source ? { ...structuredClone(source), id: copy ? crypto.randomUUID() : source.id, builtin: false } : { id: crypto.randomUUID(), name: '', frets: [null, null, null, null, null, null] })
  }
  function save() {
    if (!draft) return
    try {
      validateChord(draft)
      const saved = { ...draft, name: uniqueChordName(draft.name, customChords.filter(item => item.id !== draft.id)) }
      onChange([...customChords.filter(item => item.id !== draft.id), saved])
      setSelected(saved.id); setDraft(null); setError(''); setFailed(false); setNotice('和弦已保存')
    } catch (cause) { setFailed(true); setError(`未保存：${cause instanceof Error ? cause.message : '保存失败'}。内容已保留，可修正或重试。`) }
  }
  function remove() {
    if (!window.confirm(`删除自定义和弦“${chord.name}”？此操作不能撤销。`)) return
    setNotice('')
    try { onChange(customChords.filter(item => item.id !== chord.id)); setSelected(builtinChords[0].id); setError(''); setNotice('和弦已删除') }
    catch (cause) { setError(`未删除：${cause instanceof Error ? cause.message : '保存失败'}，原资料保留，请重试。`) }
  }
  function importText(text: string) {
    setNotice('')
    setPendingImport(text)
    try { const next = mergeChordFile(text, customChords); onChange(next); setPendingImport(null); setNotice('和弦已全部导入'); setError(''); return true }
    catch (cause) { setError(`未导入：${cause instanceof Error ? cause.message : '保存失败'}。原库及待导入内容已保留。`); return false }
  }
  if (draft) return <section className="space-y-5" aria-label="编辑和弦">
    <div className="title-row"><h1>编辑和弦</h1><button type="button" className="min-h-11 px-3 text-[#254dff]" onClick={() => { setDraft(null); setError('') }}>取消</button></div>
    <label className="block space-y-2">和弦名称<input aria-label="和弦名称" className="min-h-12 w-full rounded-lg border border-[#c7d1ec] bg-white p-3" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
    <p className="text-sm text-[#55627a]">X 不弹 · 0 空弦 · 1–24 品；手指可不填</p>
    <div className="space-y-2">{draft.frets.map((fret, index) => <div key={index} className="grid grid-cols-[42px_1fr_1fr] items-center gap-2">
      <span>{6 - index}弦</span>
      <select aria-label={`第 ${6 - index} 弦品位`} className="min-h-12 rounded-lg border border-[#c7d1ec] bg-white px-2" value={fret === null ? 'x' : fret} onChange={event => { const frets = [...draft.frets]; frets[index] = event.target.value === 'x' ? null : Number(event.target.value); setDraft({ ...draft, frets }) }}><option value="x">X 不弹</option><option value="0">0 空弦</option>{Array.from({ length: 24 }, (_, i) => <option value={i + 1} key={i}>{i + 1} 品</option>)}</select>
      <select aria-label={`第 ${6 - index} 弦手指`} className="min-h-12 rounded-lg border border-[#c7d1ec] bg-white px-2" value={draft.fingers?.[index] ?? ''} onChange={event => { const fingers = [...(draft.fingers ?? [null, null, null, null, null, null])]; fingers[index] = event.target.value ? Number(event.target.value) : null; setDraft({ ...draft, fingers }) }}><option value="">手指不填</option>{[1, 2, 3, 4].map(finger => <option key={finger} value={finger}>手指 {finger}</option>)}</select>
    </div>)}</div>
    <div className="space-y-3"><h2>横按信息（可选）</h2>{draft.barres?.map((barre, index) => <fieldset className="grid grid-cols-2 gap-2 rounded-lg border border-[#c7d1ec] p-3" key={index}><legend>横按 {index + 1}</legend>{(['fret', 'fromString', 'toString', 'finger'] as const).map(key => <label className="text-sm" key={key}>{({ fret: '品位', fromString: '起弦', toString: '止弦', finger: '手指' })[key]}<select aria-label={`横按 ${index + 1} ${({ fret: '品位', fromString: '起弦', toString: '止弦', finger: '手指' })[key]}`} className="block min-h-12 w-full rounded border border-[#c7d1ec] bg-white p-2" value={barre[key] ?? ''} onChange={event => { const barres = [...draft.barres!]; barres[index] = { ...barre, [key]: event.target.value ? Number(event.target.value) : undefined }; setDraft({ ...draft, barres }) }}>{key === 'finger' && <option value="">不填</option>}{Array.from({ length: key === 'fret' ? 24 : key === 'finger' ? 4 : 6 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>)}<button type="button" className="min-h-11 text-[#b52e3d]" onClick={() => setDraft({ ...draft, barres: draft.barres?.filter((_, i) => i !== index) })}>移除横按 {index + 1}</button></fieldset>)}<button type="button" className="min-h-12 text-[#254dff]" onClick={() => setDraft({ ...draft, barres: [...(draft.barres ?? []), { fret: 1, fromString: 6, toString: 1 }] })}>添加横按</button></div>
    {error && <p role="alert" className="error-box">{error}</p>}
    <Button className="w-full" onClick={save}>{failed ? '重试保存' : '保存和弦'}</Button>
    {failed && <Button variant="outline" className="w-full" onClick={() => downloadJson('guitar-learn-unsaved-chord.json', chordFile([draft]))}>导出待保存内容</Button>}
    <p className="notice">{localDataWarning}</p>
  </section>
  return <section aria-label="和弦库" className="space-y-5">
    <div className="title-row"><h1>和弦库</h1><span className="mode">A4 {settings.reference} Hz</span></div>
    {[builtinChords, customChords].map((group, index) => group.length > 0 && <div key={index} aria-label={index === 0 ? '内置和弦' : '自定义和弦'} className={`grid gap-2 ${index === 0 ? 'grid-cols-5' : 'grid-cols-2'}`}>{group.map(item => <button type="button" key={item.id} aria-pressed={item.id === chord.id} onClick={() => { setSelected(item.id); setNotice('') }} className={`min-h-12 min-w-0 break-all rounded-lg border p-2 text-sm ${item.id === chord.id ? 'border-[#254dff] bg-[#e4eaff] text-[#254dff]' : 'border-[#c7d1ec]'}`}>{item.name}</button>)}</div>)}
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => edit()}>新增和弦</Button><Button variant="outline" onClick={() => edit(chord, true)}>复制和弦</Button>{!chord.builtin && <><Button variant="outline" onClick={() => edit(chord)}>编辑和弦</Button><Button variant="outline" onClick={remove}>删除和弦</Button></>}</div>
    <h2>{chord.name}</h2><ChordDiagram chord={chord} settings={settings} onPlayString={index => void play(index)} />
    <p className="text-sm text-[#55627a]">合成参考音 · 点击弦号试听单弦</p>
    <Button className="w-full" onClick={() => void play()}>播放和弦</Button>
    <Button variant="outline" className="w-full" onClick={() => onPractice(chord)}>练习这个和弦</Button>
    <details className="space-y-3"><summary className="min-h-12 py-3 text-[#254dff]">和弦文件备份与导入</summary><p className="notice">{localDataWarning}和弦与练习记录使用独立 JSON 文件。</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => downloadJson('guitar-learn-chords.json', chordFile(customChords))}>导出全部自定义和弦</Button><Button variant="outline" onClick={() => downloadJson('guitar-learn-chords-example.json', chordFile([{ id: 'example', name: '示例 Am', frets: [null, 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null] }]))}>下载和弦示例</Button></div><label className="block py-3">导入和弦 JSON<input aria-label="导入和弦 JSON" className="block min-h-12 max-w-full pt-3" type="file" accept="application/json,.json" onChange={event => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void file.text().then(text => { if (importText(text)) input.value = '' }).catch(() => setError('文件读取失败，请重新选择')) }} /></label>{pendingImport !== null && <Button variant="outline" onClick={() => importText(pendingImport)}>重试导入和弦</Button>}</details>
    {error && <p role="alert" className="error-box">{error}</p>}{notice && <p role="status" className="notice">{notice}</p>}
  </section>
}
