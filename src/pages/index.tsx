import { ChangeEventHandler, useState, ReactNode, HTMLProps } from "react"
import Head from "next/head"

import Simulation from "../components/simulation"
import { MAX_GALAXY_SIZE } from "../lib/galaxy"
import AddingPoints from "../components/addingPoints/addingPoints"

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

enum AddingPointsState {
  UnMounted,
  Mounting,
  Mounted,
  UnMounting,
}

export default function Home(): JSX.Element {
  const [simRunning, setSimRunning] = useState(true)
  const [theta, setTheta] = useState(0.5)
  const [renderCalculatedQuads, setRenderCalculatedQuads] = useState(false)
  const [renderUncalcuatedQuads, setRenderUncalcuatedQuads] = useState(false)
  const [nodeCount, setNodeCount] = useState(MAX_GALAXY_SIZE)
  const [showAddingPoints, setShowAddingPoints] = useState<AddingPointsState>(
    AddingPointsState.UnMounted
  )
  const onNodeCount: ChangeEventHandler<HTMLInputElement> = (e) => {
    setNodeCount(e.target.valueAsNumber)
    setSimRunning(false)
    setRenderCalculatedQuads(false)
    setRenderUncalcuatedQuads(true)
  }
  const onTheta: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSimRunning(true)
    setRenderCalculatedQuads(true)
    setRenderUncalcuatedQuads(true)
    setTheta(e.target.valueAsNumber)
  }
  const turnOffGraphics = (): void => {
    setRenderCalculatedQuads(false)
    setRenderUncalcuatedQuads(false)
  }
  const toggleAddingPoints = (): void => {
    if (showAddingPoints === AddingPointsState.Mounted) {
      setShowAddingPoints(AddingPointsState.UnMounting)
      setTimeout(() => {
        setShowAddingPoints(AddingPointsState.UnMounted)
        setSimRunning(true)
      }, 1000)
    }
    if (showAddingPoints === AddingPointsState.UnMounted) {
      setShowAddingPoints(AddingPointsState.Mounting)
      setTimeout(() => {
        setShowAddingPoints(AddingPointsState.Mounted)
        setSimRunning(false)
      }, 1000)
    }
  }
  const startStop = (): void => {
    turnOffGraphics()
    setSimRunning((state) => !state)
  }

  return (
    <main className="flex justify-end sm:w-1/2 py-6 px-6">
      {showAddingPoints !== AddingPointsState.Mounted ? (
        <Simulation
          className={`fixed sm:left-1/2 sm:top-1/2 sm:-translate-y-1/2 w-full h-full sm:max-w-[50%] max-h-full ${
            showAddingPoints === AddingPointsState.Mounting ? "fadeOut" : "fadeIn"
          }`}
          nodeCount={nodeCount}
          running={simRunning}
          renderCalculatedQuads={renderCalculatedQuads}
          renderUncalcuatedQuads={renderUncalcuatedQuads}
          theta={theta}
        />
      ) : null}
      {showAddingPoints !== AddingPointsState.UnMounted ? (
        <AddingPoints
          style={{ animationDelay: "300ms" }}
          className={`fixed sm:left-1/2 sm:top-1/2 sm:-translate-y-1/2 w-full h-full sm:max-w-[50%] 
            max-h-full ${showAddingPoints === AddingPointsState.UnMounting ? "fadeOut" : "fadeIn"}`}
          stop={showAddingPoints === AddingPointsState.UnMounting}
          // nodeCount={nodeCount}
        />
      ) : null}

      <div className="relative right-0 w-full max-w-xl space-y-4">
        <h1 className="text-3xl font-bold py-2 pb-4">The Barnes-Hut Simulation</h1>
        <p>
          The Barnes-Hut simulation is an algorithm for estimating the forces in an n-body system.
          While the brute force method is a quintessential example of an&nbsp;
          <Math>
            O(n<sup>2</sup>)
          </Math>
          &nbsp;algorithm, the Barnes-Hut simulation, using a quadtree (or octree for a 3d
          simulation), can estimate an n-body system with low error at&nbsp;
          <Math>O(n*log(n))</Math>.
        </p>
        <div className="flex flex-row pt-2 pb-[calc(100vh-1rem)] sm:pb-2 gap-4 w-[90%] m-auto">
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
          />
          <div className="align-middle">{nodeCount}</div>
        </div>
        <p>
          The main idea in the estimation is that a group of far away bodies can be approximated
          using a combined body with the total mass and centre of mass of the system. In the
          Barnes-Hut simulation this is achieved using a quadtree. Each node of the quadtree can be
          either: an empty node; a leaf containing one body; or a fork. The fork itself has four
          nodes corresponding to equally sized quadrants which are themselves a node of some kind.
          Each fork keeps track of its total mass and centre of mass so if a body is sufficiently
          distant, forces can be estimated using these values instead of calculating the force for
          every node
        </p>
        <Button onClick={toggleAddingPoints}>Show thingy</Button>
        <p>
          The threshold used to determine whether a force calculation will use the combined centre
          of mass or recursively calculate for the nodes within a fork is simply the ratio between
          distance to and size of the fork. If this greater than a chosen value theta then the
          estimation be used and vice versa. Decreasing theta will give a more accurate simulation
          at the cost of speed and vice versa. A theta value of zero will just give the brute force
          algorithm
        </p>
        <div className="flex flex-row gap-4 py-2 w-[90%] m-auto">
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
        <div className="w-full flex justify-center gap-6">
          <Button onClick={startStop}>Start/stop</Button>
          <Button onClick={turnOffGraphics}>Turn off graphics</Button>
        </div>
      </div>
    </main>
  )
}
