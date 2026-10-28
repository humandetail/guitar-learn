import { repertoire } from './repertoire'
import type { GradedScore } from './repertoire-types'
import type { TabEvent, TabNote } from './exercises'
import { builtinChords } from './chords'

const foundations: GradedScore[] = repertoire.map(song => ({
  ...song, songId: song.id, level: 1, route: 'foundation', key: 'G 大调', legacyAccompaniment: true,
  sourceNote: '传统旋律，本项目选择弦位与简化和声；旋律谱和伴奏谱分别练习。',
  technique: { title: '先读弦，再读品', steps: ['先点一列，看清弦号和品位，再拨响。', '1 拍弹一次；2 拍、4 拍只弹一次，数够拍数。', '两小节慢练，再接起来弹完整。'] },
  readiness: ['以 60 BPM 连续弹完两遍，不因找弦停拍。', '能分清短音和长音，最后一个音也数够拍数。'],
}))

const positions = {
  D3: { string: 4, fret: 0 }, G3: { string: 3, fret: 0 },
  A3: { string: 3, fret: 2, finger: 2 }, B3: { string: 2, fret: 0 },
  C4: { string: 2, fret: 1, finger: 1 }, D4: { string: 2, fret: 3, finger: 3 },
} satisfies Record<string, TabNote>
const n = (pitch: keyof typeof positions, beats: TabEvent['beats'] = 1): TabEvent => ({ notes: [{ ...positions[pitch] }], beats })
const ode: GradedScore = {
  id: 'ode-to-joy', songId: 'ode-to-joy', title: '欢乐颂', subtitle: '完整主题 · 附点节奏',
  level: 1, route: 'foundation', key: 'G 大调', bpm: 50,
  summary: '16 小节主题，放在单音入门最后练；先学会 1.5 拍与半拍。',
  focus: '完整主题 · 半拍与附点 · 句尾不同',
  source: [{ label: 'Carnegie Hall · 贝多芬主题教学谱', url: 'https://www.carnegiehall.org/Education/Programs/Link-Up/National-Program/The-Orchestra-Sings/Ode-to-Joy' }],
  sourceNote: '贝多芬《第九交响曲》欢乐颂主题的 16 小节吉他练习编配，并非整部交响曲。移调到 G 大调；第 12 小节末与第 13 小节首的连线同音改为重新拨弦，便于分段练习。和声与弦位由本项目编配，不使用来源页面的现代歌词或钢琴伴奏。',
  tips: ['先把前 8 小节分成两句，比较第 4、8 小节的不同结尾。', '第 10、11 小节出现半拍：两个半拍等于一拍，不要加快整小节。', '第 12 小节第 3 拍是第 4 弦空弦低音，随后回到第 2 弦空弦。', '最后四小节回到熟悉的旋律。先 50 BPM，完整弹两遍再加速。'],
  prerequisites: [{ lessonId: 'reading-tab', label: '认识六线谱' }, { lessonId: 'rhythm-basics', label: '数拍与延音' }, { lessonId: 'chromatic', label: '慢速换弦' }],
  technique: { title: '第一次读半拍与 1.5 拍', steps: ['把一拍平均分成两半，口数“1 和 2 和 3 和 4 和”。', '0.5 拍只占一个字；1.5 拍占三个字。例如第 4 小节：B 在“1”弹，A 在“2 和”的“和”弹，下一个 A 在“3”弹。', '先在第 4 小节慢数：长、短、两拍。数顺后再拿琴，速度从 40–50 BPM 开始。'] },
  readiness: ['能数着“1 和 2 和”弹准长短音，没有把 1.5 拍弹成 1 拍。', '能在 50 BPM 完整弹完 16 小节，最后的长音没有抢拍。'],
  bars: [
    { chord: 'G', events: [n('B3'), n('B3'), n('C4'), n('D4')] },
    { chord: 'D', events: [n('D4'), n('C4'), n('B3'), n('A3')] },
    { chord: 'G', events: [n('G3'), n('G3'), n('A3'), n('B3')] },
    { chord: 'D', events: [n('B3', 1.5), n('A3', .5), n('A3', 2)] },
    { chord: 'G', events: [n('B3'), n('B3'), n('C4'), n('D4')] },
    { chord: 'D', events: [n('D4'), n('C4'), n('B3'), n('A3')] },
    { chord: 'G', events: [n('G3'), n('G3'), n('A3'), n('B3')] },
    { chord: 'G', events: [n('A3', 1.5), n('G3', .5), n('G3', 2)] },
    { chord: 'D', events: [n('A3'), n('A3'), n('B3'), n('G3')] },
    { chord: 'G', events: [n('A3'), n('B3', .5), n('C4', .5), n('B3'), n('G3')] },
    { chord: 'D', events: [n('A3'), n('B3', .5), n('C4', .5), n('B3'), n('A3')] },
    { chord: 'D', events: [n('G3'), n('A3'), n('D3'), n('B3')] },
    { chord: 'G', events: [n('B3'), n('B3'), n('C4'), n('D4')] },
    { chord: 'D', events: [n('D4'), n('C4'), n('B3'), n('A3')] },
    { chord: 'G', events: [n('G3'), n('G3'), n('A3'), n('B3')] },
    { chord: 'G', events: [n('A3', 1.5), n('G3', .5), n('G3', 2)] },
  ],
}

