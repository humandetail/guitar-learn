import { useId, useRef, useState } from 'react'
import './beginner-diagrams.css'

type DiagramKind = 'anatomy' | 'notation' | 'rhythm-values'
type GuitarPart = { id: string; name: string; where: string; purpose: string; point: [number, number] }

// Original text; part relationships checked against Yamaha's Acoustic Guitar guide.
const guitarParts: GuitarPart[] = [
  { id: 'head', name: '琴头', where: '琴颈最上端，装着琴钮。', purpose: '承托调弦装置；沿着琴弦往上看，就能找到它。', point: [171, 40] },
  { id: 'tuners', name: '琴钮', where: '琴头两侧或同一侧的旋钮。', purpose: '转动会收紧或放松对应琴弦，用来调音。调音前沿弦确认对应琴钮，不猜方向。', point: [140, 52] },
  { id: 'nut', name: '琴枕', where: '琴头与指板交界处的窄条，也叫上弦枕。', purpose: '六个槽把琴弦分开并托住它们；数第一品从这里向琴身开始。', point: [170, 85] },
  { id: 'neck', name: '琴颈', where: '连接琴头与琴身的长条部分。', purpose: '按弦手环绕的地方，拇指通常轻靠背面。正面的按弦表面叫指板。', point: [193, 180] },
  { id: 'fingerboard', name: '指板', where: '琴颈正面、琴弦下面的长条表面。', purpose: '手指在这里按弦。它上面的金属条叫品丝，格子对应品位。', point: [170, 180] },
  { id: 'frets', name: '品丝', where: '横跨指板的一根根金属条。', purpose: '按住琴弦时，弦接触品丝来改变发声音高。指尖放在品位格内、靠近品丝，不压在金属上。', point: [175, 140] },
  { id: 'strings', name: '琴弦', where: '从琴头沿指板延伸到琴桥的六根弦。', purpose: '拨动后振动发声；最粗为第 6 弦，最细为第 1 弦。粗细、弦号与谱上的位置要分清。', point: [171, 315] },
  { id: 'body', name: '琴身', where: '下方较宽的中空部分。', purpose: '支撑琴桥，面板与琴身帮助把弦的振动变成能听见的声音。弹奏时让它稳定靠在身上。', point: [100, 333] },
  { id: 'soundhole', name: '音孔', where: '原声吉他面板上的开口，常在琴弦下方。', purpose: '与琴身共鸣有关，也是辨认拨弦区域的参照。不同琴型的孔形、位置可能不同。', point: [170, 273] },
  { id: 'bridge', name: '琴桥', where: '音孔下方、固定在面板上的部件。', purpose: '承托下弦枕并传递琴弦振动。有些钢弦琴用固弦钉固定弦，尼龙弦琴常采用系弦，外观会不同。', point: [138, 350] },
  { id: 'saddle', name: '下弦枕', where: '琴桥上托住琴弦的一条窄条。', purpose: '与上弦枕一起支撑空弦两端，并把振动传给琴桥。认识它即可，入门时不用自行调整。', point: [172, 341] },
]

