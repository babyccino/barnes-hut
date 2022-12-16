import { interweaveArrays, rand } from "../../src/lib/util"

describe("Utility functions", () => {
  it("Rand should produce a value between the min and max", () => {
    expect(rand(100, 200)).toBeLessThanOrEqual(200)
    expect(rand(-300, 150)).toBeGreaterThanOrEqual(-300)
  })

  it("Interweave arrays with an empty array should produce the non-empty array", () => {
    expect(interweaveArrays([1, 2, 3, 4], [])).toEqual([1, 2, 3, 4])
  })

  it("Interweave arrays with an equal sized arrays should produce the correct result", () => {
    expect(interweaveArrays([1, 3], [2, 4])).toEqual([1, 2, 3, 4])
  })

  it("Interweave arrays with inequal sized arrays should produce the correct result", () => {
    expect(interweaveArrays([1, 3, 5, 6], [2, 4])).toEqual([1, 2, 3, 4, 5, 6])
    expect(interweaveArrays([2, 4], [1, 3, 5, 6])).toEqual([1, 2, 3, 4, 5, 6])
  })
})
