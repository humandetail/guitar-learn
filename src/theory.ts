import type { TabEvent } from './exercises'

export type TheoryTask = {
  id: string
  kind: 'choice' | 'fretboard' | 'staff' | 'listen'
  prompt: string
  options: { id: string; label: string; string?: number; fret?: number; staffStep?: number }[]
  answer: string
  explanation: string
  events?: TabEvent[]
}
export type TheoryTopic = {
  id: string; stage: 1 | 2 | 3; title: string; lessons: string[]
  paragraphs: string[]; tasks: TheoryTask[]; selfCheck: string
  examples?: { id: string; title: string; events: TabEvent[] }[]
}
export const theoryStages = ['看懂正在弹什么', '读谱与迁移', '理解与编配']
export const theoryTopics: TheoryTopic[] = [{
  id: 'note-names', stage: 1, title: '音名与标准调弦', lessons: ['tuning', 'guitar-basics'],
  paragraphs: [
    '音名用 A、B、C、D、E、F、G 表示音高类别；继续升高又会回到同名音，但八度不同。C4 和 C5 同名，C5 比 C4 高一个八度。',
    '标准调弦从粗到细、第 6 到第 1 弦依次是 E2、A2、D3、G3、B3、E4。数字区分八度，不是弦号或品位；第 6 弦 E2 和第 1 弦 E4 相差两个八度。',
    '音名、音级、品位与手指编号各有含义。TAB 的 2 是第二品，手指编号 2 是中指，简谱 2 是所在调的第二个音级，不能混用。',
  ],
  tasks: [{ id: 'open-sixth', kind: 'choice', prompt: '标准调弦下，第 6 弦空弦的音名是什么？',
    options: [{ id: 'a', label: 'A · 第 6 弦空弦是 A' }, { id: 'e', label: 'B · 第 6 弦空弦是 E' }], answer: 'e',
    explanation: '第 6 弦空弦是 E2。A2 是第 5 弦空弦；E2 的 2 是八度编号。' }],
  selfCheck: '在自己的琴上从第 6 到第 1 弦指出六个空弦音名。拿不准时对照标准调弦列表。',
}]

