import ProximityHeading from '../components/ProximityHeading.jsx'
﻿import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'

const links = [
  ['Overview', '/', '01'], ['Expenses', '/expenses', '02'],
  ['Consultants', '/consultants', '03'], ['Countries', '/countries', '04'],
  ['Conversions', '/conversions', '05'], ['Reports', '/reports', '06'],
  ['Placements', '/placements', '07'],
]

export default function AppShell() {
  const { pathname } = useLocation()
  const { user, profile, signOut } = useAuth()
  const userName = profile?.consultant?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'My account'
  return <div className="workspace-frame">
    <div className="utility-strip"><span>ONE WORKSPACE. EVERY MARKET.</span><span>{profile?.company?.name || profile?.company_name || 'Splitflow'} / Finance operations</span></div>
    <header className="workspace-header">
      <NavLink className="brand" to="/" aria-label="Splitflow home"><span className="brand-mark">s<span>.</span></span><span className="brand-name">splitflow<span>.</span><small>GLOBAL FINANCE, CONNECTED</small></span></NavLink>
      <div className="header-caption">Global Team<br/><strong>One Team</strong></div>
      <div className="account-controls"><NavLink to="/account" className="account-link"><span className="account-avatar" aria-hidden="true">{userName.slice(0,1).toUpperCase()}</span><span className="account-email">{userName}</span><span className="account-link-label">My account</span></NavLink><button className="signout-button" onClick={signOut}>Sign out <span aria-hidden="true">↗</span></button></div>
    </header>
    <nav className="workspace-nav" aria-label="Main navigation">{(profile?.role==='consultant'?[['My expenses','/expenses','01']]:links).map(([label,path,number])=><NavLink key={path} to={path} end={path==='/'} className={({isActive})=>`workspace-nav-link${isActive?' active':''}`}><span className="nav-number" aria-hidden="true">{number}</span>{label}</NavLink>)}</nav>
    {pathname==='/' && <section className="workspace-hero"><div className="hero-copy"><p className="hero-kicker"><span/> CONNECTED FINANCE. CLEARER DECISIONS.</p><ProximityHeading as="h1">Your global costs.<br/><span>One clear picture.</span></ProximityHeading><p>Bring your people, expenses, and markets together. Make every allocation count.</p><NavLink to="/expenses" className="hero-action">Explore expenses <span aria-hidden="true">↗</span></NavLink></div><div className="orbit-art" aria-hidden="true"><div className="orbit-globe"><i/><i/><i/></div><span className="orbit-label orbit-label-top">PEOPLE</span><span className="orbit-label orbit-label-bottom">MARKETS</span><span className="orbit-dot"/><span className="orbit-center">s.</span></div><span className="hero-index" aria-hidden="true">01 / GLOBAL PERSPECTIVE</span></section>}
    <main className="workspace-main"><Outlet/></main>
    <footer className="workspace-footer"><NavLink to="/" className="footer-wordmark">splitflow<span>.</span></NavLink><span>Centralized costs. Transparent allocations.<br/>A shared perspective across every market.</span><span className="footer-caption">FINANCE THAT MOVES WITH YOU <span aria-hidden="true">↗</span></span></footer>
  </div>
}
