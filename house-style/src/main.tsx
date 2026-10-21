import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StoreProvider } from './lib/store'
import { AuthProvider } from './lib/auth-context'
import './index.css'
createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><StoreProvider><App /></StoreProvider></AuthProvider></React.StrictMode>)
