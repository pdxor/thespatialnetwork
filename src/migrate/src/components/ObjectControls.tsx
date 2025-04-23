import React from 'react'
import { Cartesian3, HeadingPitchRoll } from 'cesium'
import { Object3D } from '../types'

interface ObjectControlsProps {
  object: Object3D
  onUpdateObject: (updatedObject: Object3D) => void
}

const ObjectControls: React.FC<ObjectControlsProps> = ({ object, onUpdateObject }) => {
  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = Cartesian3.clone(object.position)
    newPosition[axis] = value
    onUpdateObject({ ...object, position: newPosition })
  }

  const handleScaleChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newScale = Cartesian3.clone(object.scale)
    newScale[axis] = value
    onUpdateObject({ ...object, scale: newScale })
  }

  const handleRotationChange = (axis: 'heading' | 'pitch' | 'roll', value: number) => {
    const newRotation = HeadingPitchRoll.clone(object.rotation)
    newRotation[axis] = value
    onUpdateObject({ ...object, rotation: newRotation })
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Object Controls</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium">Position</h4>
          <div className="flex space-x-2">
            {['x', 'y', 'z'].map((axis) => (
              <input
                key={`position-${axis}`}
                type="number"
                value={object.position[axis as 'x' | 'y' | 'z']}
                onChange={(e) => handlePositionChange(axis as 'x' | 'y' | 'z', parseFloat(e.target.value))}
                className="w-full p-1 border rounded"
                placeholder={axis.toUpperCase()}
              />
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium">Scale</h4>
          <div className="flex space-x-2">
            {['x', 'y', 'z'].map((axis) => (
              <input
                key={`scale-${axis}`}
                type="number"
                value={object.scale[axis as 'x' | 'y' | 'z']}
                onChange={(e) => handleScaleChange(axis as 'x' | 'y' | 'z', parseFloat(e.target.value))}
                className="w-full p-1 border rounded"
                placeholder={axis.toUpperCase()}
                step="0.1"
                min="0.1"
              />
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium">Rotation</h4>
          <div className="flex space-x-2">
            {['heading', 'pitch', 'roll'].map((axis) => (
              <input
                key={`rotation-${axis}`}
                type="number"
                value={object.rotation[axis as 'heading' | 'pitch' | 'roll']}
                onChange={(e) => handleRotationChange(axis as 'heading' | 'pitch' | 'roll', parseFloat(e.target.value))}
                className="w-full p-1 border rounded"
                placeholder={axis.charAt(0).toUpperCase() + axis.slice(1)}
                step="0.1"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ObjectControls