import { ChangeEventHandler, useState, ReactNode, HTMLProps } from "react"

import { scroller } from "react-scroll"
import { useMediaQuery } from "usehooks-ts"

import Simulation from "../components/simulation"
import { MAX_GALAXY_SIZE } from "../lib/galaxy"
import QuadtreeAnimation from "../components/quadtreeAnimation/"

const Button = ({ onClick, children }: HTMLProps<HTMLButtonElement>) => (
  <button
    className="whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md
											shadow-sm text-base font-medium text-white bg-sky-700 hover:bg-sky-800"
    onClick={onClick}
  >
    {children}
  </button>
)

const Math = ({ children }: { children: ReactNode }) => (
  <span className="italic font-serif">{children}</span>
)

enum ComponentState {
  UnMounted,
  Mounting,
  Mounted,
  UnMounting,
}

export default function Home(): JSX.Element {
  const mobile = useMediaQuery("(min-width: 640px)")
  const [simRunning, setSimRunning] = useState(true)
  const [theta, setTheta] = useState(0.5)
  const [renderCalculatedQuads, setRenderCalculatedQuads] = useState(false)
  const [renderUncalcuatedQuads, setRenderUncalcuatedQuads] = useState(false)
  const [nodeCount, setNodeCount] = useState(MAX_GALAXY_SIZE)
  const [quadtreeState, setQuadtreeState] = useState(ComponentState.UnMounted)

  const onNodeCount: ChangeEventHandler<HTMLInputElement> = e => {
    setNodeCount(e.target.valueAsNumber)
    setSimRunning(false)
    setRenderCalculatedQuads(false)
    setRenderUncalcuatedQuads(true)
  }
  const onTheta: ChangeEventHandler<HTMLInputElement> = e => {
    setRenderCalculatedQuads(true)
    setRenderUncalcuatedQuads(true)
    setTheta(e.target.valueAsNumber)
    !mobile &&
      scroller.scrollTo("theta", {
        smooth: true,
      })

    if (quadtreeState === ComponentState.Mounted) {
      setQuadtreeState(ComponentState.UnMounting)
      setTimeout(() => {
        setQuadtreeState(ComponentState.UnMounted)
        setSimRunning(true)
      }, 1000)
    } else setSimRunning(true)
  }
  const turnOffGraphics = (): void => {
    setRenderCalculatedQuads(false)
    setRenderUncalcuatedQuads(false)
  }
  const toggleQuadtreeAnimation = (): void => {
    if (quadtreeState === ComponentState.Mounted) {
      setQuadtreeState(ComponentState.UnMounting)
      setTimeout(() => {
        setQuadtreeState(ComponentState.UnMounted)
        setSimRunning(true)
      }, 1000)
    }
    if (quadtreeState === ComponentState.UnMounted) {
      setQuadtreeState(ComponentState.Mounting)
      setTimeout(() => {
        setQuadtreeState(ComponentState.Mounted)
        setSimRunning(false)
      }, 1000)
      !mobile &&
        scroller.scrollTo("quadtreeAnimation", {
          smooth: true,
        })
    }
  }
  const startStop = () => setSimRunning(state => !state)

  return (
    <main className="flex justify-end sm:w-1/2">
      {quadtreeState !== ComponentState.Mounted ? (
        <Simulation
          className={`fixed w-full bottom-1/2 translate-y-1/2 sm:left-1/2 sm:max-w-[50%]
            max-h-full ${quadtreeState === ComponentState.Mounting ? "fadeOut" : "fadeIn"}`}
          nodeCount={nodeCount}
          running={simRunning}
          renderCalculatedQuads={renderCalculatedQuads}
          renderUncalcuatedQuads={renderUncalcuatedQuads}
          theta={theta}
        />
      ) : null}
      {quadtreeState !== ComponentState.UnMounted ? (
        <QuadtreeAnimation
          style={{ animationDelay: "300ms" }}
          className={`fixed w-full bottom-1/2 translate-y-1/2 sm:left-1/2 sm:max-w-[50%]
            max-h-full ${quadtreeState === ComponentState.UnMounting ? "fadeOut" : "fadeIn"}`}
          stop={quadtreeState === ComponentState.UnMounting}
        />
      ) : null}

      <div className="relative right-0 w-full max-w-xl py-6 space-y-6-padding [&>*]:px-4">
        <h1 className="backdrop-blur-sm sm:backdrop-blur-none text-3xl font-bold py-2 pb-4">
          The Barnes-Hut Simulation
        </h1>
        <p className="backdrop-blur-sm sm:backdrop-blur-none">
          The Barnes-Hut simulation is an algorithm for estimating the forces in an n-body system.
          While the brute force method is a quintessential example of an&nbsp;
          <Math>
            O(n<sup>2</sup>)
          </Math>
          &nbsp;algorithm, the Barnes-Hut simulation, using a quadtree (or octree for a 3d
          simulation), can estimate an n-body system with low error at&nbsp;
          <Math>O(n*log(n))</Math>.
        </p>
        <div className="backdrop-blur-sm sm:backdrop-blur-none flex flex-row pt-2 gap-4 m-auto">
          <label htmlFor="nodeCount">Number of bodies</label>
          <input
            className="grow"
            type="range"
            name="nodeCount"
            min="1"
            max={MAX_GALAXY_SIZE}
            defaultValue={MAX_GALAXY_SIZE}
            step={1}
            onChange={onNodeCount}
            disabled={quadtreeState !== ComponentState.UnMounted}
          />
          <div className="align-middle">{nodeCount}</div>
        </div>
        <p className="backdrop-blur-sm sm:backdrop-blur-none">
          The main idea in the estimation is that a group of far away bodies can be approximated
          using a combined body with the total mass and centre of mass of the system. In the
          Barnes-Hut simulation this is achieved using a quadtree. Each node of the quadtree can be
          either: an empty node; a leaf containing one body; or a fork. The fork itself has four
          nodes corresponding to equally sized quadrants which are themselves a node of some kind.
          Each fork keeps track of its total mass and centre of mass so if a body is sufficiently
          distant, forces can be estimated using these values instead of calculating the force for
          every node
        </p>
        <div
          className="backdrop-blur-sm sm:backdrop-blur-none w-full flex justify-center gap-6 pb-2 mb-[calc(100vh-1rem)]
            sm:mb-0"
          id="quadtreeAnimation"
        >
          <Button onClick={toggleQuadtreeAnimation}>Show how the quadtree is constructed</Button>
        </div>
        <p className="backdrop-blur-sm sm:backdrop-blur-none">
          The threshold used to determine whether a force calculation will use the combined centre
          of mass or recursively calculate for the nodes within a fork is simply the ratio between
          distance to and size of the fork. If this greater than a chosen value theta then the
          estimation be used and vice versa. Decreasing theta will give a more accurate simulation
          at the cost of speed and vice versa. A theta value of zero will just give the brute force
          algorithm
        </p>
        <div
          className="backdrop-blur-sm sm:backdrop-blur-none flex flex-row gap-4 w-[90%] m-auto pb-2 mb-[calc(100vh-1rem)]
            sm:mb-0"
          id="theta"
        >
          <label htmlFor="theta">Theta</label>
          <input
            className="grow"
            type="range"
            name="theta"
            min="0"
            max="2"
            defaultValue={0.5}
            step={0.1}
            onChange={onTheta}
          />
          <div>{theta}</div>
        </div>
        <div className="backdrop-blur-sm sm:backdrop-blur-none w-full flex justify-center gap-6">
          <Button onClick={startStop}>Start/stop</Button>
          <Button onClick={turnOffGraphics}>Turn off graphics</Button>
        </div>
      </div>
    </main>
  )
}
