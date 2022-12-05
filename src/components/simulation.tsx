import { useEffect, useRef, useCallback } from "react"
import { render } from "react-dom"
import { Body, CentreOfMass } from "../lib/interface"
import { getLines, IntervalMapCb, Line } from "../lib/lines"
import {
  createQuadAndInsertBodies,
  eliminateOutliers,
  Empty,
  Fork,
  GEE,
  getBoundaries,
  Leaf,
  Quad,
  standardNBody,
  update,
  willCalc,
} from "../lib/simulation"
import { rand } from "../lib/util"

export default function Simulation({
  nodeCount,
  running,
  renderUncalcuatedQuads,
  renderCalculatedQuads,
  theta,
}: {
  nodeCount: number
  running: boolean
  renderUncalcuatedQuads: boolean
  renderCalculatedQuads: boolean
  theta: number
}): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const nodesRef = useRef<SvgNode[]>([])
  const clearablesRef = useRef<SVGElement[]>([])
  const frame = useRef<number>(-1)

  const clearAndRenderQuad = useCallback(() => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const nodes = nodesRef.current
    if (!nodes.length) return
    const clearables = clearablesRef.current

    const boundaries = getBoundaries(nodes)
    const quad = createQuadAndInsertBodies(
      boundaries.centerX,
      boundaries.centerY,
      boundaries.size,
      nodes
    )
    const focusNode = nodes[0]

    clearImpermanentElements(svg, clearables)
    animateQuadTree(svg, clearables, quad, focusNode, theta)
    clearables.push(renderCircle(svg, focusNode, focusNode.color, 1, 5))
  }, [theta])

  useEffect(() => {
    console.log("use effect 1")
    if (!running && renderCalculatedQuads) {
      clearAndRenderQuad()
    }
  }, [running, clearAndRenderQuad, renderCalculatedQuads])

  useEffect(() => {
    nodesRef.current.forEach((node) =>
      node.el.setAttributeNS(
        null,
        "opacity",
        (renderCalculatedQuads ? 0.3 : 1).toString()
      )
    )
  }, [renderCalculatedQuads])

  useEffect(() => {
    window.cancelAnimationFrame(frame.current - 1)
    window.cancelAnimationFrame(frame.current)

    if (running && svgRef.current) {
      const renderLoop = () => {
        if (!svgRef.current) return
        const svg = svgRef.current
        const nodes = nodesRef.current
        if (!nodes.length) return
        const clearables = clearablesRef.current

        const boundaries = getBoundaries(nodes)
        const quad = createQuadAndInsertBodies(
          boundaries.centerX,
          boundaries.centerY,
          boundaries.size,
          nodes
        )
        const focusNode = nodes[0]

        nodesRef.current = animatePoints(svg, nodes, quad)

        // Quadtree rendering
        clearImpermanentElements(svg, clearables)
        animateQuadTree(svg, clearables, quad, focusNode, theta)

        // Render again the node which the quadtree animation is focusing on, so it
        // appears on top
        clearables.push(renderCircle(svg, focusNode, focusNode.color, 1, 5))

        frame.current = window.requestAnimationFrame(renderLoop)
      }
      frame.current = window.requestAnimationFrame(renderLoop)
    }
  }, [running, renderUncalcuatedQuads, renderCalculatedQuads, theta])

  useEffect(() => {
    if (!running) {
      window.cancelAnimationFrame(frame.current - 1)
      window.cancelAnimationFrame(frame.current)
    }
  }, [running])

  useEffect(() => {
    fullClear(svgRef.current, nodesRef.current, clearablesRef.current)

    // randomlyDistributedPoints(svgRef.current, nodes.current, nodeCount)
    if (!svgRef.current) return
    init2Galaxies(svgRef.current, nodesRef.current, nodeCount)
  }, [nodeCount])

  return <svg ref={svgRef} width={X_MAX} height={Y_MAX} />
}

function fullClear(
  svg: SVGSVGElement | null,
  nodes: SvgNode[],
  clearables: SVGElement[]
): void {
  svg && (svg.innerHTML = "")
  clearables.splice(0, clearables.length)
  nodes.splice(0, nodes.length)
}

/**
 * Clear elements which exist for only one frame
 * @param svg
 * @param clearables
 */
function clearImpermanentElements(
  svg: SVGSVGElement,
  clearables: SVGElement[]
): void {
  if (clearables.length) {
    clearables.forEach((el) => svg.removeChild(el))
    clearables.splice(0, clearables.length)
  }
}

const range = (from: number, to: number): number[] =>
  Array.from(new Array(to - from), (_, i) => i + to)

const X_MAX = 500
const Y_MAX = 500

export interface SvgNode extends Body {
  el: SVGCircleElement
  color: string
}

interface Rectangle {
  el: SVGRectElement
}

