import { useEffect, useRef, MutableRefObject, RefObject } from "react"
import { Body, CentreOfMass, QuadInterface } from "../lib/interface"
import { Line } from "../lib/lines"
import {
  Boundaries,
  createForkAndInsertBodies,
  eliminateOutliers,
  Empty,
  Fork,
  GEE,
  getBoundaries,
  Leaf,
  Quad,
  standardNBody,
  THETA,
  update,
  willCalc,
} from "../lib/simulation"
import { distance, rand } from "../lib/util"

export default function Simulation({
  nodeCount,
  running,
}: {
  nodeCount: number
  running: boolean
}): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const nodes = useRef<SvgNode[]>([])
  const rectangles = useRef<Rectangle[]>([])
  const frame = useRef<number>(-1)

  useEffect(() => {
    if (running && svgRef.current) {
      const fun = () => {
        if (!svgRef.current) return
        nodes.current = animate(svgRef.current, nodes.current, {
          nodeToRenderQuad: nodes.current[0],
          rectangles: rectangles.current,
        })
        frame.current = window.requestAnimationFrame(fun)
      }
      frame.current = window.requestAnimationFrame(fun)
    }

    if (!running) {
      window.cancelAnimationFrame(frame.current - 1)
      window.cancelAnimationFrame(frame.current)
    }
  }, [running])

  useEffect(() => {
    clear(svgRef, nodes, rectangles)

    // randomlyDistributedPoints(svgRef.current, nodes.current, nodeCount)
    if (!svgRef.current) return
    init2Galaxies(svgRef.current, nodes.current, nodeCount)
  }, [nodeCount])

  return <svg ref={svgRef} width={X_MAX} height={Y_MAX} />
}

function clear(
  svgRef: RefObject<SVGSVGElement>,
  nodes: MutableRefObject<SvgNode[]>,
  rectangles: MutableRefObject<Rectangle[]>
): void {
  svgRef.current && (svgRef.current.innerHTML = "")
  nodes.current = []
  rectangles.current = []
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
function createNode(
  svg: SVGSVGElement,
  nodes: SvgNode[],
  node: Body,
  color: string,
  opacity: number,
  blackHole: boolean = false
): SvgNode {
  const el = document.createElementNS(SVGNS, "circle")
  el.setAttributeNS(null, "cx", node.massX.toString())
  el.setAttributeNS(null, "cy", node.massY.toString())
  el.setAttributeNS(null, "r", blackHole ? "2" : node.mass.toString())
  el.setAttributeNS(null, "fill", color)
  el.setAttributeNS(null, "opacity", opacity.toString())
  svg.appendChild(el)

  const newNode: SvgNode = Object.assign({ el, color }, node)
  nodes.push(newNode)

  return newNode
}

function randomlyDistributedPoints(
  svg: SVGSVGElement,
  nodes: SvgNode[],
  count: number
): void {
  while (count--) {
    createNode(
      svg,
      nodes,
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
    createNode(
      svg,
      nodes,
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

      createNode(
        svg,
        nodes,
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

const COORD_TRANSFORM = 500 / 2550
function animate(
  svg: SVGSVGElement,
  nodes: SvgNode[],
  renderQuad?: {
    nodeToRenderQuad: SvgNode
    rectangles: Rectangle[]
  }
): SvgNode[] {
  const boundaries = getBoundaries(nodes)
  const quad = createForkAndInsertBodies(
    boundaries.centerX,
    boundaries.centerY,
    boundaries.size,
    nodes
  )

  if (renderQuad && renderQuad.rectangles.length > 0) {
    renderQuad.rectangles.forEach((rect) => svg.removeChild(rect.el))
    renderQuad.rectangles.splice(0, renderQuad.rectangles.length)
  }

  // remove svg elements if node is to be removed
  const pred = eliminateOutliers(quad)
  nodes.forEach((node) => !pred(node) && svg.removeChild(node.el))

  // filter nodes then animate them
  const maxDepth = 10
  const newNodes = nodes.filter(pred).map((node) => {
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

  /**
   * The z-index of svg elements relies on the order in which they are added
   * so to make sure the quads which are being calculated are rendered on top
   * the tree needs to be traversed once to render the quads which will not be calculated
   * and then again for the quads which will be traversed
   *  */
  if (renderQuad) {
    const depthLimit = 100
    // first traverse

    const secondTrav = (traversingQuad: Quad, depth: number = 0): void => {
      if (depth >= depthLimit) return

      if (willCalc(traversingQuad, renderQuad.nodeToRenderQuad))
        renderRectangle(svg, renderQuad.rectangles, traversingQuad, "red", 1)
      else if (traversingQuad instanceof Fork) {
        secondTrav(traversingQuad.nw, depth + 1)
        secondTrav(traversingQuad.ne, depth + 1)
        secondTrav(traversingQuad.sw, depth + 1)
        secondTrav(traversingQuad.se, depth + 1)
      }
    }
    secondTrav(quad)
  }

  return newNodes
}

function renderLine(line: Line): void {}

function renderNodeQuad(
  svg: SVGSVGElement,
  rectangles: Rectangle[],
  node: Body,
  quad: Quad,
  maxDepth: number
): void {
  renderRectangle(svg, rectangles, quad, "pink", 1)
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
  rectangles: Rectangle[],
  quad: Quad,
  color: string,
  opacity: number,
  dashed: boolean = false
): void {
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
  dashed && el.setAttributeNS(null, "stroke-dasharray", "5 10")
  svg.appendChild(el)

  rectangles.push({ el })
}