type Bar = GradedScore['bars'][number]
const chordNotes = (name: string): TabNote[] => {
  const chord = builtinChords.find(item => item.name === name)!
  return chord.frets.flatMap((fret, i) => fret === null ? [] : [{ string: 6 - i, fret, ...(chord.fingers?.[i] ? { finger: chord.fingers[i]! } : {}) }])
}
function accompaniment(bars: Bar[], arpeggio: boolean): Bar[] {
  return bars.map(bar => {
    const notes = chordNotes(bar.chord)
    return { chord: bar.chord, events: arpeggio
      ? [notes[0].string, 3, 2, 1].map(string => ({ notes: [{ ...notes.find(note => note.string === string)! }], beats: 1, chord: bar.chord }))
      : [0, 1].map(() => ({ notes: notes.map(note => ({ ...note })), beats: 2, chord: bar.chord })) }
  })
}
function vocal(bars: Bar[], words: string): TabEvent[][] {
  let at = 0
  return bars.map(bar => bar.events.map(event => ({ ...event, notes: event.notes.map(note => ({ ...note })), lyric: [...words][at++] })))
}
const lyricNote = '本项目原创中文练习词，配合本页完整旋律使用；不是这首歌曲的通行中文译词。每个字对应旋律谱的一次起音，长音把该字唱够拍数。'
const maryLyrics = { title: '中文练习词 · 本项目原创', lines: ['清晨风儿轻轻吹，', '听一听，多清脆。', '手指跟着节拍前行，', '慢慢弹完它。'], note: lyricNote }
const twinkleLyrics = { title: '中文练习词 · 本项目原创', lines: ['窗边晚风轻轻过，', '我的琴声慢慢和。', '左手换弦别着急，', '右手跟拍唱起歌。', '一段一段连起来，', '最后余音留给我。'], note: lyricNote }
const frereLyrics = { title: '中文练习词 · 本项目原创', lines: ['早晨来了，早晨来了，', '听风声，听风声。', '伸伸手来弹琴，伸伸手来弹琴，', '慢慢弹，慢慢弹。'], note: lyricNote }
const words = (lyrics: typeof maryLyrics) => lyrics.lines.join('').replace(/[，。]/g, '')

function singing(base: GradedScore, id: string, arpeggio: boolean, lyrics: typeof maryLyrics): GradedScore {
  return {
    ...base, id, level: arpeggio ? 3 : 2, route: 'singing', legacyAccompaniment: false,
    subtitle: arpeggio ? '分解和弦 · 完整弹唱' : '两拍一次 · 和弦配唱', bpm: 60,
    summary: arpeggio ? '用稳定的四拍分解伴奏，配原创中文练习词唱完整首。' : '第 1、3 拍各轻扫一次；唱完整旋律，先让换和弦不断拍。',
    focus: arpeggio ? '分解和弦 · 手和声音保持各自节奏 · 完整收尾' : '开放和弦 · 两拍轻扫 · 对齐每句开头',
    bars: accompaniment(base.bars, arpeggio), vocalBars: vocal(base.bars, words(lyrics)), lyrics,
    sourceNote: `${base.sourceNote} 本弹唱版使用本项目原创中文练习词与伴奏；旋律谱负责学唱，伴奏谱负责手上的动作。`,
    prerequisites: [{ lessonId: 'chord-changes', label: '和弦切换' }, { lessonId: arpeggio ? 'fingerpicking' : 'rhythm', label: arpeggio ? '分解伴奏' : '跟拍伴奏' }, { lessonId: 'singing', label: '第一次边弹边唱' }],
    technique: arpeggio ? { title: '四拍分解伴奏怎么拨', steps: ['先按好当前和弦。第 1 拍拇指拨最低的可弹弦：G 用 6 弦、C 用 5 弦、D 用 4 弦。', '第 2、3、4 拍依次拨 3、2、1 弦，可用食指、中指、无名指；每拍只拨一次。', '先只拨弦并数“1、2、3、4”，连续两遍不乱后再轻声加歌词。歌词较密时，手仍按自己的四拍走。'] }
      : { title: '第一次把声音放进伴奏', steps: ['先打开和弦指法，逐弦确认响亮。G 从 6 弦、C 从 5 弦、D 从 4 弦开始，避开标 × 的弦。', '慢数“1、2、3、4”，只在 1、3 轻扫一次；2、4 让声音延续。下一小节第 1 拍换和弦。', '先选旋律谱，把练习词唱熟；再选伴奏谱，一次只加两小节歌词。起唱前自己数一小节预备拍。'] },
    tips: ['先把每两小节的旋律唱准，句尾长音不要唱成重复字。', arpeggio ? '拇指动作小一点，高音轻拨；每次换和弦先到位低音，再补齐其余手指。' : '换和弦前想好下一组手型；如果会停拍，先降到 40–50 BPM。', '合成示范只有琴音，没有人声。用旋律谱学唱后，再跟伴奏谱唱；不需要同时弹旋律谱。', '两小节顺畅后接四小节，最后选全曲，从第一句唱到结尾。'],
    readiness: ['能在 60 BPM 从头到尾边弹边唱，换和弦不丢拍。', '声音进入时手上的节奏仍然稳定，最后一拍也完整结束。'],
  }
}

