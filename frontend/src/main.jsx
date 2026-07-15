import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/common.css'
import './css/style.css'
import './css/home.css'
import './css/restaurant.css'
import './css/cart.css'
import './css/checkout.css'
import './css/login.css'
import './css/menu.css'
import './css/orders.css'
import './css/payment.css'
import './css/admin.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
