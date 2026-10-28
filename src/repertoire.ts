import type { TabEvent, TabNote } from './exercises'

export type RepertoireSong = {
  id: string
  title: string
  subtitle: string
  summary: string
  focus: string
  tips: string[]
  prerequisites: { lessonId: string; label: string }[]
  source: { label: string; url: string }[]
  bars: { events: TabEvent[]; chord: 'G' | 'C' | 'D' }[]
  bpm: number
}

// Sounding pitches in standard tuning. Each note stays in first position.
const positions = {
  D3: { string: 4, fret: 0 },
  G3: { string: 3, fret: 0 },
  A3: { string: 3, fret: 2, finger: 2 },
  B3: { string: 2, fret: 0 },
  C4: { string: 2, fret: 1, finger: 1 },
  D4: { string: 2, fret: 3, finger: 3 },
  E4: { string: 1, fret: 0 },
} satisfies Record<string, TabNote>

const note = (pitch: keyof typeof positions, beats: TabEvent['beats'] = 1): TabEvent => ({
  notes: [{ ...positions[pitch] }],
  beats,
})

// Traditional melodies; our own guitar fingering and one-chord-per-bar accompaniment.
// Provenance and exact rhythmic adaptations: docs/verification/repertoire-sources.md.
export const repertoire: RepertoireSong[] = [
  {
    id: 'mary-little-lamb',
    title: '玛丽有只小羊羔',
    subtitle: '第 1 首 · 四个音，先弹完整',
    summary: '只用第 2、3 弦的空弦、2 品和 3 品，练习换弦与句尾延音。',
    focus: '两根弦换弦 · 1 拍与 2 拍 · 句尾延音',
    tips: [
      '先读第 1 小节：2 弦空弦 → 3 弦 2 品 → 3 弦空弦 → 3 弦 2 品。每拍只拨一下。',
      '第 4 小节会用到 2 弦 3 品，建议用无名指。先单独练这一小节，再接回前一句。',
      '标 2 拍的音拨一次后数满两拍，最后的空弦数满四拍。不要为了等拍而重复拨弦。',
      '这是句尾延音练习版；先弹旋律。之后可每小节第 1 拍轻扫一次和弦，用“啦”哼唱。',
    ],
    prerequisites: [
      { lessonId: 'reading-tab', label: '认识六线谱' },
      { lessonId: 'single-notes', label: '弹清单音' },
    ],
    source: [
      { label: 'CUNY 教材 · 四音旋律谱', url: 'https://guides.hostos.cuny.edu/edu109' },
      { label: '1867 年曲集 · 同源旋律', url: 'https://archive.org/details/carminayalensiac00garr' },
    ],
    bpm: 60,
    bars: [
      { chord: 'G', events: [note('B3'), note('A3'), note('G3'), note('A3')] },
      { chord: 'G', events: [note('B3'), note('B3'), note('B3', 2)] },
      { chord: 'D', events: [note('A3'), note('A3'), note('A3', 2)] },
      { chord: 'G', events: [note('B3'), note('D4'), note('D4', 2)] },
      { chord: 'G', events: [note('B3'), note('A3'), note('G3'), note('A3')] },
      { chord: 'G', events: [note('B3'), note('B3'), note('B3'), note('B3')] },
      { chord: 'D', events: [note('A3'), note('A3'), note('B3'), note('A3')] },
      { chord: 'G', events: [note('G3', 4)] },
    ],
  },
  {
    id: 'twinkle-star',
    title: '小星星',
    subtitle: '第 2 首 · 三根弦，找重复句',
    summary: '用第 1、2、3 弦弹旋律。认出重复乐句，练得更好记。',
    focus: '三根弦换弦 · 相同音重复拨 · 两拍长音',
    tips: [
      '开头从 3 弦空弦跳到 2 弦 3 品。先慢慢找准弦，再跟拍；连续相同的音也要分别拨。',
      '2 弦 1 品用食指，3 品用无名指；1 弦空弦不需要左手按住。',
      '每两小节是一个小句。第 2、4、6、8、10、12 小节的最后一音都持续两拍。',
      '先练第 1–4 小节，再练第 5–8 小节；最后四小节就是开头。伴奏进阶再加入 C 和弦。',
    ],
    prerequisites: [
      { lessonId: 'reading-tab', label: '认识六线谱' },
      { lessonId: 'first-melody', label: '短旋律练习' },
      { lessonId: 'chromatic', label: '慢速爬格子' },
    ],
    source: [
      { label: 'CUNY 教材 · 完整旋律谱', url: 'https://guides.hostos.cuny.edu/edu109' },
      { label: '历史曲集 · Ah! vous dirai-je, maman', url: 'https://www.gutenberg.org/files/42711/42711-h/42711-h.htm' },
    ],
    bpm: 60,
    bars: [
      { chord: 'G', events: [note('G3'), note('G3'), note('D4'), note('D4')] },
      { chord: 'C', events: [note('E4'), note('E4'), note('D4', 2)] },
      { chord: 'C', events: [note('C4'), note('C4'), note('B3'), note('B3')] },
      { chord: 'G', events: [note('A3'), note('A3'), note('G3', 2)] },
      { chord: 'D', events: [note('D4'), note('D4'), note('C4'), note('C4')] },
      { chord: 'G', events: [note('B3'), note('B3'), note('A3', 2)] },
      { chord: 'D', events: [note('D4'), note('D4'), note('C4'), note('C4')] },
      { chord: 'G', events: [note('B3'), note('B3'), note('A3', 2)] },
      { chord: 'G', events: [note('G3'), note('G3'), note('D4'), note('D4')] },
      { chord: 'C', events: [note('E4'), note('E4'), note('D4', 2)] },
      { chord: 'C', events: [note('C4'), note('C4'), note('B3'), note('B3')] },
      { chord: 'G', events: [note('A3'), note('A3'), note('G3', 2)] },
    ],
  },
  {
    id: 'two-tigers',
    title: '两只老虎',
    subtitle: '第 3 首 · 放慢数拍，练长短变化',
    summary: '音值统一放大两倍，最短音数 1 拍。保留长短比例，练习跨弦。',
    focus: '1、2、4 拍切换 · 重复乐句 · 第 4 弦空弦',
    tips: [
      '开头多数音持续两拍：拨一下，数“1、2”，再弹下一个音。小节里只有两个音也要数满四拍。',
      '第 9、11 小节每音一拍，会比前面密一些；先单独循环，再接上后面两拍一个音的小节。',
      '第 13、15 小节从 3 弦空弦换到 4 弦空弦，再回到 3 弦。先看准弦号，别把粗细方向弄反。',
      '这是单声部旋律版。按每四小节练熟，再连成整首；学会 G、D 和弦后可另练轻扫伴奏与哼唱。',
    ],
    prerequisites: [
      { lessonId: 'rhythm-basics', label: '数拍与延音' },
      { lessonId: 'first-melody', label: '短旋律练习' },
      { lessonId: 'chromatic', label: '慢速换弦' },
    ],
    source: [
      { label: '历史曲集 · Frère Jacques（第 18–19 页）', url: 'https://www.gutenberg.org/files/42711/42711-h/42711-h.htm' },
    ],
    bpm: 80,
    bars: [
      { chord: 'G', events: [note('G3', 2), note('A3', 2)] },
      { chord: 'G', events: [note('B3', 2), note('G3', 2)] },
      { chord: 'G', events: [note('G3', 2), note('A3', 2)] },
      { chord: 'G', events: [note('B3', 2), note('G3', 2)] },
      { chord: 'G', events: [note('B3', 2), note('C4', 2)] },
      { chord: 'D', events: [note('D4', 4)] },
      { chord: 'G', events: [note('B3', 2), note('C4', 2)] },
      { chord: 'D', events: [note('D4', 4)] },
      { chord: 'D', events: [note('D4'), note('E4'), note('D4'), note('C4')] },
      { chord: 'G', events: [note('B3', 2), note('G3', 2)] },
      { chord: 'D', events: [note('D4'), note('E4'), note('D4'), note('C4')] },
      { chord: 'G', events: [note('B3', 2), note('G3', 2)] },
      { chord: 'G', events: [note('G3', 2), note('D3', 2)] },
      { chord: 'G', events: [note('G3', 4)] },
      { chord: 'G', events: [note('G3', 2), note('D3', 2)] },
      { chord: 'G', events: [note('G3', 4)] },
    ],
  },
]
