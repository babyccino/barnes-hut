import { Body } from "./interface"
import { GEE } from "./simulation"
import { rand } from "./util"

export const MAX_GALAXY_SIZE = 500
function init2Galaxies(totalBodies: number): Body[] {
  const bodies: Body[] = []
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
    bodies.push({
      mass: blackHoleM,
      massX: galaxyX,
      massY: galaxyY,
      xSpeed: galaxySpeedX,
      ySpeed: galaxySpeedY,
    })

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

      bodies.push({
        mass: starMass,
        massX: starX,
        massY: starY,
        xSpeed: starSpeedX,
        ySpeed: starSpeedY,
      })
    }
  }

  galaxy((totalBodies / 8) * 7, 350.0, 400, 400, 10, 12)
  galaxy(totalBodies / 8, 300, 2200, 1600, -10, -12)

  return bodies
}
export const GALAXY = init2Galaxies(MAX_GALAXY_SIZE)
