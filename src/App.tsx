import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { AppLayout } from '@/layouts/AppLayout'
import { DriverLayout } from '@/layouts/DriverLayout'
import { LoginPage } from '@/pages/LoginPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DeliveryDetailPage = lazy(() => import('@/pages/DeliveryDetailPage'))
const DeliveryFormPage = lazy(() => import('@/pages/DeliveryFormPage'))
const DeliveriesPage = lazy(() => import('@/pages/DeliveriesPage'))
const DeliveriesCalendarPage = lazy(() => import('@/pages/DeliveriesCalendarPage'))
const DesignSystemPage = lazy(() => import('@/pages/DesignSystemPage'))
const CouriersPage = lazy(() => import('@/pages/CouriersPage'))
const DriversPage = lazy(() => import('@/pages/DriversPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const IncidentsPage = lazy(() => import('@/pages/IncidentsPage'))
const PackagesPage = lazy(() => import('@/pages/PackagesPage'))
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'))
const PersonsPage = lazy(() => import('@/pages/PersonsPage'))
const ScannerPage = lazy(() => import('@/pages/ScannerPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const UsersPage = lazy(() => import('@/pages/UsersPage'))
const VehiclesPage = lazy(() => import('@/pages/VehiclesPage'))
const DriverDeliveryPage = lazy(() => import('@/pages/driver/DriverDeliveryPage'))
const DriverHomePage = lazy(() => import('@/pages/driver/DriverHomePage'))
const DriverProfilePage = lazy(() => import('@/pages/driver/DriverProfilePage'))

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}

function AppRoutes() {
  const { theme } = useTheme()

  return (
    <BrowserRouter>
        <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin', 'operator', 'reader']} />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/scanner" element={<ScannerPage />} />
                <Route path="/packages" element={<PackagesPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/clientes" element={<PersonsPage />} />
                <Route path="/persons" element={<Navigate to="/clientes" replace />} />
                <Route path="/deliveries" element={<DeliveriesPage />} />
                <Route path="/deliveries/calendar" element={<DeliveriesCalendarPage />} />
                <Route path="/deliveries/new" element={<DeliveryFormPage />} />
                <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
                <Route path="/deliveries/:id/edit" element={<DeliveryFormPage />} />
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/drivers" element={<DriversPage />} />
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/couriers" element={<CouriersPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/design-system" element={<DesignSystemPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={['driver']} />}>
              <Route element={<DriverLayout />}>
                <Route path="/driver" element={<DriverHomePage />} />
                <Route path="/driver/deliveries/:id" element={<DriverDeliveryPage />} />
                <Route path="/driver/profile" element={<DriverProfilePage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        <Toaster richColors position="top-right" theme={theme} />
      </BrowserRouter>
  )
}