const SVGNS = "http://www.w3.org/2000/svg"
function renderCircle(
  svg: SVGSVGElement,
  body: CentreOfMass,
  color: string,
  opacity: number = 1,
  size?: number
): SVGCircleElement {
  const el = document.createElementNS(SVGNS, "circle")
  el.setAttributeNS(null, "cx", (body.massX * COORD_TRANSFORM).toString())
  el.setAttributeNS(null, "cy", (body.massY * COORD_TRANSFORM).toString())
  el.setAttributeNS(null, "r", (size ?? body.mass).toString())
  el.setAttributeNS(null, "fill", color)
  el.setAttributeNS(null, "opacity", opacity.toString())
  svg.appendChild(el)
  return el
}

const COORD_TRANSFORM = 500 / 2550
function createNode(
  svg: SVGSVGElement,
  node: Body,
  color: string,
  opacity: number,
  blackHole: boolean = false
): SvgNode {
  const el = document.createElementNS(SVGNS, "circle")
  el.setAttributeNS(null, "cx", (node.massX * COORD_TRANSFORM).toString())
  el.setAttributeNS(null, "cy", (node.massY * COORD_TRANSFORM).toString())
  el.setAttributeNS(null, "r", blackHole ? "2" : node.mass.toString())
  el.setAttributeNS(null, "fill", color)
  el.setAttributeNS(null, "opacity", opacity.toString())
  svg.appendChild(el)

  const newNode: SvgNode = Object.assign({ el, color }, node)

  return newNode
}

function randomlyDistributedPoints(
  svg: SVGSVGElement,
  nodes: SvgNode[],
  count: number
): void {
  while (count--) {
    nodes.push(
      createNode(
        svg,
        {
          massX: rand(0, 2000),
          massY: rand(0, 2000),
          xSpeed: rand(-20, 20),
          ySpeed: rand(-20, 20),
          mass: 1,
        },
        "yellow",
        1
      )
    )
  }
}

const grey = "rgb(230, 230, 230)"
function init2Galaxies(
  svg: SVGSVGElement,
  nodes: SvgNode[],
  totalBodies: number
): void {
  function galaxy(
    num: number,
    maxRadius: number,
    galaxyX: number,
    galaxyY: number,
    galaxySpeedX: number,
    galaxySpeedY: number
  ): void {
    const totalM = 1.5 * num
    const blackHoleM = 1.0 * num

    // black hole
    nodes.push(
      createNode(
        svg,
        {
          mass: blackHoleM,
          massX: galaxyX,
          massY: galaxyY,
          xSpeed: galaxySpeedX,
          ySpeed: galaxySpeedY,
        },
        "black",
        1,
        true
      )
    )

    // stars
    for (let i = 1; i < num; ++i) {
      const angle = rand(0, 2 * Math.PI)
      const radius = 25 + rand(0, maxRadius)
      const starX = galaxyX + radius * Math.sin(angle)
      const starY = galaxyY + radius * Math.cos(angle)
      const speed = Math.sqrt(
        (GEE * blackHoleM) / radius +
          (GEE * totalM * radius * radius) / Math.pow(maxRadius, 3)
      )
      const starSpeedY = galaxySpeedY + speed * Math.cos(angle + Math.PI / 2)
      const starSpeedX = galaxySpeedX + speed * Math.sin(angle + Math.PI / 2)
      const starMass = 1.0 + rand(0, 1)

      nodes.push(
        createNode(
          svg,
          {
            mass: starMass,
            massX: starX,
            massY: starY,
            xSpeed: starSpeedX,
            ySpeed: starSpeedY,
          },
          grey,
          0.3
        )
      )
    }
  }

  galaxy((totalBodies / 8) * 7, 350.0, 400, 400, 10, 12)
  galaxy(totalBodies / 8, 300, 2200, 1600, -10, -12)
}

function removeNodes(
  svg: SVGSVGElement,
  nodes: SvgNode[],
  count: number
): void {
  while (count--) {
    const node = nodes.pop()
    if (!node) return
    svg.removeChild(node.el)
  }
}

function animateStandardNBody(svg: SVGSVGElement, nodes: SvgNode[]): SvgNode[] {
  return nodes.map((node) => {
    const newNode = standardNBody(node, nodes)

    node.el.setAttributeNS(null, "cx", node.massX.toString())
    node.el.setAttributeNS(null, "cy", node.massY.toString())

    return Object.assign(node, newNode)
  })
}

function animatePoints(
  svg: SVGSVGElement,
  nodes: SvgNode[],
  quad: Quad
): SvgNode[] {
  // remove svg elements if node is to be removed
  const pred = eliminateOutliers(quad)
  nodes.forEach((node) => !pred(node) && svg.removeChild(node.el))

  // filter nodes then animate them
  return nodes.filter(pred).map((node) => {
    const newNode = update(node, quad)

    node.el.setAttributeNS(
      null,
      "cx",
      (COORD_TRANSFORM * newNode.massX).toString()
    )
    node.el.setAttributeNS(
      null,
      "cy",
      (COORD_TRANSFORM * newNode.massY).toString()
    )

    return Object.assign(node, newNode)
  })
}

