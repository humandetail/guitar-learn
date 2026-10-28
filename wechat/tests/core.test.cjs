const { test } = require('node:test')
const assert = require('node:assert/strict')
const { lessons, scores, exercises, chords, parts } = require('../miniprogram/data/content')
const { createStore, key } = require('../miniprogram/lib/progress')
const { columns, rows, voices } = require('../miniprogram/lib/score')
const { clickData } = require('../miniprogram/lib/audio')

function storage() {
  const disk = new Map()
  return { disk, getStorageSync: key => disk.has(key) ? structuredClone(disk.get(key)) : '', setStorageSync: (key, value) => disk.set(key, structuredClone(value)) }
}
test('all shared content and navigation dependencies are present', () => {
  assert.equal(lessons.length, 14); assert.equal(scores.length, 12); assert.equal(Object.keys(exercises).length, 9)
  assert.equal(chords.length, 10); assert.equal(parts.length, 11)
  for (const lesson of lessons) for (const step of lesson.steps) if (step.exercise) assert.ok(exercises[step.exercise])
  for (const score of scores) {
    for (const prerequisite of score.prerequisites) assert.ok(lessons.some(lesson => lesson.id === prerequisite.lessonId))
    for (const bar of score.bars) {
      assert.equal(bar.events.reduce((sum, event) => sum + event.beats, 0), 4)
      assert.ok(chords.some(chord => chord.name === bar.chord))
      for (const event of bar.events) for (const note of event.notes) {
        assert.ok(note.string >= 1 && note.string <= 6 && note.fret >= 0)
        if (note.sustainBeats) assert.ok(note.sustainBeats > 0)
      }
    }
    if (score.vocalBars) assert.equal(score.vocalBars.length, score.bars.length)
  }
})
test('learning progress resumes steps and checks in a fresh store', () => {
  const platform = storage(), store = createStore(platform)
  store.update(state => { state.step = 2; state.checks[lessons[0].id] = [0, 1] })
  const restored = createStore(platform).load()
  assert.equal(restored.progress.step, 2); assert.deepEqual(restored.progress.checks[lessons[0].id], [0, 1])
  assert.throws(() => store.update(state => state.completed.push(lessons[0].id)), /缺少自查/)
  store.update(state => { state.checks[lessons[0].id] = [0, 1, 2]; state.completed.push(lessons[0].id) })
  assert.deepEqual(createStore(platform).load().progress.completed, [lessons[0].id])
})
test('failed saves retain pending work; retry persists it without silent reset', () => {
  const platform = storage(), store = createStore(platform)
  store.update(state => { state.step = 1 })
  const write = platform.setStorageSync
  platform.setStorageSync = () => { throw Error('quota') }
  const failed = store.update(state => { state.step = 2 })
  assert.equal(failed.dirty, true); assert.equal(failed.progress.step, 2)
  assert.equal(platform.disk.get(key).step, 1)
  platform.setStorageSync = write
  assert.equal(store.retry().dirty, false)
  assert.equal(createStore(platform).load().progress.step, 2)
})
test('corrupt data is preserved until an explicitly requested reset succeeds', () => {
  const platform = storage(); platform.disk.set(key, { version: 99, precious: 'original' })
  const store = createStore(platform)
  assert.equal(store.load().blocked, true)
  store.update(state => { state.step = 2 })
  assert.equal(platform.disk.get(key).precious, 'original')
  const write = platform.setStorageSync
  platform.setStorageSync = () => { throw Error('quota') }
  assert.equal(store.reset().blocked, true)
  assert.equal(platform.disk.get(key).precious, 'original')
  platform.setStorageSync = write
  assert.equal(store.reset().blocked, false)
  assert.equal(platform.disk.get(key).version, 1)
})
test('TAB is always string 1 on top; half beats and continuation rows preserve indices', () => {
  const events = Array.from({ length: 8 }, () => ({ notes: [{ string: 1, fret: 2 }], beats: 0.5 }))
  const grouped = rows(events, 9)
  assert.equal(grouped.length, 2); assert.equal(grouped[1].bar, 9); assert.equal(grouped[1].continuation, true)
  assert.deepEqual(grouped.flatMap(row => row.columns.map(column => column.index)), [0,1,2,3,4,5,6,7])
  assert.deepEqual(grouped[0].columns[0].strings.map(string => string.string), [1,2,3,4,5,6])
  assert.equal(grouped[0].columns[1].count, '1 和')
  assert.equal(columns([{ notes: [], beats: 2 }])[0].rest, true)
})
test('independent sustain ends at a same-string attack, rest, or selected range end', () => {
  const events = [
    { notes: [{ string: 1, fret: 0, sustainBeats: 4, role: 'melody' }, { string: 6, fret: 0, sustainBeats: 2, role: 'bass' }], beats: 0.5 },
    { notes: [{ string: 3, fret: 0, role: 'fill' }], beats: 0.5 },
    { notes: [{ string: 1, fret: 3 }], beats: 1 },
    { notes: [], beats: 1 },
  ]
  const plan = voices(events, 60)
  assert.deepEqual(plan.starts, [0, 0.5, 1, 2]); assert.equal(plan.duration, 3)
  assert.equal(plan.voices[0].duration, 1); assert.equal(plan.voices[1].duration, 2)
  assert.ok(Math.abs(plan.voices[1].hz - 82.4068892282175) < 1e-10)
  assert.equal(voices(events.slice(0, 1), 60).voices[0].duration, 0.5)
  assert.throws(() => voices(events, 0), /速度/)
})
test('all rhythm modes have sample-clock click positions and bounded minute rounding error', () => {
  for (const rate of [44100, 48000]) for (const bpm of [30, 80, 240]) for (const beats of [2,3,4]) for (const subdivision of [1,2,4]) {
    const result = clickData({ bpm, beats, subdivision }, rate)
    assert.equal(result.starts.length, beats * subdivision)
    const ideal = 60 / bpm * beats
    assert.ok(Math.abs(result.duration - ideal) * 60 / ideal < 0.001)
    assert.equal(result.pcm[0], 0); assert.equal(result.pcm[result.pcm.length - 1], 0)
    for (const at of result.starts) assert.ok(result.pcm.slice(Math.round(at * rate), Math.round(at * rate) + 100).some(value => Math.abs(value) > 0.01))
  }
})
