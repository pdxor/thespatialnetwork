import { Cartesian3, HeadingPitchRoll } from 'cesium'

export interface Object3D {
  id: string
  url: string
  position: Cartesian3
  scale: Cartesian3
  rotation: HeadingPitchRoll
}