// Restore the traditional durations from the deliberately doubled L1 exercise.
const frere: GradedScore = { ...foundations[2], bars: Array.from({ length: 8 }, (_, i) => ({ chord: ['G', 'G', 'G', 'G', 'D', 'D', 'G', 'G'][i], events: foundations[2].bars.slice(i * 2, i * 2 + 2).flatMap(bar => bar.events.map(event => ({ ...event, beats: (event.beats / 2) as TabEvent['beats'] }))) })) }
const frereSinging: GradedScore = {
  ...singing(frere, 'frere-sing', true, frereLyrics), subtitle: '半拍唱词 · 完整弹唱',
  summary: '回到常用的 8 小节节奏：嘴唱半拍，手保持每拍一拨。',
  sourceNote: '传统 Frère Jacques 第一声部完整主题，恢复常用音值，共 8 小节；是入门 16 小节版所有音值减半，不是删掉后半首。本项目原创中文练习词与分解伴奏，非通行中文译词。',
  technique: { title: '嘴唱半拍，手保持整拍', steps: ['这里恢复常用 8 小节节奏。口数“1 和 2 和 3 和 4 和”，两个 0.5 拍合起来才是一拍。', '第 5、6 小节的前四个字各半拍。先拍手唱“伸伸手来”，让两个字落在同一拍的前后两半。', '伴奏仍每拍拨一次根音、3、2、1 弦。先单独练嘴，再单独练手，最后从 40 BPM 合起来。'] },
  tips: ['先比较入门版：旋律音序一样，全部音值缩短一半，合成 8 小节。', '每小节第 1 拍拇指拨根音，第 2、3、4 拍依次拨 3、2、1 弦。', '第 5、6 小节不要让右手跟着每个字加快，两个字有时只占一拍。', '选全曲唱完一轮；最后“弹”字唱满两拍，右手继续完成这一小节。'],
}

const bass = (chord: string, alternate = false): TabNote => chord === 'C'
  ? { string: alternate ? 6 : 5, fret: 3, finger: 3, role: 'bass' }
  : chord === 'D' ? { string: alternate ? 5 : 4, fret: 0, role: 'bass' }
    : alternate ? { string: 4, fret: 0, role: 'bass' } : { string: 6, fret: 3, finger: 3, role: 'bass' }
const melodic = (note: TabNote): TabNote => ({ ...note, ...(note.fret === 3 ? { finger: 4 } : note.string === 3 && note.fret === 2 ? { finger: 1 } : {}), role: 'melody' })

