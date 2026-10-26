import { createId } from './id'
import { isObject, validateChord, type Chord } from './model'
export const builtinChords: Chord[] = [
  ['C', [null, 3, 2, 0, 1, 0], [null, 3, 2, null, 1, null]],
  ['D', [null, null, 0, 2, 3, 2], [null, null, null, 1, 3, 2]],
  ['E', [0, 2, 2, 1, 0, 0], [null, 2, 3, 1, null, null]],
  ['G', [3, 2, 0, 0, 0, 3], [2, 1, null, null, null, 3]],
  ['A', [null, 0, 2, 2, 2, 0], [null, null, 1, 2, 3, null]],
  ['Am', [null, 0, 2, 2, 1, 0], [null, null, 2, 3, 1, null]],
  ['Dm', [null, null, 0, 2, 3, 1], [null, null, null, 2, 3, 1]],
  ['Em', [0, 2, 2, 0, 0, 0], [null, 2, 3, null, null, null]],
  ['A7', [null, 0, 2, 0, 2, 0], [null, null, 2, null, 3, null]],
  ['D7', [null, null, 0, 2, 1, 2], [null, null, null, 2, 1, 3]],
].map(([name, frets, fingers]) => ({ id: `builtin-${name}`, name: name as string, frets: frets as Chord['frets'], fingers: fingers as Chord['fingers'], builtin: true }))
export function uniqueChordName(name: string, existing: Chord[], suffix = '自定义') {
  const names = new Set([...builtinChords, ...existing].map(chord => chord.name))
  const base = name.trim()
  if (!names.has(base)) return base
  let attempt = `${base}（${suffix}）`; let index = 2
  while (names.has(attempt)) attempt = `${base}（${suffix} ${index++}）`
  return attempt
}
export function chordFile(chords: Chord[]) { return { type: 'guitar-learn-chords', version: 1, chords } }
export function mergeChordFile(text: string, existing: Chord[]): Chord[] {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('和弦 JSON 无法解析，请检查文件格式') }
  if (!isObject(data) || data.type !== 'guitar-learn-chords' || data.version !== 1 || !Array.isArray(data.chords)) throw new Error('请选择本应用版本 1 的和弦 JSON 文件，不能使用练习记录文件')
  const next = [...existing]
  data.chords.forEach((value: unknown, index: number) => {
    try {
      if (!isObject(value)) throw new Error('和弦资料无效')
      const candidate = { ...value, id: createId(), builtin: false }
      validateChord(candidate)
      const chord: Chord = { id: candidate.id, name: uniqueChordName(candidate.name, next, '导入'), frets: candidate.frets, ...(candidate.fingers !== undefined ? { fingers: candidate.fingers } : {}), ...(candidate.barres !== undefined ? { barres: candidate.barres } : {}) }
      next.push(chord)
    } catch (error) { throw new Error(`和弦 ${index + 1}：${error instanceof Error ? error.message : '资料无效'}，整份未导入`) }
  })
  return next
}
