import PaginatedTable from './PaginatedTable.jsx'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client.js'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Heading, Panel, Table, money } from './operationsUi.jsx'
import RoiReport from './RoiReport.jsx'

function useReport(path, token, scope, reload) {
  const [state, setState] = useState({ scope, data:null, loading:true, error:null })
  useEffect(() => {
    let current=true
    setState(previous => ({ scope, data:previous.scope===scope?previous.data:null, loading:true, error:null }))
    apiRequest(path,{token})
      .then(data=>{if(current)setState({scope,data,loading:false,error:null})})
      .catch(error=>{if(current)setState(previous=>({...previous,loading:false,error}))})
    return ()=>{current=false}
  },[path,token,scope,reload])
  return state.scope===scope?state:{scope,data:null,loading:true,error:null}
}

export default function ReportsPage() {
  const {session,profile}=useAuth()
  const token=session?.access_token
  const currency=profile?.company?.home_currency||'USD'
  const scope=(profile?.company?.id||profile?.company_id||session?.user?.id||'')+':'+currency
  const [reload,setReload]=useState(0)
  const country=useReport('reports/country-costs',token,scope,reload)
  const spend=useReport('reports/consolidated',token,scope,reload)
  const reconciliation=useReport('reports/reconciliation',token,scope,reload)
  const refresh=()=>setReload(value=>value+1)
  const summary=reconciliation.data?.summary
  const total=spend.data?.data
  const noPermission=reconciliation.error?.status===403
  return <section className="page-content">
    <div className="metric-grid report-summary" aria-label="Report summary">
      <article className="metric-card" aria-busy={spend.loading}>
        <span>Recorded expense spend ({total?.currency||currency})</span>
        <strong>{total?money(total.total,total.currency||currency):'—'}</strong>
        <small>{spend.loading?'Updating expense total...':spend.error?'Expense total unavailable. Retry below.':`${total?.expense_count||0} expenses included | ${total?.unconverted_count||0} awaiting a reporting rate`}</small>
      </article>
      <article className="metric-card" aria-busy={reconciliation.loading}>
        <span>Conversions checked</span><strong>{summary?summary.conversion_count:'—'}</strong>
        <small>{reconciliation.loading?'Updating conversions...':noPermission?'Finance access required':reconciliation.error?'Conversion summary unavailable':`${summary?.finalized_count||0} finalized`}</small>
      </article>
      <article className="metric-card" aria-busy={reconciliation.loading}>
        <span>Exceptions</span><strong>{summary?summary.exception_count:'—'}</strong>
        <small>{reconciliation.loading?'Updating exceptions...':noPermission?'Finance access required':reconciliation.error?'Exception count unavailable':'Pending or unfinalized conversions'}</small>
      </article>
    </div>
    <Heading eyebrow="FINANCE" title="Reports & reconciliation"><button className="secondary-action" disabled={country.loading||spend.loading||reconciliation.loading} onClick={refresh}>Refresh reports</button></Heading>
    <p className="page-lede">Review ROI and reconcile recorded costs.</p>
    {spend.error&&<ErrorState title="Could not update expense totals" message={spend.error.message} onRetry={refresh} />}
    <RoiReport refreshKey={reload} />
    <Panel title="Country expense allocations" detail="Finalized expenses in each country's reporting currency; all dates">
      {country.error?<ErrorState title="Could not load country allocations" message={country.error.message} onRetry={refresh}/>:country.loading&&!country.data?<LoadingState />:country.data?.data?.length?<PaginatedTable label="Country allocations" rows={country.data.data} columns={['Country','Currency','Finalized total','Converted expenses','Unconverted']} renderRow={row => (<tr key={row.country_id}><td className="primary-cell">{row.country}</td><td>{row.currency}</td><td>{money(row.total,row.currency)}</td><td>{row.expense_count}</td><td>{row.unconverted_count}</td></tr>)} />:<div className="table-empty">No country costs to report yet.</div>}
    </Panel>
    <Panel title="Conversion reconciliation" detail="Conversion status and source expense; all dates">
      {reconciliation.error?<ErrorState title={noPermission?'Finance access required':'Could not load reconciliation'} message={reconciliation.error.message} onRetry={noPermission?undefined:refresh}/>:reconciliation.loading&&!reconciliation.data?<LoadingState />:reconciliation.data?.data?.length?<PaginatedTable label="Reconciliation" rows={reconciliation.data.data} columns={['Status','Target','Rate','Converted amount','Requested date','Effective rate date']} renderRow={row => (<tr key={row.id}><td><span className={`status-pill ${row.status==='finalized'?'status-active':'status-inactive'}`}>{row.status}</span></td><td>{row.target_currency}</td><td>{row.applied_rate||'—'}</td><td>{row.converted_amount==null?'—':money(row.converted_amount,row.target_currency)}</td><td>{row.requested_date||'—'}</td><td>{row.effective_rate_date||'—'}</td></tr>)} />:<div className="table-empty">No conversions to reconcile yet.</div>}
    </Panel>
  </section>
}
