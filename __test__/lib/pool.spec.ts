import { test, describe, expect, beforeEach, afterEach } from "bun:test"

import { acquire, clearPools, free, getPool, getPoolLength } from "../../src/lib/pool"
import { Empty } from "../../src/lib/simulation"

describe("Pool functions", () => {
  beforeEach(clearPools)
  afterEach(clearPools)
  test("acquire and free Empty nodes", () => {
    expect(getPoolLength(Empty)).toEqual(null)
    const empty = acquire(Empty, 0, 1, 2)
    expect(empty).toEqual(new Empty(0, 1, 2))
    expect(getPoolLength(Empty)).toEqual(0)
    const pool = getPool(Empty).objs
    expect(pool.length).toEqual(0)
    free(Empty, empty)
    expect(getPoolLength(Empty)).toEqual(1)
    expect(pool.length).toEqual(1)
    const empty2 = acquire(Empty, 2, 1, 0)
    expect(getPoolLength(Empty)).toEqual(0)
    expect(pool.length).toEqual(0)
    expect(empty).toEqual(new Empty(2, 1, 0))
  })
})
