import { Body } from "./interface"
import { GEE } from "./simulation"
import { interweaveArrays, rand } from "./util"

export const MAX_GALAXY_SIZE = 1000
function init2Galaxies(totalBodies: number, offsetX: number, offsetY: number): Body[] {
  function galaxy(
    num: number,
    maxRadius: number,
    galaxyX: number,
    galaxyY: number,
    galaxySpeedX: number,
    galaxySpeedY: number
  ): Body[] {
    const bodies: Body[] = Array(num)
    const totalM = 1.5 * num
    const blackHoleM = 1.0 * num

    // black hole
    bodies[0] = {
      mass: blackHoleM,
      massX: galaxyX,
      massY: galaxyY,
      xSpeed: galaxySpeedX,
      ySpeed: galaxySpeedY,
    }

    // stars
    for (let i = 1; i < num; ++i) {
      const angle = rand(0, 2 * Math.PI)
      const radius = 25 + rand(0, maxRadius)
      const starX = galaxyX + radius * Math.sin(angle)
      const starY = galaxyY + radius * Math.cos(angle)
      const speed = Math.sqrt(
        (GEE * blackHoleM) / radius + (GEE * totalM * radius * radius) / Math.pow(maxRadius, 3)
      )
      const starSpeedY = galaxySpeedY + speed * Math.cos(angle + Math.PI / 2)
      const starSpeedX = galaxySpeedX + speed * Math.sin(angle + Math.PI / 2)
      const starMass = 1.0 + rand(0, 1)

      bodies[i] = {
        mass: starMass,
        massX: starX,
        massY: starY,
        xSpeed: starSpeedX,
        ySpeed: starSpeedY,
      }
    }
    return bodies
  }

  const larger = galaxy((totalBodies / 5) * 4, 350.0, 400 + offsetX, 400 + offsetY, 10, 12)
  const smaller = galaxy(totalBodies / 5, 300, 2200 + offsetX, 1600 + offsetY, -10, -12)
  return interweaveArrays(larger, smaller)
}
export const simGalaxy = init2Galaxies(MAX_GALAXY_SIZE, 1250, 1250)
export const quadtreeAnimationGalaxy = init2Galaxies(MAX_GALAXY_SIZE, 0, 0)
