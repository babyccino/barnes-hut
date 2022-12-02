import { Intervals, mergeIntervals } from "../../src/lib/lines"

describe("Line tests", () => {
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

  // Get lines
})