function GuitarAnatomy() {
  const [selected, setSelected] = useState(guitarParts[0])
  const description = useRef<HTMLElement>(null)
  const descriptionId = useId()
  const is = (id: string) => selected.id === id
  function selectPart(part: GuitarPart) {
    setSelected(part)
    if (window.matchMedia('(min-width: 261px)').matches) requestAnimationFrame(() => description.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }))
  }
  const bodyPath = 'M150 205 C122 191 95 210 96 237 C97 254 116 263 111 279 C105 296 78 310 80 346 C82 386 121 405 170 405 C219 405 258 386 260 346 C262 310 235 296 229 279 C224 263 243 254 244 237 C245 210 218 191 190 205 Z'
  return <figure className="beginner-diagram guitar-anatomy" aria-label="认识吉他各部位">
    <div className="anatomy-heading"><strong>整把琴，先认位置</strong><span>点部位名称查看</span></div>
    <div className="anatomy-explorer">
    <svg className="anatomy-guitar" viewBox="72 6 200 410" role="img" aria-label={`原声吉他正面图，当前突出显示${selected.name}。${selected.where}`}>
      <path d={bodyPath} className={is('body') ? 'guitar-shape part-selected' : 'guitar-shape'} />
      <path d="M151 80 L189 80 L196 233 L144 233 Z" className={is('neck') ? 'guitar-neck part-selected' : 'guitar-neck'} />
      <path d="M150 27 Q170 18 190 27 L187 83 L153 83 Z" className={is('head') ? 'guitar-head part-selected' : 'guitar-head'} />
      <g className={is('tuners') ? 'guitar-tuners part-selected' : 'guitar-tuners'}>
        {[39, 54, 69].map(y => <g key={y}>
          <path d={`M151 ${y}h-12M189 ${y}h12`} />
          <rect x="132" y={y - 4} width="10" height="8" rx="3" /><rect x="198" y={y - 4} width="10" height="8" rx="3" />
          <circle cx="159" cy={y} r="3" /><circle cx="181" cy={y} r="3" />
        </g>)}
      </g>
      <path d="M155 86 L185 86 L190 248 L150 248 Z" className={is('fingerboard') ? 'guitar-fingerboard part-selected' : 'guitar-fingerboard'} />
      <g className={is('frets') ? 'guitar-frets part-selected' : 'guitar-frets'}>
        {[108, 125, 140, 154, 167, 179, 190, 200, 210, 219, 228, 237].map((y, i) => <line key={y} x1={155 - i * .4} x2={185 + i * .4} y1={y} y2={y} />)}
      </g>
      {[133, 160, 184, 205, 232].map(y => <circle key={y} cx="170" cy={y} r="2" fill="#dce3ee" />)}
      <circle cx="170" cy="273" r="34" fill="none" stroke="#a6b4ce" strokeWidth="2" />
      <circle cx="170" cy="273" r="28" className={is('soundhole') ? 'guitar-hole part-selected' : 'guitar-hole'} />
      <path d="M126 334 Q170 329 214 334 L216 355 Q170 363 124 355 Z" className={is('bridge') ? 'guitar-bridge part-selected' : 'guitar-bridge'} />
      <line x1="153" x2="187" y1="85" y2="85" className={is('nut') ? 'guitar-nut part-selected' : 'guitar-nut'} />
      <line x1="152" x2="188" y1="341" y2="341" className={is('saddle') ? 'guitar-nut part-selected' : 'guitar-nut'} />
      <g className={is('strings') ? 'guitar-strings part-selected' : 'guitar-strings'}>
        {[0, 1, 2, 3, 4, 5].map(index => <path key={index} d={`M${index < 3 ? 159 : 181} ${39 + index % 3 * 15} L${158 + index * 4.8} 85 L${155 + index * 6} 349`} strokeWidth={1.8 - index * .18} />)}
      </g>
      {[0, 1, 2, 3, 4, 5].map(index => <circle key={index} cx={155 + index * 6} cy="350" r="2.2" fill="#e9eef5" />)}
      <g className="anatomy-pointer" aria-hidden="true">
        <path d={`M${selected.point[0]} ${selected.point[1]} L263 ${selected.point[1]} L263 19 H244`} />
        <circle cx={selected.point[0]} cy={selected.point[1]} r="5" />
        <text x="241" y="24" textAnchor="end">{selected.name}</text>
      </g>
    </svg>
    <div className="anatomy-parts" role="group" aria-label="选择吉他部位">
      {guitarParts.map(part => <button type="button" key={part.id} aria-label={`认识${part.name}`} aria-pressed={selected.id === part.id} aria-controls={descriptionId} onClick={() => selectPart(part)}>{part.name}</button>)}
    </div>
    </div>
    <figcaption id={descriptionId} ref={description} className="anatomy-description" aria-live="polite" aria-atomic="true">
      <strong>{selected.name}</strong><p><b>在哪里：</b>{selected.where}</p><p><b>做什么：</b>{selected.purpose}</p>
    </figcaption>
  </figure>
}

