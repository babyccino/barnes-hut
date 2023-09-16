import { Body, BoundariesInterface, CentreOfMass } from "./interface"
import { IntervalMap, Line, addLinesFromQuad, mergeIntervals } from "./lines"
import { Fork, Leaf, Quad, willCalc } from "./simulation"
import { getQuadrant, grey } from "./util"

export interface BodyGraphic extends Body {
  color: string
  size: number
}

export function renderLine(
  canvas: CanvasRenderingContext2D,
  line: Line,
  horizontal: boolean,
  transverse: number,
  color: string,
  dashed: boolean
) {
  let x1, x2, y1, y2
  if (horizontal) {
    x1 = line[0]
    x2 = line[1]
    y1 = y2 = transverse
    y2 = transverse
  } else {
    x1 = transverse
    x2 = transverse
    y1 = line[0]
    y2 = line[1]
  }
  return renderLineSegment(canvas, color, 2, dashed, x1, y1, x2, y2)
}

export function renderLineBetweenBodies(
  canvas: CanvasRenderingContext2D,
  body1: CentreOfMass,
  body2: CentreOfMass,
  color: string
) {
  return renderLineSegment(
    canvas,
    color,
    4,
    true,
    body1.massX,
    body1.massY,
    body2.massX,
    body2.massY
  )
}

function setDashed(canvas: CanvasRenderingContext2D, dashed: boolean) {
  if (dashed) canvas.setLineDash([5, 10])
  else canvas.setLineDash([])
}

export function renderLineSegment(
  canvas: CanvasRenderingContext2D,
  color: string,
  strokeWidth: number,
  dashed: boolean,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  canvas.beginPath()
  setDashed(canvas, dashed)
  canvas.strokeStyle = color
  canvas.lineWidth = strokeWidth
  canvas.moveTo(x1, y1)
  canvas.lineTo(x2, y2)
  canvas.stroke()
}

export function renderRectangle(
  canvas: CanvasRenderingContext2D,
  rectangle: BoundariesInterface,
  color: string,
  lineWidth: number,
  dashed: boolean = false
): void {
  canvas.strokeStyle = color
  canvas.lineWidth = lineWidth
  setDashed(canvas, dashed)
  canvas.strokeRect(
    rectangle.centerX - rectangle.size / 2,
    rectangle.centerY - rectangle.size / 2,
    rectangle.size,
    rectangle.size
  )
}

export function renderCircle(
  canvas: CanvasRenderingContext2D,
  body: CentreOfMass,
  color: string,
  size: number = 0.7 * (body.mass - 1) + 4
): void {
  canvas.beginPath()
  canvas.arc(body.massX, body.massY, size, 0, 2 * Math.PI, false)
  canvas.fillStyle = color
  canvas.fill()
}

function foundAddedQuad(
  newBody: Body,
  newQuad: Quad,
  addedQuads: BoundariesInterface[],
  depthLimit: number = Number.MAX_VALUE,
  depth: number = 0
): BoundariesInterface[] {
  if (!(newQuad instanceof Fork) || depth > depthLimit) return addedQuads

  addedQuads.push(newQuad)
  return foundAddedQuad(
    newBody,
    newQuad[getQuadrant(newBody, newQuad)],
    addedQuads,
    depthLimit,
    depth + 1
  )
}

export function newLines(
  newBody: Body,
  newQuad: Quad,
  oldQuad: Quad | null,
  depthLimit: number = Number.MAX_VALUE,
  depth: number = 0
): BoundariesInterface[] {
  if (!(newQuad instanceof Fork) || depth > depthLimit) return []
  // if we have reached a new fork add the lines
  // (because newquad is still a fork but the old one is no longer)
  // continue adding lines from here on in by making oldQuad null
  if (oldQuad === null || !(oldQuad instanceof Fork)) {
    return foundAddedQuad(newBody, newQuad, [], depthLimit, depth)
  }

  const quadrant = getQuadrant(newBody, newQuad)

  return newLines(newBody, newQuad[quadrant], oldQuad[quadrant], depthLimit, depth + 1)
}

export function animateQuadTree(
  canvas: CanvasRenderingContext2D,
  quad: Quad,
  body: CentreOfMass,
  theta: number
): void {
  /**
   * The z-index of svg elements relies on the order in which they are added
   * so to make sure the quads which are being calculated are rendered on top
   * the tree needs to be traversed once to render the quads which will not be calculated
   * and then again for the quads which will be traversed
   *  */
  const depthLimit = 100

  const verticalLines = new IntervalMap()
  const horizontalLines = new IntervalMap()

  const leavesToRender: Leaf[] = []
  const forksToRender: Quad[] = []

  const traverse = (traversingQuad: Quad, depth: number = 0, passedCalc = false): void => {
    if (depth >= depthLimit) return

    const _willCalc = willCalc(traversingQuad, body, theta)
    const isLeaf = traversingQuad instanceof Leaf

    if (isLeaf || passedCalc || !_willCalc) {
      addLinesFromQuad(traversingQuad, horizontalLines, verticalLines)
    }
    if (isLeaf && traversingQuad.bodies.includes(body)) return

    if (!passedCalc && _willCalc) {
      if (isLeaf) leavesToRender.push(traversingQuad)
      else forksToRender.push(traversingQuad)
    }

    if (traversingQuad instanceof Fork) {
      traverse(traversingQuad.nw, depth + 1, _willCalc)
      traverse(traversingQuad.ne, depth + 1, _willCalc)
      traverse(traversingQuad.sw, depth + 1, _willCalc)
      traverse(traversingQuad.se, depth + 1, _willCalc)
    }
  }
  traverse(quad)

  horizontalLines.forEach((intervals, y) =>
    mergeIntervals(intervals).forEach(line => renderLine(canvas, line, true, y, grey(0.4), true))
  )
  verticalLines.forEach((intervals, x) =>
    mergeIntervals(intervals).forEach(line => renderLine(canvas, line, false, x, grey(0.4), true))
  )
  for (const leaf of leavesToRender) {
    renderCircle(canvas, leaf, "red", leaf.mass * 4.1)
    renderLineBetweenBodies(canvas, leaf, body, "red")
  }
  for (const fork of forksToRender) {
    renderRectangle(canvas, fork, "red", 2)
    renderCircle(canvas, fork, "red", 5 * Math.sqrt(fork.mass))
    renderLineBetweenBodies(canvas, fork, body, "red")
  }
}
