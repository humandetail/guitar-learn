import { midiNote, openMidi, type Chord, type Settings } from './model'

export default function ChordDiagram({ chord, settings, onPlayString }: { chord: Chord; settings: Settings; onPlayString?: (index: number) => void }) {
  const order = settings.leftHanded ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5]
  const pressed = [...chord.frets.filter((fret): fret is number => fret !== null && fret > 0), ...(chord.barres?.map(barre => barre.fret) ?? [])]
  const start = pressed.length && Math.max(...pressed) > 5 ? Math.min(20, ...pressed) : 1
  const end = Math.min(24, Math.max(start + 4, ...pressed))
  const rows = end - start + 1
  const x = (index: number) => 50 + order.indexOf(index) * 44
  const y = (fret: number) => 65 + (fret - start + .5) * 38
  return <div className="chord-diagram">
    <svg viewBox={`0 0 320 ${100 + rows * 38}`} role={onPlayString ? 'group' : 'img'} aria-label={`${chord.name} 指法图`} className="mx-auto w-full max-w-80">
      {Array.from({ length: rows + 1 }, (_, i) => <g key={i}><line x1="50" x2="270" y1={65 + i * 38} y2={65 + i * 38} stroke="#c7d1ec" strokeWidth={i === 0 && start === 1 ? 4 : 1} />{i < rows && <text x="16" y={89 + i * 38} fontSize="12" fill="#55627a">{start + i}品</text>}</g>)}
      {order.map(index => <g key={index} data-string={6 - index} data-fret={chord.frets[index] ?? 'x'}>
        <text x={x(index)} y="20" textAnchor="middle" fontSize="13" fill="#55627a">{6 - index}弦</text>
        <line x1={x(index)} x2={x(index)} y1="65" y2={65 + rows * 38} stroke="#a6b4ce" strokeWidth={2 - index * .2} />
        {(chord.frets[index] === null || chord.frets[index] === 0) && <text x={x(index)} y="49" textAnchor="middle" fontSize="19" fill="#182138">{chord.frets[index] === null ? '×' : '○'}</text>}
      </g>)}
      {chord.barres?.map((barre, i) => <g key={i} aria-label={`${barre.fret}品横按 ${barre.fromString}至${barre.toString}弦`}><line x1={x(6 - barre.fromString)} x2={x(6 - barre.toString)} y1={y(barre.fret)} y2={y(barre.fret)} stroke="#254dff" strokeWidth="20" strokeLinecap="round" /></g>)}
      {chord.frets.map((fret, index) => fret !== null && fret > 0 && <g key={index}><circle cx={x(index)} cy={y(fret)} r="12" fill="#254dff" />{settings.showFingers && chord.fingers?.[index] && <text x={x(index)} y={y(fret) + 4} textAnchor="middle" fontSize="13" fill="white">{chord.fingers[index]}</text>}</g>)}
      {settings.showFingers && chord.barres?.map((barre, i) => barre.finger && <text key={i} x={(x(6 - barre.fromString) + x(6 - barre.toString)) / 2} y={y(barre.fret) + 4} textAnchor="middle" fontSize="13" fill="white">{barre.finger}</text>)}
      {onPlayString && chord.frets.map((fret, index) => fret !== null && <rect key={`play-${index}`} x={x(index) - 22} y="25" width="44" height={40 + rows * 38} fill="transparent" role="button" tabIndex={0} aria-label={`指法图试听第 ${6 - index} 弦`} className="cursor-pointer focus:outline-2 focus:outline-[#254dff]" onClick={() => onPlayString(index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPlayString(index) } }} />)}
    </svg>
    <div className="grid grid-cols-3 gap-2" aria-label="逐弦参考音">{order.map(index => {
      const fret = chord.frets[index]
      const label = `第 ${6 - index} 弦 · ${fret === null ? '不弹' : `${fret === 0 ? '空弦' : `第 ${fret} 品`} · ${midiNote(openMidi[index] + fret)}`}`
      return <button key={index} type="button" disabled={fret === null || !onPlayString} aria-label={label} onClick={() => onPlayString?.(index)} className="min-h-12 rounded-lg border border-[#c7d1ec] p-2 text-sm disabled:opacity-50">{label}</button>
    })}</div>
  </div>
}
