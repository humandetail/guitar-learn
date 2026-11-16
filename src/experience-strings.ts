export const stringNumbers = [6, 5, 4, 3, 2, 1]

export type SweepCursor = { position: number; direction: number; struck: number; startedAt?: number }
export type Sweep = { gesture?: boolean; startedAt?: number }

export function updateSweep(cursor: SweepCursor, position: number, order: number[], frets: (number | null)[]) {
  const from = cursor.position
  const direction = Math.sign(position - from)
  if (direction !== 0 && direction !== cursor.direction) {
    cursor.direction = direction
    cursor.struck = 0
    cursor.startedAt = undefined
  }
  cursor.position = position
  const strings = crossedStrings(from, position, order)
  const sounding = strings.filter(string => frets[6 - string] !== null).length
  const previousCount = cursor.struck
  if (sounding && previousCount === 0) cursor.startedAt = performance.now()
  cursor.struck += sounding
  const startedAt = previousCount < 2 && cursor.struck >= 2 ? cursor.startedAt : undefined
  return { strings, startedAt }
}

function crossedStrings(from: number, to: number, order: number[]) {
  const forward = to > from
  const crossed = order.filter((_, index) => {
    const position = index + .5
    return forward ? from < position && position <= to : to <= position && position < from
  })
  return forward ? crossed : crossed.reverse()
}
