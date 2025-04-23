import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Object3D } from '../types'

interface ObjectListProps {
  objects: Object3D[]
  onSelectObject: (object: Object3D) => void
  onAddObject: (url: string) => void
}

const ObjectList: React.FC<ObjectListProps> = ({ objects, onSelectObject, onAddObject }) => {
  const [newObjectUrl, setNewObjectUrl] = useState('')

  const handleAddObject = () => {
    if (newObjectUrl) {
      onAddObject(newObjectUrl)
      setNewObjectUrl('')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">3D Objects</h2>
      <ul className="space-y-2">
        {objects.map((object) => (
          <li
            key={object.id}
            className="cursor-pointer hover:bg-gray-200 p-2 rounded"
            onClick={() => onSelectObject(object)}
          >
            {object.url.split('/').pop()}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <input
          type="text"
          value={newObjectUrl}
          onChange={(e) => setNewObjectUrl(e.target.value)}
          placeholder="Enter GLB file URL"
          className="w-full p-2 border rounded"
        />
        <button
          onClick={handleAddObject}
          className="mt-2 bg-green-500 text-white px-4 py-2 rounded flex items-center"
        >
          <Plus className="mr-2" size={18} />
          Add Object
        </button>
      </div>
    </div>
  )
}

export default ObjectList