function animateQuadTree(
  svg: SVGSVGElement,
  clearables: SVGElement[],
  quad: Quad,
  node: CentreOfMass,
  theta: number
): void {
  clearImpermanentElements(svg, clearables)

  /**
   * The z-index of svg elements relies on the order in which they are added
   * so to make sure the quads which are being calculated are rendered on top
   * the tree needs to be traversed once to render the quads which will not be calculated
   * and then again for the quads which will be traversed
   *  */
  const depthLimit = 100

  // first traverse
  const [horizontalLines, verticalLines] = getLines(
    quad,
    node,
    theta,
    depthLimit
  )
  horizontalLines.forEach((intervals, y) => {
    intervals.forEach((line) =>
      clearables.push(renderLine(svg, line, true, y, "grey", 0.3))
    )
  })
  verticalLines.forEach((intervals, x) => {
    intervals.forEach((line) =>
      clearables.push(renderLine(svg, line, false, x, "grey", 0.3))
    )
  })

  const secondTrav = (traversingQuad: Quad, depth: number = 0): void => {
    if (depth >= depthLimit) return

    if (traversingQuad instanceof Leaf && traversingQuad.bodies.includes(node))
      return

    if (willCalc(traversingQuad, node, theta)) {
      if (!(traversingQuad instanceof Leaf))
        clearables.push(renderRectangle(svg, traversingQuad, "red", 1))
      clearables.push(renderCircle(svg, traversingQuad, "red", 1))
      clearables.push(
        renderLineBetweenBodies(svg, traversingQuad, node, "red", 0.5)
      )
    } else if (traversingQuad instanceof Fork) {
      secondTrav(traversingQuad.nw, depth + 1)
      secondTrav(traversingQuad.ne, depth + 1)
      secondTrav(traversingQuad.sw, depth + 1)
      secondTrav(traversingQuad.se, depth + 1)
    }
  }
  secondTrav(quad)
}

function renderLine(
  svg: SVGSVGElement,
  line: Line,
  horizontal: boolean,
  transverse: number,
  color: string,
  opacity: number
): SVGLineElement {
  const [x1, x2] = horizontal ? line : [transverse, transverse]
  const [y1, y2] = horizontal ? [transverse, transverse] : line

  return renderLineSegment(svg, [x1, y1, x2, y2], color, opacity)
}

function renderLineBetweenBodies(
  svg: SVGSVGElement,
  body1: CentreOfMass,
  body2: CentreOfMass,
  color: string,
  opacity: number
): SVGLineElement {
  const line = [body1.massX, body1.massY, body2.massX, body2.massY] as const

  return renderLineSegment(svg, line, color, opacity)
}

function renderLineSegment(
  svg: SVGSVGElement,
  line: readonly [number, number, number, number],
  color: string,
  opacity: number
): SVGLineElement {
  const el = document.createElementNS(SVGNS, "line")
  const [x1, y1, x2, y2] = line

  el.setAttributeNS(null, "x1", (COORD_TRANSFORM * x1).toString())
  el.setAttributeNS(null, "x2", (COORD_TRANSFORM * x2).toString())
  el.setAttributeNS(null, "y1", (COORD_TRANSFORM * y1).toString())
  el.setAttributeNS(null, "y2", (COORD_TRANSFORM * y2).toString())

  el.setAttributeNS(null, "stroke", color)
  el.setAttributeNS(null, "stroke-width", "1")
  el.setAttributeNS(null, "opacity", opacity.toString())
  el.setAttributeNS(null, "stroke-dasharray", "2 3")
  svg.appendChild(el)

  return el
}

function renderNodeQuad(
  svg: SVGSVGElement,
  rectangles: Rectangle[],
  node: Body,
  quad: Quad,
  maxDepth: number
): void {
  const rect = renderRectangle(svg, quad, "pink", 1)
  if (maxDepth == 0 || quad instanceof Leaf || quad instanceof Empty) return

  const belowMiddle = node.massY > quad.centerY
  const rightOfMiddle = node.massX > quad.centerX
  if (belowMiddle && rightOfMiddle)
    renderNodeQuad(svg, rectangles, node, quad, maxDepth - 1)
  else if (belowMiddle && !rightOfMiddle)
    renderNodeQuad(svg, rectangles, node, quad, maxDepth - 1)
  else if (!belowMiddle && rightOfMiddle)
    renderNodeQuad(svg, rectangles, node, quad, maxDepth - 1)
  else renderNodeQuad(svg, rectangles, node, quad, maxDepth - 1)
}

function renderRectangle(
  svg: SVGSVGElement,
  quad: Quad,
  color: string,
  opacity: number
): SVGRectElement {
  const el = document.createElementNS(SVGNS, "rect")
  el.setAttributeNS(
    null,
    "x",
    (COORD_TRANSFORM * (quad.centerX - quad.size / 2)).toString()
  )
  el.setAttributeNS(
    null,
    "y",
    (COORD_TRANSFORM * (quad.centerY - quad.size / 2)).toString()
  )
  el.setAttributeNS(null, "height", (COORD_TRANSFORM * quad.size).toString())
  el.setAttributeNS(null, "width", (COORD_TRANSFORM * quad.size).toString())
  el.setAttributeNS(null, "stroke", color)
  el.setAttributeNS(null, "fill-opacity", "0")
  el.setAttributeNS(null, "stroke-width", "1")
  el.setAttributeNS(null, "opacity", opacity.toString())
  svg.appendChild(el)

  return el
}
