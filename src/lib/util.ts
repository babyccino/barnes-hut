import { BoundariesInterface, CentreOfMass, ForkInterface } from "./interface"

function mulberry32(a: number) {
  return (): number => {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = mulberry32(0)

export function rand(max: number): number
export function rand(min: number, max: number): number
export function rand(min: number, max?: number): number {
  if (max === undefined) {
    max = min
    min = 0
  }
  return (max - min) * random() + min
}

export const distance = (body1: CentreOfMass, body2: CentreOfMass): number =>
  Math.sqrt(Math.pow(body2.massX - body1.massX, 2) + Math.pow(body2.massY - body1.massY, 2))

export function unitVector(body1: CentreOfMass, body2: CentreOfMass): [number, number] {
  const dist = distance(body1, body2)
  return [(body2.massX - body1.massX) / dist, (body2.massY - body1.massY) / dist]
}

export function getQuadrant(body: CentreOfMass, quad: BoundariesInterface): keyof ForkInterface {
  const belowMiddle = body.massY > quad.centerY
  const rightOfMiddle = body.massX > quad.centerX

  if (belowMiddle && rightOfMiddle) return "se"
  else if (belowMiddle && !rightOfMiddle) return "sw"
  else if (!belowMiddle && rightOfMiddle) return "ne"
  else return "nw"
}

export function interweaveArrays<T>(arr1: T[], arr2: T[]): T[] {
  const ret: T[] = []
  const smaller = arr1.length < arr2.length ? arr1 : arr2
  const larger = arr1.length < arr2.length ? arr2 : arr1
  for (let i = 0; i < smaller.length; ++i) {
    ret.push(larger[i], smaller[i])
  }
  return ret.concat(larger.slice(smaller.length))
}

export const range = (from: number, to: number): number[] =>
  Array.from(new Array(to - from), (_, i) => i + from)

export const grey = (opacity: number) => `rgba(155, 155, 155, ${opacity})`
