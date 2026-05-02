import { Routes, Route, Navigate } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  )
}

export default App
