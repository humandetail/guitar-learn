const fingers = ['', '食指', '中指', '无名指', '小指']
const roles = { melody: '旋律', bass: '低音', fill: '填充音' }
function describe(event) {
  if (!event.notes.length) return `休止 ${event.beats} 拍：轻触琴弦止音，继续数拍。`
  return (event.notes.length > 1 ? '同时拨响：' : '拨响：') + event.notes.map(note =>
    `${roles[note.role] ? roles[note.role] + ' · ' : ''}${note.string} 弦${note.fret === 0 ? '空弦' : ' ' + note.fret + ' 品'}${note.finger ? '（' + fingers[note.finger] + '）' : ''}，保持 ${note.sustainBeats || event.beats} 拍`
  ).join('；') + `。${event.beats} 拍后进入下一列。`
}
function columns(events, firstBar = 1) {
  let beats = 0
  return events.map((event, index) => {
    const position = beats % 4
    const result = {
      index, bar: firstBar + Math.floor(beats / 4), beats: event.beats, lyric: event.lyric || '', chord: event.chord || '',
      count: position % 1 ? `${Math.floor(position) + 1} 和` : `${position + 1}`,
      description: describe(event), rest: event.notes.length === 0,
      strings: [1, 2, 3, 4, 5, 6].map(string => {
        const note = event.notes.find(item => item.string === string)
        return { string, fret: note ? String(note.fret) : '', role: note ? note.role || '' : '' }
      }),
    }
    beats += event.beats
    return result
  })
}
function rows(events, firstBar = 1) {
  const result = []
  for (const column of columns(events, firstBar)) {
    let row = result[result.length - 1]
    if (!row || row.bar !== column.bar || row.columns.length === 4) {
      row = { id: result.length, bar: column.bar, continuation: !!row && row.bar === column.bar, columns: [] }
      result.push(row)
    }
    row.columns.push(column)
  }
  return result
}
function voices(events, bpm) {
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 120) throw new Error('示范速度须为 30–120 BPM')
  const seconds = 60 / bpm
  const total = events.reduce((sum, event) => sum + event.beats, 0)
  const starts = []; const result = []; let beat = 0
  events.forEach((event, index) => {
    starts.push(beat * seconds)
    event.notes.forEach(note => {
      let limit = total - beat, followingBeat = event.beats
      for (let next = index + 1; next < events.length; next++) {
        if (!events[next].notes.length || events[next].notes.some(item => item.string === note.string)) { limit = followingBeat; break }
        followingBeat += events[next].beats
      }
      result.push({ at: beat * seconds, duration: Math.min(note.sustainBeats || event.beats, limit) * seconds,
        hz: 440 * 2 ** (([0, 64, 59, 55, 50, 45, 40][note.string] + note.fret - 69) / 12),
        volume: 0.13 * (note.role === 'bass' ? 0.8 : note.role === 'fill' ? 0.55 : 1) / Math.sqrt(event.notes.length) })
    })
    beat += event.beats
  })
  return { starts, voices: result, duration: total * seconds }
}
module.exports = { describe, columns, rows, voices }
