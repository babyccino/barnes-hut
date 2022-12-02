import { CentreOfMass, QuadInterface } from "./interface"
import { Empty, Fork, Leaf, Quad, THETA, willCalc } from "./simulation"
import { distance } from "./util"

// [lineStart, lineEnd]
export type Line = [number, number]
export type Intervals = Line[]

export function roundHalf(num: number): number {
  return Math.round(num * 2) / 2
}

export function mergeIntervals(intervals: Intervals): Intervals {
  if (intervals.length === 0) return []

  intervals.sort((a, b) => a[0] - b[0])

  const merged = [intervals[0]]
  for (let i = 1; i < intervals.length; ++i) {
    const [start, end] = intervals[i]
    const lastMergedEnd = merged.at(-1)![1]
    if (start <= lastMergedEnd) merged.at(-1)![1] = Math.max(lastMergedEnd, end)
    else merged.push([start, end])
  }

  return merged
}

export function addLine(
  line: Line,
  index: number,
  map: Map<number, Intervals>
): void {
  if (!map.has(index)) {
    map.set(index, [line])
  } else {
    map.get(index)!.push(line)
  }
}

export function addLinesFromQuad(
  quad: QuadInterface,
  horizontal: Map<number, Intervals>,
  vertical: Map<number, Intervals>
): void {
  const minX = roundHalf(quad.centerX - quad.size / 2)
  const maxX = roundHalf(quad.centerX + quad.size / 2)
  const minY = roundHalf(quad.centerY - quad.size / 2)
  const maxY = roundHalf(quad.centerY + quad.size / 2)

  addLine([minX, maxX], minY, horizontal)
  addLine([minX, maxX], maxY, horizontal)
  addLine([minY, maxY], minX, vertical)
  addLine([minY, maxY], maxX, vertical)
}

// Merges the
export const mapFn = (
  list: Intervals,
  key: number,
  map: Map<number, Intervals>
) => map.set(key, mergeIntervals(list))

export function getLines(
  quad: Quad,
  body: CentreOfMass
): [Map<number, Intervals>, Map<number, Intervals>] {
  const verticalLines = new Map<number, Intervals>()
  const horizontalLines = new Map<number, Intervals>()

  const depthLimit = 100
  const traverse = (traversingQuad: Quad, depth: number = 0): void => {
    if (depth >= depthLimit) return

    if (!willCalc(traversingQuad, body))
      addLinesFromQuad(quad, horizontalLines, verticalLines)

    if (traversingQuad instanceof Fork) {
      traverse(traversingQuad.nw, depth + 1)
      traverse(traversingQuad.ne, depth + 1)
      traverse(traversingQuad.sw, depth + 1)
      traverse(traversingQuad.se, depth + 1)
    }
  }
  traverse(quad)

  verticalLines.forEach(mapFn)
  verticalLines.forEach(mapFn)

  return [horizontalLines, verticalLines]
}
