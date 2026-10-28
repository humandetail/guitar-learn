export type GuitarPart = { id: string; name: string; where: string; purpose: string; point: [number, number] }

// Original text; part relationships checked against Yamaha's Acoustic Guitar guide.
export const guitarParts: GuitarPart[] = [
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

