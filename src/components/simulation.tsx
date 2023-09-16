import { SVGProps, useCallback, useEffect, useRef } from "react"
import { GALAXY } from "../lib/galaxy"
import { CentreOfMass } from "../lib/interface"
import { IntervalMap, addLinesFromQuad, mergeIntervals } from "../lib/lines"
import {
  SvgNode,
  createNode,
  renderCircle,
  renderLine,
  renderLineBetweenBodies,
  renderRectangle,
} from "../lib/render"
import {
  Fork,
  Leaf,
  Quad,
  createQuadAndInsertBodies,
  eliminateOutliers,
  getBoundaries,
  standardNBody,
  update,
  willCalc,
} from "../lib/simulation"
import { rand } from "../lib/util"

const IS_DEV = process.env.NODE_ENV === "development"

let TIME = 0
let FRAME_COUNTER = 0
let FRAME_SKIP = 15

export default function Simulation({
  nodeCount,
  running,
  renderUncalcuatedQuads,
  renderCalculatedQuads,
  theta,
  ...props
}: {
  nodeCount: number
  running: boolean
  renderUncalcuatedQuads: boolean
  renderCalculatedQuads: boolean
  theta: number
} & SVGProps<SVGSVGElement>): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const nodesRef = useRef<SvgNode[]>([])
  const clearablesRef = useRef<SVGElement[]>([])
  const frame = useRef<number>(-1)
  const fpsRef = useRef<HTMLParagraphElement>(null)

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

  // rerender quadtree
  useEffect(() => {
    if (!running && renderCalculatedQuads) {
      clearAndRenderQuad()
    }
  }, [running, clearAndRenderQuad, renderCalculatedQuads])

  // change node opacity when estimation graphic is visible
  useEffect(() => {
    nodesRef.current.forEach(node =>
      node.el.setAttributeNS(null, "opacity", (renderCalculatedQuads ? 0.4 : 1).toString())
    )
  }, [renderCalculatedQuads])

  // animation loop
  useEffect(() => {
    window.cancelAnimationFrame(frame.current - 1)
    window.cancelAnimationFrame(frame.current)

    if (running && svgRef.current) {
      const renderLoop = (time: number) => {
        if (IS_DEV && fpsRef.current && FRAME_COUNTER && FRAME_COUNTER % FRAME_SKIP === 0) {
          fpsRef.current.innerText = ((1000 * FRAME_SKIP) / (time - TIME)).toPrecision(3).toString()
          TIME = time
          FRAME_COUNTER = 0
        }
        ++FRAME_COUNTER

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

        clearImpermanentElements(svg, clearables)
        // Quadtree rendering
        if (renderCalculatedQuads) {
          animateQuadTree(svg, clearables, quad, focusNode, theta)

          // Render again the node which the quadtree animation is focusing on, so it
          // appears on top
          clearables.push(renderCircle(svg, focusNode, focusNode.color, 1, 5))
        }

        frame.current = window.requestAnimationFrame(renderLoop)
      }
      frame.current = window.requestAnimationFrame(renderLoop)
    }
  }, [running, renderUncalcuatedQuads, renderCalculatedQuads, theta])

  // stop animation
  useEffect(() => {
    if (!running) {
      window.cancelAnimationFrame(frame.current - 1)
      window.cancelAnimationFrame(frame.current)
    }
  }, [running])

  // reset system
  useEffect(() => {
    const svg = svgRef.current
    const clearables = clearablesRef.current
    fullClear(svg, nodesRef.current, clearables)

    if (!svg) return

    nodesRef.current = GALAXY.slice(0, nodeCount).map<SvgNode>(node =>
      node.mass > 2
        ? createNode(svg as SVGSVGElement, node, "black", 1, true)
        : createNode(svg as SVGSVGElement, node, "grey", 1)
    )
  }, [nodeCount])

  if (IS_DEV)
    return (
      <>
        <svg {...props} ref={svgRef} viewBox={`0 0 ${X_MAX} ${Y_MAX}`} />
        <p
          ref={fpsRef}
          style={{ zIndex: 100, position: "fixed", right: 10, top: 10, fontSize: "2rem" }}
        >
          FPS
        </p>
      </>
    )
  return <svg {...props} ref={svgRef} viewBox={`0 0 ${X_MAX} ${Y_MAX}`} />
}

function fullClear(svg: SVGSVGElement | null, nodes: SvgNode[], clearables: SVGElement[]): void {
  svg && (svg.innerHTML = "")
  clearables.splice(0, clearables.length)
  nodes.splice(0, nodes.length)
}

/**
 * Clear elements which exist for only one frame
 * @param svg
 * @param clearables
 */
function clearImpermanentElements(svg: SVGSVGElement, clearables: SVGElement[]): void {
  if (clearables.length) {
    clearables.forEach(el => svg.removeChild(el))
    clearables.splice(0, clearables.length)
  }
}

const range = (from: number, to: number): number[] =>
  Array.from(new Array(to - from), (_, i) => i + to)

const X_MAX = 2500
const Y_MAX = 2500

function randomlyDistributedPoints(svg: SVGSVGElement, nodes: SvgNode[], count: number): void {
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

function animateStandardNBody(svg: SVGSVGElement, nodes: SvgNode[]): SvgNode[] {
  return nodes.map(node => {
    const newNode = standardNBody(node, nodes)

    node.el.setAttributeNS(null, "cx", node.massX.toString())
    node.el.setAttributeNS(null, "cy", node.massY.toString())

    return Object.assign(node, newNode)
  })
}

function animatePoints(svg: SVGSVGElement, nodes: SvgNode[], quad: Quad): SvgNode[] {
  // remove svg elements if node is to be removed
  const pred = eliminateOutliers(quad)
  nodes.forEach(node => !pred(node) && svg.removeChild(node.el))

  // filter nodes then animate them
  return nodes.filter(pred).map(node => {
    const newNode = update(node, quad)

    node.el.setAttributeNS(null, "cx", newNode.massX.toString())
    node.el.setAttributeNS(null, "cy", newNode.massY.toString())

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

  const verticalLines = new IntervalMap()
  const horizontalLines = new IntervalMap()

  const leavesToRender: Leaf[] = []
  const forksToRender: Quad[] = []

  const traverse = (traversingQuad: Quad, depth: number = 0, passedCalc = false): void => {
    if (depth >= depthLimit) return

    const _willCalc = willCalc(traversingQuad, node, theta)
    const isLeaf = traversingQuad instanceof Leaf

    if (isLeaf || passedCalc || !_willCalc) {
      addLinesFromQuad(traversingQuad, horizontalLines, verticalLines)
    }
    if (isLeaf && traversingQuad.bodies.includes(node)) return

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
    mergeIntervals(intervals).forEach(line =>
      clearables.push(renderLine(svg, line, true, y, "grey", 0.3))
    )
  )
  verticalLines.forEach((intervals, x) =>
    mergeIntervals(intervals).forEach(line =>
      clearables.push(renderLine(svg, line, false, x, "grey", 0.3))
    )
  )
  for (const leaf of leavesToRender) {
    clearables.push(renderCircle(svg, leaf, "red", 1))
    clearables.push(renderLineBetweenBodies(svg, leaf, node, "red", 0.5))
  }
  for (const fork of forksToRender) {
    clearables.push(renderRectangle(svg, fork, "red", 1))
    clearables.push(renderCircle(svg, fork, "red", 1))
    clearables.push(renderLineBetweenBodies(svg, fork, node, "red", 0.5))
  }
}
