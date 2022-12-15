import { CSSProperties, SVGProps, useEffect, useRef, useState } from "react"
import styles from "./addingPoints.module.scss"

import { GALAXY } from "../../lib/galaxy"
import { Boundaries, BoundariesInterface, CentreOfMass } from "../../lib/interface"
import { newLines } from "../../lib/render"
import { createQuadAndInsertBodies, Empty, getBoundaries, Quad } from "../../lib/simulation"

const X_MAX = 2500
const Y_MAX = 2500

const padding = 15
const boundaries = new Boundaries(padding, padding, X_MAX - padding, Y_MAX - padding)

const circleAnimationDuration = 0.7
const delayBetweenCircleAndLines = 0.3
const lineAnimationDuration = 1
const delayBeforeNextLoop = 0.5

export default function AddingPoints({
  stop,
  ...props
}: { stop?: boolean } & SVGProps<SVGSVGElement>): JSX.Element {
  const [bodies, setBodies] = useState<CentreOfMass[]>([])
  const [quads, setQuads] = useState<(BoundariesInterface & { delay: number })[]>([])
  const lastQuadRef = useRef<Quad>(new Empty(0, 0, 0))
  const timeoutRef = useRef<NodeJS.Timeout>()

  // animation loop
  useEffect(() => {
    // render first box
    const renderLoop = (i: number) => {
      if (i === GALAXY.length) return

      const bodies = GALAXY.slice(0, i + 1)
      const body = GALAXY[i]

      const newQuad = createQuadAndInsertBodies(
        boundaries.centerX,
        boundaries.centerY,
        boundaries.size,
        bodies
      )

      const addedQuads = newLines(body, newQuad, lastQuadRef.current).map<
        BoundariesInterface & { delay: number }
      >((q, index) => ({
        ...q,
        delay: circleAnimationDuration + delayBetweenCircleAndLines + index * lineAnimationDuration,
      }))

      setBodies(prev => [...prev, body])
      setQuads(prev => [...prev, ...addedQuads])

      console.log({ addedQuads, i, newQuad, lastQuad: lastQuadRef.current })

      lastQuadRef.current = newQuad
      const totalLoopTime =
        circleAnimationDuration +
        delayBetweenCircleAndLines +
        addedQuads.length * lineAnimationDuration +
        delayBeforeNextLoop
      timeoutRef.current = setTimeout(() => renderLoop(i + 1), totalLoopTime * 1000)
    }

    !stop && renderLoop(0)

    return () => clearTimeout(timeoutRef.current)
  }, [stop])

  return (
    <svg {...props} viewBox={`0 0 ${X_MAX} ${Y_MAX}`}>
      <rect
        className={styles.rect}
        x={boundaries.centerX - boundaries.size / 2}
        y={boundaries.centerY - boundaries.size / 2}
        height={boundaries.size}
        width={boundaries.size}
        stroke="grey"
      />
      <g>
        {quads.map(({ centerX, centerY, size, delay }, index) => {
          const halfSize = size / 2
          const minX = centerX - halfSize
          const maxX = centerX + halfSize
          const minY = centerY - halfSize
          const maxY = centerY + halfSize

          return (
            <g key={`${centerX}:${centerY}`}>
              <line
                style={{
                  animationDelay: delay + "s",
                }}
                className={styles.rect}
                x1={minX}
                x2={maxX}
                y1={centerY}
                y2={centerY}
                stroke={index === quads.length - 1 ? "red" : "grey"}
                opacity={0}
              />
              <line
                style={{ animationDelay: delay + "s" }}
                className={styles.rect}
                x1={centerX}
                x2={centerX}
                y1={minY}
                y2={maxY}
                stroke={index === quads.length - 1 ? "red" : "grey"}
                opacity={0}
              />
            </g>
          )
        })}
      </g>
      <g>
        {bodies.map(({ massX: x, massY: y, mass }, index) => (
          <circle
            style={{ scale: index < bodies.length - 1 || stop ? "1" : "4" }}
            className={styles.circle + " fadeIn"}
            r={Math.min(mass * 2, 8)}
            key={`${x}:${y}`}
            cx={x}
            cy={y}
            fill={index < bodies.length - 1 || stop ? "grey" : "red"}
            opacity={0}
          />
        ))}
      </g>
    </svg>
  )
}