const n = (string: number, fret: number, beats: TabEvent['beats'] = 1): TabEvent => ({ notes: [{ string, fret }], beats })
const chord = (frets: (number | null)[], beats: TabEvent['beats'] = 2): TabEvent => ({ notes: frets.flatMap((fret, index) => fret === null ? [] : [{ string: 6 - index, fret }]), beats })
const c = [null, 3, 2, 0, 1, 0], g = [3, 2, 0, 0, 0, 3], am = [null, 0, 2, 2, 1, 0], f = [null, null, 3, 2, 1, 1]
const choice = (id: string, prompt: string, labels: string[], answer: number, explanation: string, events?: TabEvent[]): TheoryTask => ({
  id, kind: events ? 'listen' : 'choice', prompt, options: labels.map((label, index) => ({ id: String(index), label })), answer: String(answer), explanation, ...(events ? { events } : {}),
})
theoryTopics.push(
  {
    id: 'fretboard', stage: 1, title: '半音、全音与指板', lessons: ['guitar-basics', 'single-notes', 'chromatic'],
    paragraphs: [
      '在本课程使用的十二平均律中，同一根弦升高一品，音高升高一个半音；相隔两品是一个全音。十二个半音组成一个八度。同一个音可在不同弦上找到，这里先沿一根弦观察。',
      '升号 ♯ 将音升高半音，降号 ♭ 将音降低半音。E 到 F、B 到 C 原本只差半音，不是所有相邻字母都差全音。第 1 弦空弦 E4，1 品 F4，2 品 F♯4，3 品 G4。',
      '在十二平均律里，F♯ 与 G♭ 可以同音，但写法表达的调内关系可能不同。先不要把升降号理解成固定的黑键或品位。图中 0 表示空弦，数字仍是品位。',
    ],
    tasks: [{ id: 'fret-f', kind: 'fretboard', prompt: '从第 1 弦空弦 E4 升高半音，请点选 F4 的位置。', options: [
      { id: 'e', label: '1 弦 0 品 · E4', string: 1, fret: 0 }, { id: 'f', label: '1 弦 1 品 · F4', string: 1, fret: 1 }, { id: 'fs', label: '1 弦 2 品 · F♯4', string: 1, fret: 2 }, { id: 'g', label: '1 弦 3 品 · G4', string: 1, fret: 3 },
    ], answer: 'f', explanation: 'E4 到 F4 是半音，所以在第 1 弦从空弦前进一品。E4 到 F♯4 则是全音。' },
    choice('half-bc', 'B 到 C 相差多少？', ['半音', '全音'], 0, '相邻自然音中 E–F、B–C 是半音；其余相邻字母是全音。')],
    selfCheck: '慢弹第 1 弦 0、1、2、3 品，说出 E、F、F♯、G；比较相邻一品与相隔两品。',
  },
  {
    id: 'rhythm-theory', stage: 1, title: '节奏、时值与休止', lessons: ['rhythm-basics', 'rhythm', 'reading-tab'],
    paragraphs: [
      '拍子是均匀的时间单位，小节把拍子分组。4/4 拍的分母 4 表示以四分音符为一拍，分子 4 表示每小节四拍。BPM 说明每分钟的拍数，本课示范每分钟 60 拍。',
      '在 4/4 中，四分音符 ♩ 是一拍，二分音符 𝅗𝅥 是两拍，全音符 𝅝 是四拍，八分音符 ♪ 是半拍。休止表示相应时间不发声；长音的后续拍子仍要数，但不重新拨弦。',
      '一拍可均分为两个八分音符，数“1 和 2 和 3 和 4 和”；也可均分为四个十六分音符，数“1 e 和 a”。附点增加原时值的一半，四分附点是一拍半。连音线连接同音高音符时合并时值，只在开头发声。',
    ],
    tasks: [choice('rhythm-listen', '听这个 4/4 小节，哪种描述符合示范？', ['每拍都重新弹一下', '弹一拍、停一拍、再弹并延长两拍'], 1,
      '第 1 拍发声，第 2 拍休止，第 3 拍再弹并持续第 4 拍；总计四拍。', [n(3, 0), { notes: [], beats: 1 }, n(3, 0, 2)]),
    choice('eighth-values', '在 4/4 中，两个八分音符合计多久？', ['一拍', '两拍'], 0, '每个八分音符是半拍，两个合计一拍；速度变化不改变这种比例。')],
    selfCheck: '跟着均匀四拍，在第一拍拨弦，第二拍停声，第三拍拨弦并延长到第四拍结束。',
  },
  {
    id: 'scale-intervals', stage: 1, title: 'C 大调、音级与基础音程', lessons: ['reading-tab', 'first-melody'],
    paragraphs: [
      '大调音阶的相邻距离是“全、全、半、全、全、全、半”。从 C 开始得到 C D E F G A B C。简谱标记 1=C 时，1 到 7 对应 C 到 B；换成 1=G 时，1 就是 G，不再固定为 C。',
      '音程描述两音的距离，先数包含两端的字母得到度数，再看半音数确定性质。C–E 是大三度（4 半音），C–E♭ 是小三度（3 半音），C–G 是纯五度（7 半音），C–高八度 C 是纯八度（12 半音）。',
      '简谱数字上方的点表示高八度，下方的点表示低八度。这里的音级 2 是 re；TAB 的 2 则是第二品；和弦图的手指 2 是中指。它们解决的是不同问题。',
    ],
    tasks: [choice('scale-mi', '在 1=C 的简谱里，3 对应什么音名？', ['E', '第 3 品', '中指'], 0, 'C 大调第三音级是 E，不能把音级直接当成品位或手指编号。', [n(2, 1), n(2, 3), n(1, 0), n(2, 1)]),
    choice('interval-third', 'C–E 与 C–E♭ 分别是什么？', ['大三度、小三度', '都是大三度'], 0, '字母 C–D–E 共三度；4 半音是大三度，3 半音是小三度。'),
    { id: 'scale-c-position', kind: 'fretboard', prompt: '第 2 弦空弦是 B3，C 大调的主音 C4 在哪里？', options: [
      { id: 'b', label: '2 弦 0 品 · B3', string: 2, fret: 0 }, { id: 'c', label: '2 弦 1 品 · C4', string: 2, fret: 1 }, { id: 'cs', label: '2 弦 2 品 · C♯4', string: 2, fret: 2 },
    ], answer: 'c', explanation: 'B 到 C 是半音，所以第 2 弦空弦往上一个品位就是 C4。' }],
    selfCheck: '在第 2 弦弹 1、3 品，再弹第 1 弦空弦，说出 C、D、E，以及 C 大调中的 1、2、3。',
  },
  {
    id: 'triads', stage: 1, title: '根音与大小三和弦', lessons: ['first-chord', 'chord-changes', 'fingerpicking'],
    paragraphs: [
      '三和弦由根音、三音、五音构成。大三和弦从根音数是 0、4、7 半音，小三和弦是 0、3、7 半音。根音是命名依据，不一定是演奏中最低的音。',
      'C 大三和弦的构成音是 C E G；Am 是 A C E；Em 是 E G B。大三和弦常只写根音字母，小三和弦加 m。不能仅根据“大调快乐、小调悲伤”的印象判断和弦，实际色彩也取决于上下文。',
      '吉他上按六根弦不代表和弦有六种不同构成音。Em 常用指法从粗到细发 E B E G B E，同名构成音在不同八度重复。不同指法可以表达同一个和弦。',
    ],
    tasks: [choice('em-tones', 'Em 的构成音是哪组？', ['E G B', 'E G♯ B'], 0, 'E–G 是小三度，E–B 是纯五度，所以 E G B 构成 Em。', [chord([0, 2, 2, 0, 0, 0], 4)]),
    choice('am-root', 'Am 的根音与三音是什么？', ['A 与 C', 'C 与 E'], 0, 'Am 以 A 为根音，三音是 C；A–C 的三个半音使它成为小三和弦。')],
    selfCheck: '按常用 Em 指法，逐根说出 E B E G B E，找出哪些音重复，并自行检查是否清晰。',
  },
)

