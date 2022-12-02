import { CentreOfMass } from "./interface"

export function rand(max: number): number
export function rand(min: number, max: number): number
export function rand(min: number, max?: number): number {
  if (max === undefined) {
    max = min
    min = 0
  }
  return (max - min) * Math.random() + min
}

export const distance = (body1: CentreOfMass, body2: CentreOfMass): number =>
  Math.sqrt(
    Math.pow(body2.massX - body1.massX, 2) +
      Math.pow(body2.massY - body1.massY, 2)
  )

export function unitVector(
  body1: CentreOfMass,
  body2: CentreOfMass
): [number, number] {
  const dist = distance(body1, body2)
  return [
    (body2.massX - body1.massX) / dist,
    (body2.massY - body1.massY) / dist,
  ]
}
