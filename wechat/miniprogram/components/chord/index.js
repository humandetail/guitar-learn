const { chords } = require('../../data/content')
Component({
  options: { styleIsolation: 'apply-shared' },
  properties: { name: { type: String, observer(name) {
    const chord = chords.find(item => item.name === name)
    this.setData({ chord: chord || null, strings: chord ? chord.frets.map((fret, index) => ({ string: 6 - index, top: fret === null ? '×' : fret === 0 ? '○' : '',
      cells: [1, 2, 3, 4].map(position => ({ position, active: fret === position, finger: chord.fingers[index] || '' })) })) : [] })
  } } },
  data: { chord: null, strings: [] },
})
