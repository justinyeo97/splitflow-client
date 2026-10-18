import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'

const navigation = [
  { label: 'Workspace', items: [
    ['Dashboard', '/', '◫'],
    ['Expenses', '/expenses', '↗'],
    ['Imports', '/imports', '⇧'],
  ] },
  { label: 'Directory', items: [
    ['Consultants', '/consultants', '◎'],
    ['Countries', '/countries', '⌖'],
  ] },
  { label: 'Finance', items: [
    ['Conversions & exceptions', '/conversions', '⇄'],
    ['Reports & reconciliation', '/reports', '▤'],
    ['Placements', '/placements', '◇'],
  ] },
]

function AppShell() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const activeTitle = navigation.flatMap(group => group.items).find(([, path]) => path === location.pathname)?.[0] || 'Dashboard'

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="Splitflow home">
          <span className="brand-mark">S</span>
          <span className="brand-name">splitflow<span>.</span><small>FINANCE OPERATIONS</small></span>
        </a>
        <div className="workspace-selector"><span className="workspace-icon">S</span><span><strong>Your workspace</strong><small>Regional workspace</small></span><span className="selector-chevron">⌄</span></div>
        <nav className="nav-groups">
          {navigation.map(group => <div className="nav-group" key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map(([label, path, icon]) => <NavLink end={path === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} key={path} to={path}>
              <span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>
            </NavLink>)}
          </div>)}
        </nav>
        <div className="sidebar-bottom"><div className="connection-indicator"><span /> API integration in progress</div><div className="profile"><div className="avatar">{(user?.email || 'U').slice(0, 1).toUpperCase()}</div><div className="profile-identity"><strong>{user?.email || 'Signed-in user'}</strong><small>Authenticated</small></div><button className="profile-menu" aria-label="Sign out" onClick={signOut}>↪</button></div></div>
      </aside>
      <div className="main-column">
        <header className="topbar"><button className="mobile-brand" aria-label="Splitflow">S</button><div className="breadcrumb">Splitflow <span>/</span> <strong>{activeTitle}</strong></div><div className="topbar-right"><span className="environment-pill"><i /> Development</span><button className="help-button" aria-label="Help">?</button></div></header>
        <main><Outlet /></main>
        <footer className="page-footer"><span>Centralized costs. Transparent allocations. Consolidated reporting.</span><span>Splitflow <b>·</b> Finance operations</span></footer>
      </div>
    </div>
  )
}

export default AppShell
