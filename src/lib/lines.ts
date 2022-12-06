import { CentreOfMass, QuadInterface } from "./interface"
import { Empty, Fork, Leaf, Quad, THETA, willCalc } from "./simulation"

// [lineStart, lineEnd]
export type Line = readonly [number, number]
export type Intervals = Line[]
export class IntervalMap extends Map<number, Intervals> {}
export type IntervalMapCb = (intervals: Intervals, key: number, map: IntervalMap) => void

export function roundHalf(num: number): number {
  return Math.round(num * 2) / 2
}

export function mergeIntervals(intervals: Intervals): Intervals {
  if (intervals.length === 0) return []

  intervals.sort((a, b) => a[0] - b[0])

  const merged = [intervals[0]]
  for (let i = 1; i < intervals.length; ++i) {
    const [start, end] = intervals[i]
    const [lastMergedStart, lastMergedEnd] = merged.at(-1) as Line
    if (start <= lastMergedEnd)
      merged[merged.length - 1] = [lastMergedStart, Math.max(lastMergedEnd, end)]
    else merged.push([start, end])
  }

  return merged
}

export function addLine(line: Line, index: number, map: IntervalMap): IntervalMap {
  if (map.has(index)) {
    map.get(index)!.push(line)
  } else {
    map.set(index, [line])
  }
  return map
}

export function addLinesFromQuad(
  quad: QuadInterface,
  horizontal: IntervalMap,
  vertical: IntervalMap
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

export const mapFn: IntervalMapCb = (intervals, key, map) => map.set(key, mergeIntervals(intervals))

export function getLines(
  quad: Quad,
  body: CentreOfMass,
  theta: number = THETA,
  depthLimit: number = 100
): [IntervalMap, IntervalMap] {
  const verticalLines = new IntervalMap()
  const horizontalLines = new IntervalMap()

  const traverse = (traversingQuad: Quad, passedCalc: boolean = false, depth: number = 0): void => {
    if (depth >= depthLimit) return

    if (traversingQuad instanceof Leaf || passedCalc || !willCalc(traversingQuad, body, theta)) {
      addLinesFromQuad(traversingQuad, horizontalLines, verticalLines)
      passedCalc = true
    }

    if (traversingQuad instanceof Fork) {
      traverse(traversingQuad.nw, passedCalc, depth + 1)
      traverse(traversingQuad.ne, passedCalc, depth + 1)
      traverse(traversingQuad.sw, passedCalc, depth + 1)
      traverse(traversingQuad.se, passedCalc, depth + 1)
    }
  }
  traverse(quad)

  horizontalLines.forEach(mapFn)
  verticalLines.forEach(mapFn)

  return [horizontalLines, verticalLines]
}

export function getAllLines(quad: Quad, depthLimit: number = 100): [IntervalMap, IntervalMap] {
  const verticalLines = new IntervalMap()
  const horizontalLines = new IntervalMap()

  const traverse = (traversingQuad: Quad, passedCalc: boolean = false, depth: number = 0): void => {
    if (depth >= depthLimit) return

    if (traversingQuad instanceof Leaf || traversingQuad instanceof Empty) {
      return addLinesFromQuad(traversingQuad, horizontalLines, verticalLines)
    }

    if (traversingQuad instanceof Fork) {
      traverse(traversingQuad.nw, passedCalc, depth + 1)
      traverse(traversingQuad.ne, passedCalc, depth + 1)
      traverse(traversingQuad.sw, passedCalc, depth + 1)
      traverse(traversingQuad.se, passedCalc, depth + 1)
    }
  }
  traverse(quad)

  horizontalLines.forEach(mapFn)
  verticalLines.forEach(mapFn)

  return [horizontalLines, verticalLines]
}