theoryTopics.push(
  {
    id: 'staff', stage: 2, title: '五线谱与吉他读谱', lessons: ['reading-tab', 'single-notes', 'first-melody'],
    paragraphs: [
      '先认谱号：吉他通常用高音谱号 𝄞，五条线从下往上是 E G B D F，四个间是 F A C E。每向上一个线或间，前进一个字母音名。线数不够时加短线：下加一线是 C。',
      '注意八度：吉他实际发声比记谱低一个八度。谱上的第一线 E4 实际发 E3，可弹第 4 弦 2 品；谱上第四间 E5 实际发 E4，可弹第 1 弦空弦。以下谱面题的音名按记谱标注，同时附实际音高。',
      '再看时值：实心符头带符干 ♩ 是四分音符，空心带符干 𝅗𝅥 是二分音符，空心无符干 𝅝 是全音符；带一条符尾 ♪ 是八分音符。4/4 中分别占 1、2、4、半拍，休止符表示相应时长不发声。',
      '小节线分隔拍组，双线常表示段落边界；反复记号提示回到对应起点。♯ 升半音，♭ 降半音，♮ 还原变化音；临时记号通常作用于本小节内同一谱位，调号则持续有效直到改变。',
      '练读一小节：记谱 E5、F5、G5、E5，各为四分音符；实际是 E4 F4 G4 E4，可用第 1 弦 0、1、3、0 品。先按音名找位置，再按均匀四拍弹奏，不把五条谱线当成五根弦。',
    ],
    tasks: [{ id: 'staff-e', kind: 'staff', prompt: '点选高音谱号第一线的音 E4（吉他实际发声 E3）。A、B、C 是候选位置编号。', options: [
      { id: 'c', label: 'A · 下加一线 C4（实际 C3）', staffStep: -2 },
      { id: 'e', label: 'B · 第一线上的 E4（实际 E3）', staffStep: 0 },
      { id: 'g', label: 'C · 第二线上的 G4（实际 G3）', staffStep: 2 },
    ], answer: 'e', explanation: '高音谱号最下面第一线是记谱 E4，吉他实际发 E3，可以弹第 4 弦 2 品。' },
    choice('staff-duration', '4/4 中，两个二分音符合计占多少拍？', ['四拍，一小节', '两拍，半小节'], 0, '二分音符每个两拍，两个共四拍。'),
    choice('staff-guitar', '谱上第四间 E5 在吉他上可用什么位置？', ['第 1 弦空弦，实际 E4', '第 6 弦空弦，实际 E2'], 0, '吉他记谱比实际发声高八度；E5 在吉他上发 E4，可用第 1 弦空弦。', [n(1, 0), n(1, 1), n(1, 3), n(1, 0)])],
    selfCheck: '用第 1 弦 0、1、3、0 品弹 E4 F4 G4 E4，并对应记谱 E5 F5 G5 E5；每音一拍。',
  },
  {
    id: 'transpose', stage: 2, title: '常用调、调号与移调', lessons: ['reading-tab', 'first-melody', 'singing'],
    paragraphs: [
      '本阶段先学 C、G、D、F 四个常用大调。C 大调无升降调号；G 大调有 F♯；D 大调有 F♯、C♯；F 大调有 B♭。调号适用于各八度的对应音名，不只标记旁边那一个谱位。',
      '分别按“全全半全全全半”核对：G A B C D E F♯ G；D E F♯ G A B C♯ D；F G A B♭ C D E F。调号帮助保持大调音阶距离，不是装饰。',
      '把 C 大调短句 C D E C 移到 G 大调，变成 G A B G；音级仍是 1 2 3 1，整体音高改变，内部音程关系保持。若选向下纯四度的实际音区，可从 C4 D4 E4 C4 移为 G3 A3 B3 G3。',
      '找音示例：C4 D4 E4 C4 用 2 弦 1、3 品与 1 弦空弦，再回 2 弦 1 品；G3 A3 B3 G3 可用 3 弦空弦、2 品、2 弦空弦、3 弦空弦。弹唱移调时旋律与伴奏需要协调改变，本阶段先练小范围案例。',
    ],
    tasks: [choice('transpose-123', 'C 大调的 1 2 3 移到 G 大调，对应哪些音名？', ['G A B', 'G A B♭'], 0, 'G 大调音阶开头是 G A B，音级仍是 1 2 3；不能只改变第一个音。', [n(3, 0), n(3, 2), n(2, 0), n(3, 0)]),
    choice('f-key', 'F 大调需要哪个变化音？', ['B♭', 'F♯'], 0, 'F 大调的第四音级是 B♭，使 A–B♭ 为半音；F♯ 属于 G 大调调号。'),
    choice('d-key', 'D 大调调号包含哪些升音？', ['F♯、C♯', '只有 F♯'], 0, 'D E F♯ G A B C♯ D 才保持大调的全全半全全全半。')],
    selfCheck: '弹 C4 D4 E4 C4，再弹 G3 A3 B3 G3，唱出相同的 1 2 3 1，比较整体音高与内部关系。',
  },
  {
    id: 'progressions', stage: 2, title: '顺阶和弦与常见进行', lessons: ['chord-changes', 'singing', 'fingerpicking'],
    paragraphs: [
      '顺阶三和弦只使用当前音阶的音，每隔一个音叠置。在大调中依次为 I、ii、iii、IV、V、vi、vii°；大写表示大三和弦，小写表示小三和弦，° 表示减三和弦。',
      'C 大调依次是 C、Dm、Em、F、G、Am、Bdim。Bdim 是 B D F，根音到五音为减五度；本课先认识名称，不要求学会所有指法。',
      '原创伴奏案例“向前走”：每个和弦两拍，C–Am–F–G，对应 I–vi–IV–V。移到 G 大调时使用 G–Em–C–D；顺序与级数保持。前者可听作两小节 4/4 的短循环，实际歌曲可以采用不同进行。',
      '先用熟悉的 C、Am、F、G 指法练慢速换和弦；F 可先用第 4 到第 1 弦的 3、2、1、1 品小横按版本，不弹第 6、5 弦。移调不仅改和弦字母，还要保留大小和弦性质。',
    ],
    tasks: [choice('progression-g', '把 C–Am–F–G 移到 G 大调，哪组保留 I–vi–IV–V？', ['G–Em–C–D', 'G–E–C–Dm'], 0, 'G 大调的 vi 是 Em，V 是 D；级数和大小性质都要保持。', [chord(c), chord(am), chord(f), chord(g)]),
    choice('diatonic-ii', 'C 大调的 ii 级三和弦是什么？', ['Dm：D F A', 'D：D F♯ A'], 0, 'C 大调没有 F♯，所以顺阶 ii 为 D F A，即 Dm。')],
    selfCheck: '数四拍，用两拍一个和弦慢弹 C–Am–F–G；再比较 G–Em–C–D 的级数关系。不清晰的换指先单独练。',
  },
)

