import axios from 'axios'
import { Object3D } from '../types'

const WORDPRESS_API_URL = 'https://thespatialnetwork.com/wp-json/wp/v2'
// Remove spaces from token as they cause issues with authentication
const WORDPRESS_API_TOKEN = 'h3JWKTewd4McGONUEqp5BX8B'

export async function saveObjectToWordPress(object: Object3D) {
  try {
    const response = await axios.post(
      `${WORDPRESS_API_URL}/cesium_objects`,
      {
        title: object.url.split('/').pop(),
        content: JSON.stringify(object),
        status: 'publish',
      },
      {
        headers: {
          Authorization: `Basic ${btoa(`opensesame:${WORDPRESS_API_TOKEN}`)}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data
  } catch (error) {
    console.error('Error saving object to WordPress:', error)
    throw error
  }
}

export interface LandTile {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  acf: {
    latitude: string
    longitude: string
    ajaxfile?: string
    embed_code?: string
  }
}

export async function fetchLandTiles(daddyMapIds: string[]): Promise<LandTile[]> {
  try {
    const response = await axios.get(`${WORDPRESS_API_URL}/land_tile`, {
      params: {
        acf_daddymap: daddyMapIds.join(','),
      },
    })
    return response.data
  } catch (error) {
    console.error('Error fetching land tiles:', error)
    throw error
  }
}