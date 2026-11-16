import { builtinChords } from './chords'
import type { Strike } from './experience-audio'
import { repertoire } from './repertoire'

export const twinkle = repertoire.find(song => song.id === 'twinkle-star')!

export const experienceConcepts = {
  strings: { title: '琴弦', instruction: '第 6 弦最粗，第 1 弦最细。逐根拨弦，比较音高。' },
  open: { title: '空弦', instruction: '从第 6 弦拨到第 1 弦，听听音高怎么变。' },
  frets: { title: '品位', instruction: '先拨第 1 弦空弦，再分别按第 1、2 品拨响它。' },
  sweep: { title: '扫弦', instruction: '在扫弦区横划琴弦，再反向扫一次，听发声顺序。' },
  chords: { title: '和弦', instruction: '选 C 或 G，再扫一下，听几根琴弦一起响。' },
  diagram: { title: '和弦图', instruction: '选一个和弦，对照图上的圆点和 ×，再逐根拨弦。' },
}
export type ExperienceConcept = keyof typeof experienceConcepts

const chordStrikes = (name: string, offset: number, interval: number): Strike[] => builtinChords.find(chord => chord.name === name)!.frets
  .flatMap((fret, index) => fret === null ? [] : [{ string: 6 - index, fret }])
  .map((note, index) => ({ ...note, delay: offset + index * interval }))

const melody: Strike[] = []
let delay = 0
for (const event of twinkle.bars.slice(0, 2).flatMap(bar => bar.events)) {
  melody.push(...event.notes.map(note => ({ ...note, delay, duration: event.beats * .45 })))
  delay += event.beats * .5
}

export const experienceSamples = [
  { name: '扫弦示范', description: '一刷响起一排弦，听 G 和 C 的伴奏。', notes: [...chordStrikes('G', 0, .025), ...chordStrikes('C', 1, .025)] },
  { name: '分解和弦示范', description: '把和弦拆开，一根弦接一根弦地拨。', notes: chordStrikes('Em', 0, .32) },
  { name: '短旋律示范', description: '听《小星星》的开头两小节。', notes: melody },
]
