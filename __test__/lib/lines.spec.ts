import { Body } from "../../src/lib/interface"
import {
  addLine,
  addLinesFromQuad,
  getLines,
  IntervalMap,
  Intervals,
  Line,
  mergeIntervals,
  roundHalf,
} from "../../src/lib/lines"
import { Empty, Fork, Leaf } from "../../src/lib/simulation"

describe("Line tests", () => {
  // Round half

  test("Round half works as expected", () => {
    expect(roundHalf(0)).toBe(0)
    expect(roundHalf(Number.MIN_VALUE)).toBe(0)
    expect(roundHalf(1.5)).toBe(1.5)
    expect(roundHalf(1.25)).toBe(1.5)
    expect(roundHalf(1.75)).toBe(2)
    expect(roundHalf(2)).toBe(2)
    expect(roundHalf(9.81029)).toBe(10)
    expect(roundHalf(10.23109)).toBe(10)
    expect(roundHalf(10.3102938471)).toBe(10.5)
    expect(roundHalf(10.711279348)).toBe(10.5)
    expect(roundHalf(10.82743892)).toBe(11)
    expect(roundHalf(11.13124789)).toBe(11)
    expect(roundHalf(-6.12)).toBe(-6)
    expect(roundHalf(-5.95)).toBe(-6)
  })

  // Merge intervals

  test("Merge intervals works on empty set", () => {
    expect(mergeIntervals([])).toEqual([])
  })

  test("Merge intervals works on obvious set of intervals", () => {
    const intervals: Intervals = [
      [0, 2],
      [1, 3],
    ]
    expect(mergeIntervals(intervals)).toEqual([[0, 3]])
  })

  test("Merge intervals works on set of three", () => {
    const intervals: Intervals = [
      [0, 2],
      [4, 7],
      [1, 3],
    ]
    expect(mergeIntervals(intervals)).toEqual([
      [0, 3],
      [4, 7],
    ])
  })

  test("Merge intervals works on set of three", () => {
    const intervals: Intervals = [
      [0, 2],
      [3, 7],
      [1, 3],
    ]
    expect(mergeIntervals(intervals)).toEqual([[0, 7]])
  })

  test("Merge intervals works on set with duplicate", () => {
    const intervals: Intervals = [
      [0, 2],
      [1, 3],
      [1, 3],
    ]
    expect(mergeIntervals(intervals)).toEqual([[0, 3]])
  })

  // add line

  test("Add line works on empty map", () => {
    const map = new IntervalMap()
    const line: Line = [4, 8]
    const y = 3

    const expectedMap = new IntervalMap([[y, [line]]])
    expect(addLine(line, y, map)).toEqual(expectedMap)
    expect(map).toEqual(expectedMap)
  })

  test("Add line appends line to correct map entry", () => {
    const line1: Line = [4, 8]
    const line2: Line = [-1, 3]
    const y = 3
    const map = new IntervalMap([[y, [line1]]])

    const expectedMap = new IntervalMap([[y, [line1, line2]]])
    expect(addLine(line2, y, map)).toEqual(expectedMap)
    expect(map).toEqual(expectedMap)
  })

  // add lines from quad

  test("Add line correctly add lines from Empty quad", () => {
    const horizontalLines = new IntervalMap()
    const verticalLines = new IntervalMap()
    const quad = new Empty(50, 50, 100)
    addLinesFromQuad(quad, horizontalLines, verticalLines)

    const int: Line = [0, 100]
    const expectedMap = new IntervalMap([
      [0, [int]],
      [100, [int]],
    ])

    expect(horizontalLines).toEqual(expectedMap)
    expect(verticalLines).toEqual(expectedMap)
  })

  // Get lines

  test("Get lines works on empty quad", () => {
    const body: Body = {
      mass: 87.5,
      massX: 0,
      massY: 0,
      xSpeed: 10,
      ySpeed: 12,
    }
    const empty = new Empty(50, 50, 100)
    const [horizontalLines, verticalLines] = getLines(empty, body)
    const int: Line = [0, 100]
    const expectedMap = new IntervalMap([
      [0, [int]],
      [100, [int]],
    ])

    expect(horizontalLines).toEqual(expectedMap)
    expect(verticalLines).toEqual(expectedMap)
  })

  test("Get lines should return empty maps for Leaf node", () => {
    const body: Body = {
      mass: 87.5,
      massX: 0,
      massY: 0,
      xSpeed: 10,
      ySpeed: 12,
    }
    const leaf = new Leaf(50, 50, 100, [body])
    const [horizontalLines, verticalLines] = getLines(leaf, body)
    const expectedMap = new IntervalMap()

    expect(horizontalLines).toEqual(expectedMap)
    expect(verticalLines).toEqual(expectedMap)
  })

  test("Get lines should return correct maps for simple system", () => {
    const body1: Body = {
      mass: 1,
      massX: 25,
      massY: 25,
      xSpeed: 0,
      ySpeed: 0,
    }
    const body2: Body = {
      mass: 1,
      massX: 75,
      massY: 75,
      xSpeed: 0,
      ySpeed: 0,
    }
    const fork = new Fork(
      new Leaf(25, 25, 50, [body1]),
      new Empty(75, 25, 50),
      new Empty(25, 75, 50),
      new Leaf(75, 75, 50, [body2])
    )
    const [horizontalLines, verticalLines] = getLines(fork, body1)

    /**
     * Should return three horizontal lines, one at y = 0, 50 and 100 from x = 0 to 100
     * And similarly for the verticals
     */
    const expectedMap = new IntervalMap([
      [0, [[0, 100]]],
      [50, [[0, 100]]],
      [100, [[0, 100]]],
    ])

    expect(horizontalLines).toEqual(expectedMap)
    expect(verticalLines).toEqual(expectedMap)
  })
})
