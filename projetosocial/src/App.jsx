import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import './App.css'
import AppFooter from './components/AppFooter'
import Login from './pages/Login'
import Register from './pages/Register'
import Participantes from './pages/Participantes'
import { getToken } from './lib/api'

function HomeRedirect() {
  return getToken() ? (
    <Navigate to="/participantes" replace />
  ) : (
    <Navigate to="/login" replace />
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/participantes" element={<Participantes />} />
        <Route path="*" element={<Navigate to="/participantes" replace />} />
      </Routes>
      <AppFooter />
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        className="!z-[99999]"
        toastClassName="!bg-slate-900/95 !border !border-white/10 !text-slate-100 !rounded-xl !shadow-xl"
        bodyClassName="!font-sans !text-sm"
      />
    </BrowserRouter>
  )
}

export default App
