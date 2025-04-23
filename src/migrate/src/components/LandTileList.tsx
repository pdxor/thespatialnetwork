import React from 'react'
import { LandTile } from '../api/wordpress'

interface LandTileListProps {
  landTiles: LandTile[]
  onSelectLandTile: (landTile: LandTile) => void
}

const LandTileList: React.FC<LandTileListProps> = ({ landTiles, onSelectLandTile }) => {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-2">Land Tiles</h2>
      <ul className="space-y-2">
        {landTiles.map((tile) => (
          <li
            key={tile.id}
            className="cursor-pointer hover:bg-gray-200 p-2 rounded"
            onClick={() => onSelectLandTile(tile)}
          >
            {tile.title.rendered}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LandTileList