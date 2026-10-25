import { defaultSettings, isObject, validateChord, validateRecord, validateSettings, type Chord, type PracticeRecord, type Settings } from './model'
const keys = { settings: 'guitar-learn.settings.v1', chords: 'guitar-learn.chords.v1', records: 'guitar-learn.records.v1' }
export const localDataWarning = '数据仅保存在当前浏览器，换设备或清除网站数据后无法自动恢复，请定期导出备份。'
function read(key: string): unknown { const value = localStorage.getItem(key); return value === null ? null : JSON.parse(value) }
function save(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)) }
export function loadSettings(): Settings { const value = read(keys.settings); if (value === null) return { ...defaultSettings }; validateSettings(value); return value }
export function saveSettings(value: Settings) { validateSettings(value); save(keys.settings, value) }
export function loadCustomChords(): Chord[] { const value = read(keys.chords); if (value === null) return []; if (!Array.isArray(value)) throw new Error('和弦存档无效'); value.forEach(validateChord); return value }
export function saveCustomChords(value: Chord[]) { value.forEach(validateChord); save(keys.chords, value) }
export function loadRecords(): PracticeRecord[] { const value = read(keys.records); if (value === null) return []; if (!Array.isArray(value)) throw new Error('练习存档无效'); value.forEach(validateRecord); return value }
export function saveRecords(value: PracticeRecord[]) { value.forEach(validateRecord); save(keys.records, value) }
export function recordFile(records: PracticeRecord[]) { return { type: 'guitar-learn-records', version: 1, records } }
export function mergeRecordFile(text: string, existing: PracticeRecord[]): PracticeRecord[] {
  const data: unknown = JSON.parse(text)
  if (!isObject(data) || data.type !== 'guitar-learn-records' || data.version !== 1 || !Array.isArray(data.records)) throw new Error('请选择本应用的版本 1 练习记录备份')
  const map = new Map(existing.map(record => [record.id, record]))
  data.records.forEach((record: unknown, index: number) => {
    try { validateRecord(record) } catch (error) { throw new Error(`记录 ${index + 1}：${error instanceof Error ? error.message : '无效'}`) }
    const previous = map.get(record.id)
    if (previous && canonical(previous) !== canonical(record)) throw new Error(`记录 ${index + 1}：ID ${record.id} 内容冲突，整份未恢复`)
    if (!previous) map.set(record.id, record)
  })
  return [...map.values()]
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
export function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
