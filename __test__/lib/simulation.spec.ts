import { test, describe, expect } from "bun:test"

import { Body, CentreOfMass, QuadBase } from "../../src/lib/interface"
import {
  Empty,
  Leaf,
  Fork,
  update,
  getMassCentre,
  addForce,
  addForceToBody,
  MINIMUM_SIZE,
  GEE,
  DELTA,
  getBoundaries,
  eliminateOutliers,
  createQuadAndInsertBodies,
  getQuadForBody,
} from "../../src/lib/simulation"

function expectEqual<T>(provided: T, expected: T): void {
  expect(provided).toEqual(expected)
}

describe("Simulation function", () => {
  test("Mass centre function should work correctly", () => {
    const b1: CentreOfMass = { mass: 1, massX: 5, massY: 10 }
    const b2: CentreOfMass = { mass: 1, massX: 15, massY: 15 }
    {
      const [mass, massX, massY] = getMassCentre(b1, b2)
      expect(mass).toBe(2)
      expect(massX).toBe(10)
      expect(massY).toBe(12.5)
    }
    {
      const [mass, massX, massY] = getMassCentre([b1, b2])
      expect(mass).toBe(2)
      expect(massX).toBe(10)
      expect(massY).toBe(12.5)
    }
  })
  test("Add force should work correctly", () => {
    const b1: CentreOfMass = { mass: 1, massX: 5, massY: 10 }
    const b2: CentreOfMass = { mass: 1, massX: 15, massY: 15 }

    const force = addForce(b1, b2)
    expect(force[0]).toBeCloseTo((100 * 10) / Math.pow(125, 3 / 2), 8)
    expect(force[1]).toBeCloseTo((100 * 5) / Math.pow(125, 3 / 2), 8)
  })

  test("Empty: center of mass should be the center of the cell", () => {
    const quad = new Empty(51, 46.3, 5)
    expect(quad.massX).toBe(51)
    expect(quad.massY).toBe(46.3)
  })

  test("Empty: mass should be 0", () => {
    const quad = new Empty(51, 46.3, 5)
    expect(quad.mass).toBe(0)
  })

  test("Empty: total should be 0", () => {
    const quad = new Empty(51, 46.3, 5)
    expect(quad.total).toBe(0)
  })

  test("Leaf with 1 body", () => {
    const b: CentreOfMass = { mass: 123, massX: 18, massY: 26 }
    const quad = new Leaf(17.5, 27.5, 5, [b])

    expect(quad.mass).toBe(123)
    expect(quad.massX).toBe(18)
    expect(quad.massY).toBe(26)
    expect(quad.total).toBe(1)
  })

  test("Fork with 3 empty quadrants and 1 leaf", () => {
    const b: CentreOfMass = { mass: 123, massX: 18, massY: 26 }
    const nw = new Leaf(17.5, 27.5, 5, [b])

    expect(nw.massX).toBe(18)
    expect(nw.massY).toBe(26)

    const ne = new Empty(22.5, 27.5, 5)
    const sw = new Empty(17.5, 32.5, 5)
    const se = new Empty(22.5, 32.5, 5)
    const quad = new Fork(nw, ne, sw, se)

    expect(quad.centerX).toBe(20)
    expect(quad.centerY).toBe(30)
    expect(quad.mass).toBe(123)
    expect(quad.massX).toBe(18)
    expect(quad.massY).toBe(26)
    expect(quad.total).toBe(1)
  })

  // class Body(val mass: Float, val x: Float, val y: Float, val xspeed: Float, val yspeed: Float)
  test("Empty.insert(b) should return a Leaf with only that body", () => {
    const quad = new Empty(51, 46.3, 5)
    const b: CentreOfMass = { mass: 3, massX: 54, massY: 46 }
    const inserted = quad.insert(b)

    expect(inserted instanceof Leaf).toBeTruthy()
    expect(inserted.centerX).toBe(51)
    expect(inserted.centerY).toBe(46.3)
    expect(inserted.size).toBe(5)
    expect(inserted.bodies).toEqual([b])
  })

  test("'insert' should work correctly on a leaf with center (1,1) and size 2", () => {
    const b1: CentreOfMass = { mass: 1, massX: 0.5, massY: 0.5 }
    const b2: CentreOfMass = { mass: 5, massX: 1.5, massY: 0.5 }

    const fork = new Leaf(1, 1, 2, []).insert(b1).insert(b2)

    expect(fork).toEqual(
      new Fork(
        new Leaf(0.5, 0.5, 1.0, [b1]),
        new Leaf(1.5, 0.5, 1.0, [b2]),
        new Empty(0.5, 1.5, 1.0),
        new Empty(1.5, 1.5, 1.0)
      )
    )
  })
  function recursivelyFindFirstLeaf(fork: Fork, level: number): [Leaf, number] {
    const nodes = [fork.nw, fork.ne, fork.sw, fork.se]
    for (const node of nodes) {
      if (node instanceof Fork) return recursivelyFindFirstLeaf(node, level + 1)
      if (node instanceof Leaf) return [node, level]
    }
    throw new Error("No leaf was found")
  }
  test("Leaf.insert(b) should return a new Fork if size > minimumSize", () => {
    const b: Body = { mass: 123, massX: 18, massY: 26, xSpeed: 0, ySpeed: 0 }
    const leaf1 = new Leaf(17.5, 27.5, 5, []).insert(b)

    expect(leaf1).toEqual(new Leaf(17.5, 27.5, 5, [b]))

    const tup = recursivelyFindFirstLeaf(leaf1.insert(b) as Fork, 0)

    const [leaf, level] = tup
    expect(leaf.bodies).toEqual([b, b])
    expect(leaf.size).toBeLessThan(MINIMUM_SIZE)
    expect(level).toBe(15)
  })

  test("Inserting a few bodies should return the correct quad tree", () => {
    const quad = new Empty(50, 50, 100)
    const b1: CentreOfMass = { mass: 1, massX: 25, massY: 25 }
    const b2: CentreOfMass = { mass: 1, massX: 76, massY: 3 }
    const b3: CentreOfMass = { mass: 1, massX: 85, massY: 5 }
    const b4: CentreOfMass = { mass: 1, massX: 87.5, massY: 37.5 }
    const newQuad = quad.insert(b1).insert(b2).insert(b3).insert(b4)

    expect(newQuad).toEqual(
      new Fork(
        new Leaf(25, 25, 50, [b1]),
        new Fork(
          new Empty(62.5, 12.5, 25),
          new Fork(
            new Fork(
              new Leaf(78.125, 3.125, 6.25, [b2]),
              new Leaf(84.375, 3.125, 6.25, [b3]),
              new Empty(78.125, 9.375, 6.25),
              new Empty(84.375, 9.375, 6.25)
            ),
            new Empty(93.75, 6.25, 12.5),
            new Empty(81.25, 18.75, 12.5),
            new Empty(93.75, 18.75, 12.5)
          ),
          new Empty(62.5, 37.5, 25),
          new Leaf(87.5, 37.5, 25, [b4])
        ),
        new Empty(25, 75, 50),
        new Empty(75, 75, 50)
      )
    )
  })

  test("A large quad tree should have correct centres of mass", () => {
    const b1: CentreOfMass = { mass: 1, massX: 25, massY: 25 }
    const b2: CentreOfMass = { mass: 1, massX: 76, massY: 3 }
    const b3: CentreOfMass = { mass: 1, massX: 85, massY: 5 }
    const b4: CentreOfMass = { mass: 1, massX: 87.5, massY: 37.5 }

    const deepestFork = new Fork(
      new Leaf(78.125, 3.125, 6.25, [b2]),
      new Leaf(84.375, 3.125, 6.25, [b3]),
      new Empty(78.125, 9.375, 6.25),
      new Empty(84.375, 9.375, 6.25)
    )

    expect(deepestFork.massX).toBeCloseTo((b2.massX + b3.massX) / 2, 8) // 80.5
    expect(deepestFork.massY).toBeCloseTo((b2.massY + b3.massY) / 2, 8) // 4

    const secondDeepest = new Fork(
      deepestFork,
      new Empty(93.75, 6.25, 12.5),
      new Empty(81.25, 18.75, 12.5),
      new Empty(93.75, 18.75, 12.5)
    )

    expect(secondDeepest.massX).toBeCloseTo(deepestFork.massX, 8) // 80.5
    expect(secondDeepest.massY).toBeCloseTo(deepestFork.massY, 8) // 4

    const thirdDeepest = new Fork(
      new Empty(62.5, 12.5, 25),
      secondDeepest,
      new Empty(62.5, 37.5, 25),
      new Leaf(87.5, 37.5, 25, [b4])
    )

    expect(thirdDeepest.massX).toBeCloseTo((2 * secondDeepest.massX + b4.massX) / 3, 8) // 82.83
    expect(thirdDeepest.massY).toBeCloseTo((2 * secondDeepest.massY + b4.massY) / 3, 8) // 15.17

    const last = new Fork(
      new Leaf(25, 25, 50, [b1]),
      thirdDeepest,
      new Empty(25, 75, 50),
      new Empty(75, 75, 50)
    )

    expect(last.massX).toBeCloseTo((3 * thirdDeepest.massX + b1.massX) / 4, 8)
    expect(last.massY).toBeCloseTo((3 * thirdDeepest.massY + b1.massY) / 4, 8)
  })

  test("Body.updated should take bodies in a Leaf into account", () => {
    const b1: Body = { mass: 123, massX: 18, massY: 26, xSpeed: 0, ySpeed: 0 }
    const b2: CentreOfMass = { mass: 524.5, massX: 24.5, massY: 25.5 }
    const b3: CentreOfMass = { mass: 245, massX: 22.4, massY: 41 }

    const leaf = new Leaf(15, 30, 20, [b2, b3])

    const body = update(b1, leaf)

    expect(body.xSpeed).toBeCloseTo(12.58703612, 6)
    expect(body.ySpeed).toBeCloseTo(0.015557117, 6)

    const fork = new Fork(
      new Leaf(15, 30, 10, [b2, b3, b1]),
      new Empty(25, 30, 10),
      new Empty(15, 40, 10),
      new Empty(25, 40, 10)
    )

    const body2 = update(b1, fork)

    expect(body2.xSpeed).toBeCloseTo(12.58703612, 6)
    expect(body2.ySpeed).toBeCloseTo(0.015557117, 6)
  })

  // it cases for Body

  test("Body.updated should do nothing for Empty quad tree", () => {
    const b: Body = { mass: 123, massX: 18, massY: 26, xSpeed: 0, ySpeed: 0 }

    const body = update(b, new Empty(50, 60, 5))

    expect(body.xSpeed).toBe(0)
    expect(body.ySpeed).toBe(0)
  })

  test("Add force should calculate correctly", () => {
    const b1: Body = { mass: 1, massX: 0, massY: 0, xSpeed: 0, ySpeed: 0 }
    const b2: CentreOfMass = { mass: 1, massX: 0, massY: 2 }

    const [netXForce, netYForce] = addForce(b1, b2)
    expect(netXForce).toBe(0)
    expect(netYForce).toBe(25)
  })

  test("Add force to body should calculate correctly", () => {
    const b1: Body = { mass: 1, massX: 0, massY: 0, xSpeed: 0, ySpeed: 0 }

    const [netXForce, netYForce] = [0, 100]

    const body = addForceToBody(b1, netXForce, netYForce)
    expect(body.mass).toBe(b1.mass)
    expect(body.massX).toBe(0)
    expect(body.massY).toBe(0)
    expect(body.xSpeed).toBe(0)
    expect(body.ySpeed).toBe(1)
  })

  test("Body.updated should take bodies in a Leaf into account", () => {
    const b1: Body = { mass: 1, massX: 20, massY: 20, xSpeed: 0, ySpeed: 0 }
    const b2: CentreOfMass = { mass: 1, massX: 15, massY: 20 }
    const b3: CentreOfMass = { mass: 1, massX: 25, massY: 20 }
    const b4: CentreOfMass = { mass: 1, massX: 20, massY: 15 }
    const b5: CentreOfMass = { mass: 1, massX: 20, massY: 25 }

    const quad = new Leaf(15, 30, 20, [b2, b3, b4, b5])

    const body = update(b1, quad)

    expect(body.xSpeed).toBe(0)
    expect(body.ySpeed).toBe(0)
  })

  test("A fork with 4 bodies of equal mass in all four corners should impart a force due south east for the north west body", () => {
    const b1: Body = { mass: 1, massX: 0, massY: 0, xSpeed: 0, ySpeed: 0 }
    const b2: CentreOfMass = { mass: 1, massX: 0, massY: 100 }
    const b3: CentreOfMass = { mass: 1, massX: 100, massY: 0 }
    const b4: CentreOfMass = { mass: 1, massX: 100, massY: 100 }

    const fork = createQuadAndInsertBodies(50, 50, 100, [b1, b2, b3, b4])

    const body = update(b1, fork)

    expect(body.xSpeed).toBe(body.ySpeed)
    expect(body.ySpeed).toBeGreaterThan(0)
  })

  test("3 bodies far away should approximate the force to the centre of mass of the three bodies", () => {
    const b1: Body = { mass: 1, massX: 0, massY: 0, xSpeed: 1, ySpeed: 1 }
    const b2: CentreOfMass = { mass: 1, massX: 62.5, massY: 87.5 }
    const b3: CentreOfMass = { mass: 1, massX: 87.5, massY: 87.5 }
    const b4: CentreOfMass = { mass: 1, massX: 87.5, massY: 62.5 }
    const avg = (62.5 + 87.5 * 2) / 3
    const totalMass = 3
    // centre of mass [avg, avg]

    const fork = createQuadAndInsertBodies(50, 50, 100, [b1, b2, b3, b4])

    const body = update(b1, fork)

    expect(body.xSpeed).toBe(body.ySpeed)
    expect(body.massX).toBe(DELTA)
    expect(body.massX).toBe(DELTA)

    const dist = Math.sqrt(2) * avg
    const fX = (GEE * b1.mass * totalMass * avg) / Math.pow(dist, 3)
    const fY = fX
    const dSpeedX = fX * DELTA // a * t = F / m * t = f * delta
    const dSpeedY = fY * DELTA

    expect(body.xSpeed).toBeCloseTo(b1.xSpeed + dSpeedX, 8)
  })

  test("A large quad tree should update a body correctly", () => {
    const b1: Body = { mass: 1, massX: 25, massY: 25, xSpeed: 0, ySpeed: 0 }
    const b2: CentreOfMass = { mass: 1, massX: 76, massY: 3 }
    const b3: CentreOfMass = { mass: 1, massX: 85, massY: 5 }
    const b4: CentreOfMass = { mass: 1, massX: 87.5, massY: 37.5 }

    const deepestFork = new Fork(
      new Leaf(78.125, 3.125, 6.25, [b2]),
      new Leaf(84.375, 3.125, 6.25, [b3]),
      new Empty(78.125, 9.375, 6.25),
      new Empty(84.375, 9.375, 6.25)
    ) // massX = 80.5, massY = 4, mass = 2
    const secondDeepest = new Fork(
      deepestFork,
      new Empty(93.75, 6.25, 12.5),
      new Empty(81.25, 18.75, 12.5),
      new Empty(93.75, 18.75, 12.5)
    ) // massX = 80.5, massY = 4, mass = 2
    const thirdDeepest = new Fork(
      new Empty(62.5, 12.5, 25),
      secondDeepest,
      new Empty(62.5, 37.5, 25),
      new Leaf(87.5, 37.5, 25, [b4])
    ) // massX = 82.83, massY = 15.17, mass = 3
    const quad = new Fork(
      new Leaf(25, 25, 50, [b1]),
      thirdDeepest,
      new Empty(25, 75, 50),
      new Empty(75, 75, 50)
    )

    const body = update(b1, quad)

    // force should take itself into account
    // distance to thirdDeepest is 58.66
    // 50 / 58.66 > theta so thirdDeepest is traversed
    // b4 is a leaf in this fork so its force should be the same as calculating directly

    const force1 = addForce(b1, b4)

    // distance to secondDeepest is 58.87
    // 25 / 58.66 < theta so secondDeepest is not traversed

    const force2 = addForce(b1, secondDeepest)

    const totalForceX = force1[0] + force2[0]
    const totalForceY = force1[1] + force2[1]
    const aX = totalForceX * DELTA
    const aY = totalForceY * DELTA

    expect(body.xSpeed).toBeCloseTo(aX, 8)
    expect(body.ySpeed).toBeCloseTo(aY, 8)

    const body2 = update(body, quad)

    expect(body2.massX).toBeCloseTo(25 + aX * DELTA, 8)
    expect(body2.massY).toBeCloseTo(25 + aY * DELTA, 8)
  })

  // Boundaries

  test("Get boundaries should create a correct boundary for a set of obvious points", () => {
    const b1: CentreOfMass = { mass: 1, massX: 25, massY: 25 }
    const b2: CentreOfMass = { mass: 1, massX: 76, massY: 3 }
    const b3: CentreOfMass = { mass: 1, massX: 85, massY: 5 }
    const b4: CentreOfMass = { mass: 1, massX: 87.5, massY: 37.5 }
    const nodes: CentreOfMass[] = [b1, b2, b3, b4]
    const boundaries = getBoundaries(nodes)
    expectEqual(boundaries.xMin, 25)
    expectEqual(boundaries.xMax, 87.5)
    expectEqual(boundaries.yMin, 3)
    expectEqual(boundaries.yMax, 37.5)
  })

  // eliminate outliers

  test("Eliminate outliers should create a predicate which is false for a body which it definitely not an outlier", () => {
    const b1: Body = {
      mass: 1,
      massX: 25,
      massY: 25,
      xSpeed: 0,
      ySpeed: 0,
    }
    const b2: CentreOfMass = { mass: 1, massX: 76, massY: 3 }
    const b3: CentreOfMass = { mass: 1, massX: 85, massY: 5 }
    const b4: CentreOfMass = { mass: 1, massX: 87.5, massY: 37.5 }
    const nodes: CentreOfMass[] = [b1, b2, b3, b4]
    const boundaries = getBoundaries(nodes)
    const quad = createQuadAndInsertBodies(
      boundaries.centerX,
      boundaries.centerY,
      boundaries.size,
      nodes
    )
    const pred = eliminateOutliers(quad)
    expect(pred(b1)).toBeTruthy()
  })

  test("Eliminate outliers should create a predicate which is true for a body travelling over escape velocity", () => {
    const b1: Body = {
      mass: 1,
      massX: 25,
      massY: 25,
      xSpeed: -Number.MAX_VALUE,
      ySpeed: -Number.MAX_VALUE,
    }
    const b2: CentreOfMass = { mass: 1, massX: 76, massY: 3 }
    const b3: CentreOfMass = { mass: 1, massX: 85, massY: 5 }
    const b4: CentreOfMass = { mass: 1, massX: 87.5, massY: 37.5 }
    const nodes: CentreOfMass[] = [b1, b2, b3, b4]
    const boundaries = getBoundaries(nodes)
    const quad = createQuadAndInsertBodies(
      boundaries.centerX,
      boundaries.centerY,
      boundaries.size,
      nodes
    )
    const pred = eliminateOutliers(quad)
    expect(pred(b1)).toBeFalsy()
  })

  test("Don't eliminate outliers which are traveling at high velocity towards the centre of mass", () => {
    const b1: Body = {
      mass: 1,
      massX: 25,
      massY: 25,
      xSpeed: Number.MAX_VALUE,
      ySpeed: Number.MAX_VALUE,
    }
    const b2: CentreOfMass = { mass: 1, massX: 76, massY: 3 }
    const b3: CentreOfMass = { mass: 1, massX: 85, massY: 5 }
    const b4: CentreOfMass = { mass: 1, massX: 87.5, massY: 37.5 }
    const nodes: CentreOfMass[] = [b1, b2, b3, b4]
    const boundaries = getBoundaries(nodes)
    const quad = createQuadAndInsertBodies(
      boundaries.centerX,
      boundaries.centerY,
      boundaries.size,
      nodes
    )
    const pred = eliminateOutliers(quad)
    expect(pred(b1)).toBeTruthy()
  })

  test("Eliminate outliers should create a predicate which is true for a body travelling over escape velocity", () => {
    const body: Body = {
      mass: 87.5,
      massX: 400,
      massY: 400,
      xSpeed: 10,
      ySpeed: 12,
    }
    const quad: QuadBase = {
      massX: 610.3309244128295,
      massY: 542.090995399429,
      mass: 247.77992948564253,
      centerX: 1214.2842789585436,
      centerY: 962.949362634982,
      size: 2351.5888576536704,
      total: 101,
      insert(_: any): void {},
    }
    const pred = eliminateOutliers(quad)
    expect(pred(body)).toBeTruthy()
  })

  test("Eliminate outliers should create a predicate which is true for a body travelling over escape velocity", () => {
    const body: Body = {
      mass: 1.8340438833592967,
      massX: 2181.8829430798787,
      massY: 1645.1395859043305,
      xSpeed: -5.278678190384497,
      ySpeed: -10.120698277660486,
    }
    const quad: QuadBase = {
      massX: 415.09949539996944,
      massY: 399.881460413101,
      mass: 221.87956737011322,
      centerX: 1129.9180239701232,
      centerY: 838.9875000166167,
      size: 2103.9298382195116,
      total: 89,
      insert(_: any): void {},
    }
    const pred = eliminateOutliers(quad)
    expect(pred(body)).toBeTruthy()
  })

  // get quad for body

  test("Single leaf with body inside returns the leaf", () => {
    const body: Body = {
      mass: 1,
      massX: 25,
      massY: 25,
      xSpeed: 0,
      ySpeed: 0,
    }
    const leaf = new Leaf(25, 25, 50, [body])
    expect(getQuadForBody(body, leaf)).toEqual(leaf)
  })

  test("Single leaf with no body returns null", () => {
    const body: Body = {
      mass: 1,
      massX: 25,
      massY: 25,
      xSpeed: 0,
      ySpeed: 0,
    }
    const leaf = new Leaf(25, 25, 50, [])
    expect(getQuadForBody(body, leaf)).toEqual(null)
  })

  test("Fork with leaf in one quadrant returns that leaf", () => {
    const body: Body = {
      mass: 1,
      massX: 25,
      massY: 25,
      xSpeed: 0,
      ySpeed: 0,
    }
    const leaf = new Leaf(25, 25, 50, [body])
    const fork = new Fork(leaf, new Empty(75, 25, 50), new Empty(25, 75, 50), new Empty(75, 75, 50))
    expect(getQuadForBody(body, fork)).toEqual(leaf)
  })

  test("Body with incorrect coordinates returns null", () => {
    const body: Body = {
      mass: 1,
      massX: 25,
      massY: 75,
      xSpeed: 0,
      ySpeed: 0,
    }
    const leaf = new Leaf(25, 25, 50, [body])
    const fork = new Fork(leaf, new Empty(75, 25, 50), new Empty(25, 75, 50), new Empty(75, 75, 50))
    expect(getQuadForBody(body, fork)).toEqual(null)
  })
})
