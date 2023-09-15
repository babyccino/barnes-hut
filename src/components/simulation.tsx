import { SVGProps, useEffect, useRef } from "react"

import { GALAXY } from "../lib/galaxy"
import { Poolable } from "../lib/pool"
import { SvgNode, animatePoints, animateQuadTree, createNode, renderCircle } from "../lib/render"
import { createQuadAndInsertBodies, getBoundaries } from "../lib/simulation"

const IS_DEV = process.env.NODE_ENV === "development"

let TIME = 0
let FRAME_COUNTER = 0
let FRAME_SKIP = 15

const X_MAX = 2500
const Y_MAX = 2500

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
  const pooledObjsRef = useRef<Poolable<any>[]>([])
  const frame = useRef<number>(-1)
  const fpsRef = useRef<HTMLParagraphElement>(null)

  // rerender quadtree if animation stops
  useEffect(() => {
    if (running || !renderCalculatedQuads) return

    if (!svgRef.current) return
    const svg = svgRef.current
    const nodes = nodesRef.current
    if (!nodes.length) return
    const pooledObjs = pooledObjsRef.current

    const boundaries = getBoundaries(nodes)
    const quad = createQuadAndInsertBodies(
      boundaries.centerX,
      boundaries.centerY,
      boundaries.size,
      nodes
    )
    const focusNode = nodes[0]

    clearImpermanentElements(pooledObjs)
    animateQuadTree(svg, pooledObjs, quad, focusNode, theta)
    pooledObjs.push(renderCircle(svg, focusNode, focusNode.color, 1, 5))
    quad.free()
  }, [running, renderCalculatedQuads])

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

    if (!running || !svgRef.current) return

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
      const pooledObjs = pooledObjsRef.current

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
      if (renderCalculatedQuads) {
        clearImpermanentElements(pooledObjs)
        animateQuadTree(svg, pooledObjs, quad, focusNode, theta)

        // Render again the node which the quadtree animation is focusing on, so it
        // appears on top
        pooledObjs.push(renderCircle(svg, focusNode, focusNode.color, 1, 5))
      }

      quad.free()
      frame.current = window.requestAnimationFrame(renderLoop)
    }
    frame.current = window.requestAnimationFrame(renderLoop)
  }, [running, renderUncalcuatedQuads, renderCalculatedQuads, theta])

  useEffect(() => {
    if (svgRef.current && !renderCalculatedQuads) clearImpermanentElements(pooledObjsRef.current)
  }, [renderCalculatedQuads])

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
    svg && (svg.innerHTML = "")
    clearImpermanentElements(pooledObjsRef.current)

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

function clearImpermanentElements(pooledObjs: Poolable<any>[]): void {
  if (pooledObjs.length) {
    pooledObjs.forEach(el => el.free())
    pooledObjs.splice(0, pooledObjs.length)
  }
}
