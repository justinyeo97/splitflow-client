import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './layouts/AppShell.jsx'
import { EmptyState } from './components/States.jsx'
import SignInPage from './features/auth/SignInPage.jsx'
import ProtectedRoute from './features/auth/ProtectedRoute.jsx'
import CountriesPage from './features/countries/CountriesPage.jsx'
import ConsultantsPage from './features/consultants/ConsultantsPage.jsx'
import { DashboardPage, ExpensesPage, ImportsPage, ConversionsPage, ReportsPage, PlacementsPage } from './features/operations/OperationsPages.jsx'

const livePages = {
  '/': DashboardPage,
  '/expenses': ExpensesPage,
  '/imports': ImportsPage,
  '/conversions': ConversionsPage,
  '/reports': ReportsPage,
  '/placements': PlacementsPage,
}

const pages = [
  { path: '/', title: 'Dashboard' },
  { path: '/expenses', title: 'Expenses' },
  { path: '/imports', title: 'Imports' },
  { path: '/consultants', title: 'Consultants' },
  { path: '/countries', title: 'Countries' },
  { path: '/conversions', title: 'Conversions & exceptions' },
  { path: '/reports', title: 'Reports & reconciliation' },
  { path: '/placements', title: 'Placements' },
]

function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          {pages.map(({ path, title }) => <Route key={path} path={path} element={routeContent(path, title)} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

function routeContent(path, title) {
  if (path === '/countries') return <CountriesPage />
  if (path === '/consultants') return <ConsultantsPage />
  const Component = livePages[path]
  return Component ? <Component /> : <Page title={title} />
}

function Page({ title }) {
  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">REGIONAL COST ALLOCATION</p>
          <h1>{title}</h1>
        </div>
        <span className="scope-chip"><span className="scope-dot" /> API data coming next</span>
      </div>
      <EmptyState
        title="This page is ready for live data"
        description="The API contract is available. This screen is being connected to verified API responses; no demonstration financial figures are shown."
      />
    </section>
  )
}

export default App