function fingerstyleBars(bars: Bar[], filled: boolean): Bar[] {
  return bars.map(bar => {
    if (!filled) return { chord: bar.chord, events: bar.events.map((event, i) => ({ ...event, notes: [...(i === 0 ? [bass(bar.chord)] : []), ...event.notes.map(melodic)] })) }
    const result: TabEvent[] = []
    let beat = 0
    for (const event of bar.events) {
      for (let part = 0; part < event.beats; part += .5) {
        const melodyNote = event.notes[0]
        const notes: TabNote[] = []
        if (part === 0) notes.push({ ...melodic(melodyNote), sustainBeats: event.beats })
        const alternate = beat >= 2
        const currentBass = bass(bar.chord, alternate)
        if ((beat === 0 || beat === 2) && currentBass.string !== melodyNote.string) notes.push({ ...currentBass, sustainBeats: 2 })
        // Fill on the offbeat only, below the melody, on neither held voice's string.
        if (beat % 1 === .5) {
          const fill: TabNote = bar.chord === 'C' ? { string: 4, fret: 2, finger: 2 }
            : bar.chord === 'D' ? { string: alternate ? 4 : 5, fret: 0 }
              : alternate ? { string: 5, fret: 2, finger: 2 } : { string: 4, fret: 0 }
          const safeFill = fill.string === melodyNote.string ? { string: 6, fret: 2, finger: 2 } : fill
          notes.push({ ...safeFill, role: 'fill', sustainBeats: .5 })
        }
        if (notes.length) result.push({ notes, beats: .5, ...(beat === 0 ? { chord: bar.chord } : {}) })
        else result[result.length - 1].beats = (result[result.length - 1].beats + .5) as TabEvent['beats']
        beat += .5
      }
    }
    return { chord: bar.chord, events: result }
  })
}
function fingerstyle(base: GradedScore, id: string, filled: boolean): GradedScore {
  return {
    ...base, id, level: filled ? 5 : 4, route: 'fingerstyle', legacyAccompaniment: false, bpm: filled ? 50 : 60,
    subtitle: filled ? '交替低音与填充 · 完整指弹' : '每小节低音 · 双声部起步',
    summary: filled ? '旋律保留，加入第 1、3 拍低音和半拍填充，独自弹完整主题。' : '在熟悉旋律每小节的第一个音加低音，第一次让两根弦同时响。',
    focus: filled ? '旋律延音 · 交替低音 · 半拍填充 · 声部轻重' : '拇指与手指同拨 · 旋律突出 · 完整乐句',
    bars: fingerstyleBars(base.bars, filled),
    sourceNote: `${base.sourceNote} 本指弹版由项目独立编配；${filled ? '保留每个旋律音的时值，另加低音和填充声部。' : '每小节起音加入根音；低音与该旋律音一起结束，不要求整小节持续。'}`,
    prerequisites: [{ lessonId: 'chromatic', label: '手指独立练习' }, { lessonId: 'fingerpicking', label: '分解伴奏' }, { lessonId: 'solo', label: '旋律加低音' }],
    technique: { title: filled ? '旋律在延长，其他手指继续拨' : '第一次同时拨两根弦', steps: [
      '拇指负责第 4、5、6 弦；食指、中指、无名指可分别负责第 3、2、1 弦。同一列的多个数字要一起拨。',
      '按弦手：低音的 3 品用无名指；旋律的 2 弦 3 品改用小指，3 弦 2 品用食指，给伴奏留出手指。',
      filled ? '每拍分“拍、和”：1、3 拍拨低音，“和”轻拨填充音。标注延音的旋律继续保持，不能被下一列动作截断；只有新起音才再拨。' : '先只练第一列的同时拨弦，旋律稍响、低音稍轻；随后继续旋律，不要每个音都加低音。',
      filled ? '先从 40 BPM 练两小节，数拍保持均匀。低音每两拍更换；同弦下一次起音前，结束旧音。' : '听到某根弦闷住时，检查按弦手是否碰到旁边弦；放慢练清楚再连句。',
    ] },
    tips: [
      '先返回同曲的单音版，确认不看手也能找到旋律；加入低音后仍要听得出这条旋律。',
      filled ? '半拍列显示的是下次动作的间隔；旋律、低音各自延长多久，看当前动作中的延音说明。' : '低音只出现在每小节开头；把它与旋律一起拨响后，按谱继续走。',
      '不要把完整和弦形状死按住，按照这一列与仍在延长的音安排手指。',
      filled ? '先练旋律和低音，再轻轻加填充音；最后选全曲，连完所有乐句。' : '两小节慢练后接四小节，最后选全曲。完整弹两遍再进入五级。',
    ],
    readiness: [filled ? '以 50 BPM 完整演奏，旋律延音没有被填充音截断。' : '以 60 BPM 连续弹完，低音与旋律起音同时落拍。', '不用唱也能听出完整旋律，低音与填充音没有盖过它。'],
  }
}

export const gradedRepertoire: GradedScore[] = [
  ...foundations, ode,
  singing(foundations[0], 'mary-sing', false, maryLyrics), singing(foundations[1], 'twinkle-sing', false, twinkleLyrics),
  singing(foundations[1], 'twinkle-arpeggio', true, twinkleLyrics), frereSinging,
  fingerstyle(foundations[0], 'mary-bass', false), fingerstyle(ode, 'ode-bass', false),
  fingerstyle(foundations[1], 'twinkle-fingerstyle', true), fingerstyle(ode, 'ode-fingerstyle', true),
]
