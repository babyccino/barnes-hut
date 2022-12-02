import { rand } from "../../src/lib/util"

describe("Utility functions", () => {
  it("Rand should produce a value between the min and max", () => {
    expect(rand(100, 200)).toBeLessThanOrEqual(200)
    expect(rand(-300, 150)).toBeGreaterThanOrEqual(-300)
  })
})
