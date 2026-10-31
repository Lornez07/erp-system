import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'
import { AuthProvider } from './hooks/useAuth.tsx'
import { RequireRole } from './components/RequireRole.tsx'
import { AppShell } from './components/AppShell.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { DashboardPage } from './features/dashboard/DashboardPage.tsx'
import { ProductsPage } from './features/inventory/ProductsPage.tsx'
import { CategoriesPage } from './features/inventory/CategoriesPage.tsx'
import { OrdersPage } from './features/sales/OrdersPage.tsx'
import { CustomersPage } from './features/sales/CustomersPage.tsx'
import { POsPage } from './features/purchasing/POsPage.tsx'
import { SuppliersPage } from './features/purchasing/SuppliersPage.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireRole />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/inventory" element={<ProductsPage />} />
                  <Route path="/inventory/categories" element={<CategoriesPage />} />
                  <Route path="/sales" element={<OrdersPage />} />
                  <Route path="/sales/customers" element={<CustomersPage />} />
                  <Route path="/purchasing" element={<POsPage />} />
                  <Route path="/purchasing/suppliers" element={<SuppliersPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
