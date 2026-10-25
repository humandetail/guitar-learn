import { useEffect, useRef, useState } from 'react'
import { Button } from './components/ui/button'
import { type Chord, type PracticeRecord } from './model'
import { chordFile, mergeChordFile } from './chords'
import { downloadJson, localDataWarning, mergeRecordFile, recordFile } from './storage'

export default function DataManager({ chords, records, onChords, onRecords, onBack }: {
  chords: Chord[]; records: PracticeRecord[]; onChords: (chords: Chord[]) => void; onRecords: (records: PracticeRecord[]) => void; onBack: () => void
}) {
  const latest = useRef({ chords, records }); latest.current = { chords, records }
  const mounted = useRef(true)
  const reading = useRef(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<{ type: 'chords' | 'records'; text: string } | null>(null)
  function restore(type: 'chords' | 'records', text: string) {
    const { chords, records } = latest.current
    setError(''); setNotice('')
    try {
      if (type === 'chords') { const next = mergeChordFile(text, chords); onChords(next); latest.current = { ...latest.current, chords: next }; setNotice(`和弦导入成功，新增 ${next.length - chords.length} 条。`) }
      else { const next = mergeRecordFile(text, records); onRecords(next); latest.current = { ...latest.current, records: next }; setNotice(`恢复成功，新增 ${next.length - records.length} 条记录。`) }
      setPending(null)
    } catch (cause) { setPending({ type, text }); setError(`整份未保存：${cause instanceof Error ? cause.message : '文件或本地存储不可用，请重试'}`) }
  }
  async function choose(event: React.ChangeEvent<HTMLInputElement>, type: 'chords' | 'records') {
    const file = event.target.files?.[0]
    if (!file || reading.current) return
    const input = event.target
    reading.current = true; setBusy(true)
    try { const text = await file.text(); if (mounted.current) restore(type, text) } catch { if (mounted.current) setError('文件无法读取，请重新选择。') }
    finally { reading.current = false; if (mounted.current) { setBusy(false); input.value = '' } }
  }
  return <section className="panel"><div className="title-row"><Button variant="outline" onClick={onBack}>返回</Button><h1>数据管理</h1></div><p className="muted">{localDataWarning}</p>
    <h2>自定义和弦</h2><div className="stack"><Button variant="outline" onClick={() => downloadJson('guitar-learn-chords.json', chordFile(chords))}>导出全部和弦</Button><label className="file-button">导入和弦<input aria-label="导入和弦文件" type="file" disabled={busy} accept=".json,application/json" onChange={event => void choose(event, 'chords')} /></label></div>
    <h2>练习记录</h2><div className="stack"><Button variant="outline" onClick={() => downloadJson('guitar-learn-records.json', recordFile(records))}>导出全部记录</Button><label className="file-button">恢复记录<input aria-label="恢复记录文件" type="file" disabled={busy} accept=".json,application/json" onChange={event => void choose(event, 'records')} /></label></div>
    <p className="muted">和弦与记录使用独立的 JSON 文件。恢复记录不会向和弦库新增和弦。</p>
    <Button variant="outline" disabled={busy || !records.length} onClick={() => {
      if (!window.confirm('清空全部练习记录？和弦与设置会保留。')) return
      try { onRecords([]); setNotice('练习记录已清空'); setError('') } catch { setError('清空保存失败，原记录未改变。') }
    }}>清空练习记录</Button>
    {busy && <p role="status" className="notice">正在读取文件，请稍候…</p>}
    {notice && <p role="status" className="notice">{notice}</p>}{error && <p role="alert" className="error-box">{error}</p>}
    {pending && <div className="stack"><Button variant="outline" disabled={busy} onClick={() => restore(pending.type, pending.text)}>重试保存文件</Button><Button variant="outline" onClick={() => {
      try { downloadJson('guitar-learn-unsaved.json', JSON.parse(pending.text)) } catch { setError('原文件不是有效 JSON，请修正文件后重新导入。') }
    }}>导出待保存内容</Button></div>}
  </section>
}
