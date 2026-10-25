export type Settings = {
  reference: number; leftHanded: boolean; showFingers: boolean
  bpm: number; beats: 2 | 3 | 4; subdivision: 1 | 2 | 4; sound: boolean
}
export const defaultSettings: Settings = { reference: 440, leftHanded: false, showFingers: true, bpm: 80, beats: 4, subdivision: 1, sound: true }
export type Barre = { fret: number; fromString: number; toString: number; finger?: number }
export type Chord = { id: string; name: string; frets: (number | null)[]; fingers?: (number | null)[]; barres?: Barre[]; builtin?: boolean }
export type StringResult = { string: number; targetMidi: number | null; note: string | null; frequency: number | null; cents: number | null; correct: boolean | null }
export type PracticeRecord = { id: string; practicedAt: string; chord: Chord; reference: number; results: StringResult[] }
export const openMidi = [40, 45, 50, 55, 59, 64]
export const openNotes = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
// Only absorb IEEE-754 conversion noise; this is far below a millionth of a cent.
export const withinCents = (value: number, tolerance: number) => Number.isFinite(value) && Math.abs(value) <= tolerance + 1e-8
export const midiFrequency = (midi: number, reference: number) => reference * 2 ** ((midi - 69) / 12)
export function midiNote(midi: number) { return `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}` }
export function isObject(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
const integer = (value: unknown, low: number, high: number): value is number => Number.isInteger(value) && Number(value) >= low && Number(value) <= high
export function validateChord(value: unknown): asserts value is Chord {
  if (!isObject(value) || typeof value.name !== 'string' || !value.name.trim()) throw new Error('和弦名称不能为空')
  if (typeof value.id !== 'string' || !value.id.trim()) throw new Error('和弦 ID 无效')
  if (!Array.isArray(value.frets) || value.frets.length !== 6) throw new Error('指法必须包含 6 根弦')
  const frets = value.frets as unknown[]
  frets.forEach((fret, i) => { if (fret !== null && !integer(fret, 0, 24)) throw new Error(`第 ${6 - i} 弦品位须为不弹、空弦或 1–24 品`) })
  if (frets.every(fret => fret === null)) throw new Error('至少一根弦须可弹奏')
  if (value.fingers !== undefined) {
    if (!Array.isArray(value.fingers) || value.fingers.length !== 6) throw new Error('手指资料必须包含 6 根弦')
    value.fingers.forEach((finger: unknown, i: number) => {
      if (finger !== null && (!integer(finger, 1, 4) || frets[i] === null || frets[i] === 0)) throw new Error(`第 ${6 - i} 弦手指编号与品位冲突`)
    })
  }
  if (value.barres !== undefined) {
    if (!Array.isArray(value.barres)) throw new Error('横按资料无效')
    value.barres.forEach((barre: unknown, i: number) => {
      if (!isObject(barre)) throw new Error(`横按 ${i + 1} 资料无效`)
      const from: unknown = barre.fromString; const to: unknown = barre.toString
      if (!integer(barre.fret, 1, 24) || !integer(from, 1, 6) || !integer(to, 1, 6) || from <= to || (barre.finger !== undefined && !integer(barre.finger, 1, 4))) throw new Error(`横按 ${i + 1} 的品位、范围或手指无效（起弦须大于止弦）`)
      for (let string = to; string <= from; string++) {
        const fret = frets[6 - string]
        if (typeof fret !== 'number' || fret < barre.fret) throw new Error(`横按 ${i + 1} 与第 ${string} 弦品位冲突`)
        const finger = Array.isArray(value.fingers) ? value.fingers[6 - string] : null
        if (fret === barre.fret && finger !== null && finger !== undefined && barre.finger !== undefined && finger !== barre.finger) throw new Error(`横按 ${i + 1} 与第 ${string} 弦手指冲突`)
      }
    })
  }
}
export function validateSettings(value: unknown): asserts value is Settings {
  if (!isObject(value) || !integer(value.reference, 430, 450) || !integer(value.bpm, 30, 240) || !(typeof value.beats === 'number' && [2, 3, 4].includes(value.beats)) || !(typeof value.subdivision === 'number' && [1, 2, 4].includes(value.subdivision)) || typeof value.leftHanded !== 'boolean' || typeof value.showFingers !== 'boolean' || typeof value.sound !== 'boolean') throw new Error('设置资料无效')
}
export function validateRecord(value: unknown): asserts value is PracticeRecord {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id || typeof value.practicedAt !== 'string' || !Number.isFinite(Date.parse(value.practicedAt)) || !integer(value.reference, 430, 450)) throw new Error('记录身份、时间或基准无效')
  validateChord(value.chord)
  const chord = value.chord
  if (!Array.isArray(value.results) || value.results.length !== 6) throw new Error('记录须含六根弦结果')
  value.results.forEach((result: unknown, i: number) => {
    if (!isObject(result) || result.string !== 6 - i) throw new Error(`第 ${6 - i} 弦结果顺序无效`)
    const fret = chord.frets[i]
    if (fret === null) {
      if ([result.targetMidi, result.note, result.frequency, result.cents, result.correct].some(x => x !== null)) throw new Error(`第 ${6 - i} 弦不弹结果无效`)
    } else {
      const midi = openMidi[i] + fret
      if (result.targetMidi !== midi || typeof result.frequency !== 'number' || !Number.isFinite(result.frequency) || result.frequency <= 0 || typeof result.note !== 'string' || typeof result.cents !== 'number' || !Number.isFinite(result.cents) || typeof result.correct !== 'boolean') throw new Error(`第 ${6 - i} 弦检测结果无效`)
      const actualMidi = Math.round(69 + 12 * Math.log2(result.frequency / Number(value.reference)))
      const cents = 1200 * Math.log2(result.frequency / midiFrequency(midi, Number(value.reference)))
      if (Math.abs(cents - result.cents) > .001 || result.note !== midiNote(actualMidi) || result.correct !== (actualMidi === midi && withinCents(cents, 20))) throw new Error(`第 ${6 - i} 弦音高与判定冲突`)
    }
  })
}
