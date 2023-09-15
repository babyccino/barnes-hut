type ClassConstructor<K = any, T extends any[] = any[]> = {
  new (...args: T): K
}
export abstract class Poolable<T extends any[]> {
  abstract set(...args: T): void
  abstract free(): void
}
type Pool<T = any> = {
  length: number
  objs: T[]
  attempts: number
  hits: number
  frees: number
  misses: number
}
const pools = new Map<string, Pool>()
export const clearPools = () => pools.clear()

export function getPool<
  Instance,
  Args extends any[],
  Ctor extends ClassConstructor<Instance, Args>
>(classContructor: Ctor): Pool<Instance> {
  const pool = pools.get(classContructor.name)
  if (pool) return pool
  const newPool: Pool<Instance> = { length: 0, objs: [], attempts: 0, hits: 0, frees: 0, misses: 0 }
  pools.set(classContructor.name, newPool)
  return newPool
}

export function getPoolLength<T extends ClassConstructor>(classContructor: T): number | null {
  const pool = pools.get(classContructor.name)
  if (pool === undefined) return null
  return pool.length
}

export const resetLog = () =>
  pools.forEach(pool => (pool.attempts = pool.frees = pool.hits = pool.misses = 0))
export function logPools() {
  let str = ""
  pools.forEach((pool, key) => {
    str += `{
      name: ${key},
      attempts: ${pool.attempts},
      hits: ${pool.hits},
      frees: ${pool.frees},
      misses: ${pool.misses},
    }\n`
  })
  console.log(str)
}

export function acquire<
  Instance extends Poolable<Args>,
  Args extends any[],
  Ctor extends ClassConstructor<Instance, Args>
>(ctor: Ctor, ...args: Args): Instance {
  const pool = getPool<Instance, Args, Ctor>(ctor)
  ++pool.attempts
  const popped = pool.objs.pop()
  if (popped) {
    ++pool.hits
    pool.length -= 1
    popped.set(...args)
    return popped
  }
  ++pool.misses
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
  ++pool.frees
}
