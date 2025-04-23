import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Ion } from 'cesium'
import App from './App.tsx'
import './index.css'

// Initialize Cesium with your access token
// Get your token from: https://cesium.com/ion/tokens
Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlOWE0OTdlNS1mMzFlLTQwOWQtOGZhOC04NzNjYmJjMzA0NDAiLCJpZCI6MTY2OTM3LCJpYXQiOjE2OTQ5Njg1NTR9.SAt_q9E4JGiAWfnYUKHNgjLlfFqyEnel8GQIEuPPJfk';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)