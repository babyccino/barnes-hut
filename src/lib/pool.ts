import { Empty, Fork, Leaf } from "./simulation"

type ClassConstructor<K = any, T extends any[] = any[]> = {
  new (...args: T): K
}
export abstract class Poolable<T extends any[]> {
  abstract set(...args: T): void
  abstract free(): void
}
type Pool<T = any> = { length: number; objs: T[] }
const pools = new Map<string, Pool>()
export const clearPools = () => pools.clear()

export function getPool<
  Instance,
  Args extends any[],
  Ctor extends ClassConstructor<Instance, Args>
>(classContructor: Ctor): { length: number; objs: Instance[] } {
  const pool = pools.get(classContructor.name)
  if (pool) return pool
  const newPool: Pool<Instance> = { length: 0, objs: [] }
  pools.set(classContructor.name, newPool)
  return newPool
}

export function getPoolLength<T extends ClassConstructor>(classContructor: T): number | null {
  const pool = pools.get(classContructor.name)
  if (pool === undefined) return null
  return pool.length
}
let emptyMisses = 0
let emptyHits = 0
let emptyFrees = 0
let emptyRequests = 0
export const resetLog = () => (emptyHits = emptyMisses = emptyFrees = emptyRequests = 0)
export function logPools() {
  console.log({
    empty: getPoolLength(Empty),
    leaf: getPoolLength(Leaf),
    fork: getPoolLength(Fork),
    emptyMisses,
    emptyHits,
    emptyFrees,
    emptyRequests,
  })
}

export function acquire<
  Args extends any[],
  Instance extends Poolable<Args>,
  Ctor extends ClassConstructor<Instance, Args>
>(ctor: Ctor, ...args: Args): Instance {
  const pool = getPool<Instance, Args, Ctor>(ctor)
  if (ctor.name === "Leaf") ++emptyRequests
  const popped = pool.objs.pop()
  if (popped) {
    if (ctor.name === "Leaf") ++emptyHits
    pool.length -= 1
    popped.set(...args)
    return popped
  }
  if (ctor.name === "Leaf") ++emptyMisses
  return new ctor(...args)
}

export function free<Instance>(
  classContructor: ClassConstructor<Instance>,
  member: Instance
): void {
  const pool = pools.get(classContructor.name)
  if (!pool)
    throw new Error(
      `You tried to free an obj with name ${classContructor.name} to a nonexistent pool`
    )
  pool.objs.push(member)
  pool.length += 1
  if (classContructor.name === "Leaf") ++emptyFrees
}