theoryTopics.push(
  {
    id: 'sevenths', stage: 3, title: '七和弦与和弦功能', lessons: ['chord-changes', 'singing'],
    paragraphs: [
      '在三和弦上再叠一个三度，得到七和弦。Cmaj7 是 C E G B；C7 是 C E G B♭；Cm7 是 C E♭ G B♭。大七、小七与属七不是同一种构成，名字中的 7 也不是“按第七品”。',
      '在 C 大调中，C 常作为主功能的落点，Dm、F 常作下属／前属功能，G、G7 常作属功能，引向主和弦。这是理解本课调性案例的方法，不能把所有风格都套成唯一规则。',
      '原创两小节案例“回到家”：G7 两拍，C 两拍，再 C 四拍。G7 的 B 倾向走到 C，F 倾向走到 E，形成可听到的解决。G7 构成音 G B D F；常用指法 3、2、0、0、0、1 品。',
    ],
    tasks: [choice('g7-resolution', '示范从 G7 到 C。在 C 大调语境中，这是什么关系？', ['属到主', '主到属'], 0, 'G7 是 C 大调的属七和弦，C 是主和弦；这个示例呈现属到主的解决。', [chord([3, 2, 0, 0, 0, 1]), chord(c), chord(c, 4)]),
    choice('major-seven', 'Cmaj7 与 C7 的区别是什么？', ['七音分别为 B 与 B♭', '它们完全相同'], 0, 'Cmaj7 为 C E G B；C7 为 C E G B♭。前者根音到七音是大七度，后者是小七度。')],
    selfCheck: '慢弹 G7–C，用耳朵比较张力与落点；再逐弦确认构成音，先不追求快速转换。',
  },
  {
    id: 'inversions', stage: 3, title: '转位与低音安排', lessons: ['fingerpicking', 'solo'],
    paragraphs: [
      '根音用来确定和弦身份，低音是当前实际发出的最低音。C 和弦以 C 为低音是原位，以 E 为低音是第一转位，以 G 为低音是第二转位；构成音仍是 C E G。',
      '斜杠和弦 C/E 表示 C 和弦、E 为低音，不是把和弦改名为 E。C/G 则以 G 为低音。并非所有斜杠和弦都是转位；只有低音属于该和弦构成音时才是转位。',
      '可弹对照：C 从第 5 弦开始弹 x32010；C/E 可弹 032010，使第 6 弦空弦 E2 成为最低音；C/G 可弹 332010。x 表示不弹。先只听低音变化，再检查上方仍是 C E G。',
      '编配时低音可以连接相邻和弦，例如 C–C/E–F 使低音 C–E–F 向上走。选择转位要结合旋律、声音层次与手指可达性，不是低音越多越好。',
    ],
    tasks: [choice('inversion-ear', '听 C，再听 C/E。C/E 的根音和最低音分别是什么？', ['根音 C，最低音 E', '根音 E，最低音 C'], 0, 'C/E 仍是 C 和弦，只将 E 放到低音；根音与低音需要区分。', [chord(c, 4), chord([0, 3, 2, 0, 1, 0], 4)]),
    { id: 'inversion-bass', kind: 'fretboard', prompt: '演奏 032010 的 C/E 时，哪个位置提供最低音 E2？', options: [
      { id: 'e2', label: '6 弦 0 品 · E2', string: 6, fret: 0 }, { id: 'c3', label: '5 弦 3 品 · C3', string: 5, fret: 3 },
    ], answer: 'e2', explanation: '第 6 弦空弦 E2 比第 5 弦 3 品 C3 更低。上方 C E G 仍组成 C 和弦。' }],
    selfCheck: '按 032010 弹 C/E，比较只从第 5 弦开始与包含第 6 弦空弦的声音，确认最低音变化。',
  },
  {
    id: 'harmony', stage: 3, title: '属和弦扩展与借用和弦', lessons: ['singing', 'solo'],
    paragraphs: [
      '先学副属和弦：在 C 大调中，D7（D F♯ A C）不是顺阶和弦，但可作为 G 的属七和弦，形成 D7–G–C，记作 V7/V–V–I。F♯ 倾向上行到 G，短暂强调 G，不必把整个片段都解释成正式转调。',
      '再学属九和弦：G9 由 G B D F A 构成，在 G7 上增加九音 A。吉他上可省略部分构成音，例如采用 x2323x，发 B F A D，是省略根音 G 的 G9 配置；完整根音可由其他声部承担。',
      '借用和弦从同主音的其他调式取材。C 大调可从 C 小调借用 iv：Fm（F A♭ C），形成 F–Fm–C。与 F 大三和弦相比，A 降为 A♭，再可下行到 G，色彩与低音安排不同。',
      '本课只围绕 D7–G–C、G9 的构成与 F–Fm–C 三个案例理解变化音。借用和弦不代表任意换一个小和弦都合理；判断还要听旋律和上下文。',
    ],
    tasks: [choice('secondary-dominant', 'C 大调中，D7–G–C 的 F♯ 主要帮助强调哪个和弦？', ['G', 'Fm'], 0, 'D7 是 G 的副属和弦，F♯ 可向上解决到 G，再由 G 回 C。', [chord([null, null, 0, 2, 1, 2]), chord(g), chord(c, 4)]),
    choice('borrowed-iv', 'C 大调中的 Fm 通常可从哪里借用？', ['同主音 C 小调', '把所有音整体升高半音'], 0, 'Fm 的 F A♭ C 来自同主音 C 小调，A♭ 是相对 C 大调的变化音。', [chord(f), chord([null, null, 3, 1, 1, 1]), chord(c, 4)]),
    choice('dominant-nine', 'G9 相比 G7 加入哪个音？', ['A，根音上方的九音', 'A♭，固定的小九音'], 0, 'G9 通常包含 G B D F A；小九音 A♭ 需明确写成 G7(♭9) 等。')],
    selfCheck: '比较 F 的 xx3211 与 Fm 的 xx3111，再回 C，听第 3 弦 A–A♭ 的半音变化。',
  },
  {
    id: 'arranging', stage: 3, title: '为旋律配和弦与伴奏', lessons: ['singing', 'solo', 'fingerpicking'],
    paragraphs: [
      '原创两小节旋律“慢慢回家”，C 大调、4/4、每音一拍：E4 E4 E4 C4 | G4 E4 D4 C4。先单弹并唱出 3 3 3 1 | 5 3 2 1，找出强拍与句末的音，再考虑伴奏。',
      '方案 A：C–C，每小节一个 C，以 C3 为低音。第一小节旋律均为 C 和弦音；第二小节 D 是经过音，连接 E 与 C。整体稳定，适合先练旋律与低音配合。',
      '方案 B：Am–C，第一小节用 A2 低音和 Am，第二小节回 C。第一小节的 E、C 同时也是 Am 的和弦音，因此可以保留旋律而改变色彩与低音走向。它与方案 A 都合理，不代表只有这两种编配。',
      '练习步骤：先单弹旋律；再只加入每小节第一拍的低音，并让低音延续四拍；熟悉后在每小节第二拍加入一个内声部。下方示范按此安排，先听纯旋律，再比较两种伴奏。先保证旋律清晰，和弦音不必每拍全部弹出。',
      '最后尝试解释：你选了哪个和弦、最低音是什么、旋律哪些是和弦音，哪些是连接经过音？换一个方案后是否仍可唱清旋律？以下小任务检查案例理解，拿琴完成情况另行自查，不会自动评判你的编配。',
    ],
    tasks: [choice('arrangement-options', '第一小节旋律 E E E C，可否分别使用 C 或 Am？', ['两种都可以，色彩与低音走向不同', '只能 C，其他和弦都错'], 0, 'E 与 C 都是 C 和 Am 的共同构成音，两种方案都合理，并非唯一答案；实际还需结合前后句。'),
    choice('passing-note', '第二小节 G E D C 配 C 和弦，其中 D 在案例中起什么作用？', ['连接 E 与 C 的经过音', '证明 C 和弦一定错误'], 0, 'D 不是 C E G 中的构成音，但在该短句中连接 E 与 C；并非每个旋律音都必须是和弦音。')],
    selfCheck: '按下方逐拍动作，先弹旋律，再尝试方案 A 或 B。低音与旋律同时出现时一起拨，听清旋律并自行检查按弦是否舒适。',
    examples: [
      { id: 'melody', title: '纯旋律', events: [n(1, 0), n(1, 0), n(1, 0), n(2, 1), n(1, 3), n(1, 0), n(2, 3), n(2, 1)] },
      { id: 'a', title: '方案 A', events: [
        { notes: [{ string: 5, fret: 3, sustainBeats: 4, role: 'bass' }, { string: 1, fret: 0, role: 'melody' }], beats: 1 },
        { notes: [{ string: 3, fret: 0, role: 'fill' }, { string: 1, fret: 0, role: 'melody' }], beats: 1 }, n(1, 0), n(2, 1),
        { notes: [{ string: 5, fret: 3, sustainBeats: 4, role: 'bass' }, { string: 1, fret: 3, role: 'melody' }], beats: 1 },
        { notes: [{ string: 3, fret: 0, role: 'fill' }, { string: 1, fret: 0, role: 'melody' }], beats: 1 }, n(2, 3), n(2, 1),
      ] },
      { id: 'b', title: '方案 B', events: [
        { notes: [{ string: 5, fret: 0, sustainBeats: 4, role: 'bass' }, { string: 1, fret: 0, role: 'melody' }], beats: 1 },
        { notes: [{ string: 2, fret: 1, role: 'fill' }, { string: 1, fret: 0, role: 'melody' }], beats: 1 }, n(1, 0), n(2, 1),
        { notes: [{ string: 5, fret: 3, sustainBeats: 4, role: 'bass' }, { string: 1, fret: 3, role: 'melody' }], beats: 1 },
        { notes: [{ string: 3, fret: 0, role: 'fill' }, { string: 1, fret: 0, role: 'melody' }], beats: 1 }, n(2, 3), n(2, 1),
      ] },
    ],
  },
)
