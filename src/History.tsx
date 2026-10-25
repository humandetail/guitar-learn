import { useState } from 'react'
import { Button } from './components/ui/button'
import { defaultSettings, midiNote, type PracticeRecord } from './model'
import ChordDiagram from './ChordDiagram'

export default function History({ records, onChange, onBack }: { records: PracticeRecord[]; onChange: (records: PracticeRecord[]) => void; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const selected = records.find(record => record.id === selectedId)
  function remove(id?: string) {
    if (!window.confirm(id ? '删除这条练习记录？此操作无法撤销，已导出的备份仍可恢复。' : '清空全部练习记录？和弦与设置会保留。')) return
    try { onChange(id ? records.filter(record => record.id !== id) : []); setSelectedId(null); setError('') }
    catch { setError('删除保存失败，原记录仍保留，请检查存储后重试。') }
  }
  return <section className="panel" aria-label="练习记录管理"><div className="title-row"><Button variant="outline" onClick={() => selected ? setSelectedId(null) : onBack()}>返回</Button><h1>{selected ? '练习详情' : '练习记录'}</h1></div>
    {selected ? <>
      <h2>{selected.chord.name}</h2><p className="muted">{new Date(selected.practicedAt).toLocaleString()} · A4 {selected.reference} Hz</p>
      <ChordDiagram chord={selected.chord} settings={{ ...defaultSettings, reference: selected.reference }} />
      <ol className="result-list">{selected.results.map(result => <li key={result.string}><span>第 {result.string} 弦</span><span>{result.targetMidi === null ? '不弹／未检测' : `${midiNote(result.targetMidi)} · ${result.correct ? '音高符合目标 ✓' : '音高不符 !'}`}<small>{result.frequency !== null ? `${result.note} · ${result.cents?.toFixed(1)} 音分` : ''}</small></span></li>)}</ol>
      <Button variant="outline" onClick={() => remove(selected.id)}>删除单条记录</Button>
    </> : <>
      {!records.length && <p className="muted">还没有练习记录。完成一轮逐弦检测后会保存在这里。</p>}
      <ul className="history-list">{[...records].sort((a, b) => Date.parse(b.practicedAt) - Date.parse(a.practicedAt)).map(record => <li key={record.id}><button className="history-entry" onClick={() => setSelectedId(record.id)}><span><strong>{record.chord.name}</strong><small>{new Date(record.practicedAt).toLocaleString()}</small></span><span>{record.results.filter(result => result.correct === true).length}/{record.results.filter(result => result.correct !== null).length} 弦音高符合<small>A4 {record.reference} Hz</small></span></button></li>)}</ul>
      {records.length > 0 && <Button variant="outline" onClick={() => remove()}>清空全部练习记录</Button>}
    </>}
    {error && <p role="alert" className="error-box">{error}</p>}
  </section>
}