function NotationComparison() {
  return <figure className="beginner-diagram notation-comparison" aria-label="三种数字 2 的含义">
    <div className="notation-example">
      <div className="notation-example-heading"><strong>六线谱上的 2</strong><span>数字＝品位</span></div>
      <svg viewBox="0 0 300 118" role="img" aria-label="六线谱最上方为第1弦，最下方为第6弦。第1弦上的数字2表示按第1弦第2品。">
        {[1, 2, 3, 4, 5, 6].map((string, index) => <g key={string}><text x="13" y={24 + index * 16}>{string}</text><line x1="35" x2="282" y1={20 + index * 16} y2={20 + index * 16} /></g>)}
        <rect x="124" y="6" width="34" height="27" rx="4" fill="#e4eaff" /><text className="notation-blue-number" x="141" y="28" textAnchor="middle">2</text>
      </svg>
      <p>按第 1 弦第 2 品。最上面是细的第 1 弦，按谱从左往右弹。</p>
    </div>
    <div className="notation-example">
      <div className="notation-example-heading"><strong>指法图圆点里的 2</strong><span>数字＝手指</span></div>
      <svg viewBox="0 0 300 98" role="img" aria-label="和弦指法图中，圆点内的数字2表示使用中指。此图中圆点在第5弦第2品。">
        {[6, 5, 4, 3, 2, 1].map((string, index) => <g key={string}><text x={65 + index * 34} y="16" textAnchor="middle">{string}弦</text><line x1={65 + index * 34} x2={65 + index * 34} y1="30" y2="90" /></g>)}
        {[30, 60, 90].map(y => <line key={y} x1="65" x2="235" y1={y} y2={y} strokeWidth={y === 30 ? 3 : 1} />)}
        <text x="16" y="50">1品</text><text x="16" y="80">2品</text>
        <circle cx="99" cy="75" r="13" fill="#254dff" /><text className="notation-finger" x="99" y="81" textAnchor="middle">2</text>
      </svg>
      <p>用中指按圆点所在的位置。食指 1、中指 2、无名指 3、小指 4。</p>
    </div>
    <div className="notation-example">
      <div className="notation-example-heading"><strong>简谱里的 2</strong><span>数字＝音级</span></div>
      <div className="numbered-notation" role="img" aria-label="在1等于C的简谱中，1、2、3对应do、re、mi，2是re，即D音，不是第二品。"><span>1=C</span><div><span>1<small>do</small></span><strong>2<small>re</small></strong><span>3<small>mi</small></span></div></div>
      <p>在 1=C 时，2 是 re（D 音）。它没有直接指定哪根弦、哪一品。</p>
    </div>
    <figcaption>先认谱的类型，再解释数字；三种「2」不能互相替换。</figcaption>
  </figure>
}

function NoteSymbol({ kind }: { kind: 'quarter' | 'half' | 'rest' }) {
  return <svg className="rhythm-note-symbol" viewBox="0 0 50 66" aria-hidden="true">
    {kind === 'rest' ? <path d="M26 5 l9 15 -14 14 12 11 c-13 -5 -16 4 -7 13 -16 -5 -18 -17 -6 -23 l-7 -12 14 -13 Z" fill="currentColor" /> : <>
      <ellipse cx="20" cy="51" rx="11" ry="7" transform="rotate(-20 20 51)" fill={kind === 'half' ? '#f1f4f8' : 'currentColor'} stroke="currentColor" strokeWidth="2" />
      <path d="M30 48 V8" stroke="currentColor" strokeWidth="3" />
    </>}
  </svg>
}

function RhythmValues() {
  return <figure className="beginner-diagram rhythm-values" aria-label="四四拍中的音符与休止">
    <p className="rhythm-context"><strong>先用 4/4 拍来认识</strong><span>每小节 4 拍，四分音符算 1 拍。</span></p>
    <div className="rhythm-value-list">
      <div><NoteSymbol kind="quarter" /><strong>四分音符</strong><span>弹响，持续 1 拍</span></div>
      <div><NoteSymbol kind="half" /><strong>二分音符</strong><span>弹一次，持续 2 拍</span></div>
      <div><NoteSymbol kind="rest" /><strong>四分休止</strong><span>安静 1 拍，不弹</span></div>
    </div>
    <div className="rhythm-measure" role="img" aria-label="一小节示例：第1拍弹一下，第2拍停止声音休止，第3拍再弹一下并延续到第4拍结束。">
      <div><b>1</b><span className="rhythm-attack">弹</span></div><div><b>2</b><span className="rhythm-rest">停</span></div><div><b>3</b><span className="rhythm-attack">弹</span></div><div><b>4</b><span>延续</span></div>
    </div>
    <figcaption>第 2 拍让弦停下来；第 4 拍让第 3 拍的音继续，不再拨一次。</figcaption>
  </figure>
}

export default function BeginnerDiagrams({ kind }: { kind: DiagramKind }) {
  if (kind === 'anatomy') return <GuitarAnatomy />
  if (kind === 'notation') return <NotationComparison />
  return <RhythmValues />
}
