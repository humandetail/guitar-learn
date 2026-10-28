export type TabNote = { string: number; fret: number; finger?: number; sustainBeats?: number; role?: 'melody' | 'bass' | 'fill' }
export type TabEvent = { notes: TabNote[]; beats: 0.5 | 1 | 1.5 | 2 | 3 | 4; lyric?: string; chord?: string }
export type TabExerciseData = { id: string; title: string; description: string; bpm: number; beatsPerBar: 4; startBar?: number; events: TabEvent[] }

const note = (string: number, fret: number, beats: 1 | 2 | 4 = 1, finger?: number): TabEvent => ({ notes: [{ string, fret, ...(finger ? { finger } : {}) }], beats })
const melody: TabEvent[] = [note(1, 0), note(1, 0), note(1, 3, 1, 3), note(1, 3, 1, 3), note(1, 1, 1, 1), note(1, 1, 1, 1), note(1, 0, 2)]

// Short original exercises; no third-party song transcription or recording.
export const exercises: Record<string, TabExerciseData> = {
  'tab-reading': { id: 'tab-reading', title: '读一行，弹四个音', description: '第 1 弦：空弦、1 品、3 品、空弦。每个音 1 拍。', bpm: 60, beatsPerBar: 4, events: [note(1, 0), note(1, 1, 1, 1), note(1, 3, 1, 3), note(1, 0)] },
  'rhythm-rest': { id: 'rhythm-rest', title: '弹、停、延长', description: '4/4 拍：第 1 拍弹空弦，第 2 拍停住声音，第 3 拍再弹并持续到第 4 拍结束。', bpm: 60, beatsPerBar: 4, events: [note(3, 0), { notes: [], beats: 1 }, note(3, 0, 2)] },
  'chromatic-one': { id: 'chromatic-one', title: '单弦爬格子 · 1–2–3–4', description: '第 1 弦从 1 品到 4 品，用食指、中指、无名指、小指依次按，每拍只拨一下。', bpm: 40, beatsPerBar: 4, events: [1, 2, 3, 4].map(fret => note(1, fret, 1, fret)) },
  'chromatic-cross': { id: 'chromatic-cross', title: '换弦爬格子', description: '先第 2 弦 1–2–3–4，再第 1 弦 1–2–3–4；换弦时保持慢速。', bpm: 40, beatsPerBar: 4, events: [2, 1].flatMap(string => [1, 2, 3, 4].map(fret => note(string, fret, 1, fret))) },
  'first-melody': { id: 'first-melody', title: '第一段短旋律', description: '全部在第 1 弦上。前六个音各 1 拍，最后一个空弦持续 2 拍。', bpm: 60, beatsPerBar: 4, events: melody },
  'em-arpeggio': { id: 'em-arpeggio', title: 'Em 分解伴奏 · 6–3–2–1', description: '按住 Em，每拍拨一根弦：6、3、2、1，再重复一遍。四根都是空弦。', bpm: 60, beatsPerBar: 4, events: [6, 3, 2, 1, 6, 3, 2, 1].map(string => note(string, 0)) },
  'singing-line': { id: 'singing-line', title: '把短句唱进两小节', description: '先听旋律，用“啦”哼唱；再试原创短句“慢 慢 弹 响，一 根 弦”。前四拍配 Em，后四拍配 Am。', bpm: 60, beatsPerBar: 4, events: melody.map((event, index) => ({ ...event, lyric: ['慢', '慢', '弹', '响', '一', '根', '弦'][index] })) },
  'solo-melody': { id: 'solo-melody', title: '先弹清上面的旋律', description: '先只弹第 1 弦的旋律，记住最后一个音持续两拍，再尝试加入低音。', bpm: 60, beatsPerBar: 4, events: melody },
  'solo-duet': { id: 'solo-duet', title: '旋律加一根低音', description: '每小节第 1 拍，同时拨低音和第 1 弦：第一小节用第 6 弦空弦，第二小节用第 5 弦空弦。', bpm: 60, beatsPerBar: 4, events: melody.map((event, index) => index === 0 ? { ...event, notes: [{ string: 6, fret: 0 }, ...event.notes] } : index === 4 ? { ...event, notes: [{ string: 5, fret: 0 }, ...event.notes] } : event) },
}
