import React, { useState, useCallback, useEffect } from 'react'
import { Viewer, Entity, CameraFlyTo } from 'resium'
import { Cartesian3, Color, HeadingPitchRoll, Matrix4 } from 'cesium'
import { Save, Rotate3d, ArrowUpDown, Maximize2 } from 'lucide-react'
import ObjectList from './components/ObjectList'
import ObjectControls from './components/ObjectControls'
import LandTileList from './components/LandTileList'
import { Object3D } from './types'
import { saveObjectToWordPress, fetchLandTiles, LandTile } from './api/wordpress'

function App() {
  const [objects, setObjects] = useState<Object3D[]>([])
  const [selectedObject, setSelectedObject] = useState<Object3D | null>(null)
  const [landTiles, setLandTiles] = useState<LandTile[]>([])
  const [selectedLandTile, setSelectedLandTile] = useState<LandTile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadLandTiles = async () => {
      try {
        const tiles = await fetchLandTiles(['18970', '21181'])
        setLandTiles(Array.isArray(tiles) ? tiles : [])
      } catch (error) {
        console.error('Error loading land tiles:', error)
        setError('Failed to load land tiles. Please try again later.')
      }
    }
    loadLandTiles()
  }, [])

  const handleAddObject = useCallback((url: string) => {
    const newObject: Object3D = {
      id: Date.now().toString(),
      url,
      position: Cartesian3.fromDegrees(-75.59777, 40.03883, 1000),
      scale: new Cartesian3(1, 1, 1),
      rotation: new HeadingPitchRoll(0, 0, 0),
    }
    setObjects((prevObjects) => [...prevObjects, newObject])
  }, [])

  const handleUpdateObject = useCallback((updatedObject: Object3D) => {
    setObjects((prevObjects) =>
      prevObjects.map((obj) => (obj.id === updatedObject.id ? updatedObject : obj))
    )
  }, [])

  const handleSaveObject = useCallback(async () => {
    if (selectedObject) {
      try {
        await saveObjectToWordPress(selectedObject)
        alert('Object saved successfully!')
      } catch (error) {
        console.error('Error saving object:', error)
        setError('Failed to save object. Please try again.')
      }
    }
  }, [selectedObject])

  const getModelMatrix = useCallback((object: Object3D) => {
    const translationMatrix = Matrix4.fromTranslation(object.position)
    const rotationMatrix = Matrix4.fromHeadingPitchRoll(object.rotation)
    const scaleMatrix = Matrix4.fromScale(object.scale)
    
    const modelMatrix = Matrix4.multiply(translationMatrix, rotationMatrix, new Matrix4())
    return Matrix4.multiply(modelMatrix, scaleMatrix, modelMatrix)
  }, [])

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  return (
    <div className="h-screen flex">
      <div className="w-1/4 bg-gray-100 p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Cesium CMS</h1>
        <ObjectList objects={objects} onSelectObject={setSelectedObject} onAddObject={handleAddObject} />
        {selectedObject && (
          <ObjectControls object={selectedObject} onUpdateObject={handleUpdateObject} />
        )}
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded flex items-center"
          onClick={handleSaveObject}
          disabled={!selectedObject}
        >
          <Save className="mr-2" size={18} />
          Save to WordPress
        </button>
        <LandTileList landTiles={landTiles} onSelectLandTile={setSelectedLandTile} />
      </div>
      <div className="w-3/4 relative">
        <Viewer full>
          {objects.map((object) => (
            <Entity
              key={object.id}
              position={object.position}
              model={{
                uri: object.url,
                scale: 1, // Set to 1 as we're using modelMatrix for scaling
                modelMatrix: getModelMatrix(object),
              }}
              onClick={() => setSelectedObject(object)}
            />
          ))}
          {landTiles.map((tile) => (
            <Entity
              key={tile.id}
              position={Cartesian3.fromDegrees(parseFloat(tile.acf.longitude), parseFloat(tile.acf.latitude), 0)}
              point={{ pixelSize: 10, color: Color.RED }}
              label={{ text: tile.title.rendered, pixelOffset: new Cartesian3(0, -20, 0) }}
              onClick={() => setSelectedLandTile(tile)}
            />
          ))}
          {selectedObject && (
            <CameraFlyTo destination={selectedObject.position} duration={1} />
          )}
          {selectedLandTile && (
            <CameraFlyTo
              destination={Cartesian3.fromDegrees(
                parseFloat(selectedLandTile.acf.longitude),
                parseFloat(selectedLandTile.acf.latitude),
                1000
              )}
              duration={1}
            />
          )}
        </Viewer>
        <div className="absolute top-4 right-4 flex space-x-2">
          <button className="bg-white p-2 rounded shadow" title="Rotate">
            <Rotate3d size={24} />
          </button>
          <button className="bg-white p-2 rounded shadow" title="Adjust Height">
            <ArrowUpDown size={24} />
          </button>
          <button className="bg-white p-2 rounded shadow" title="Resize">
            <Maximize2 size={24} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default App