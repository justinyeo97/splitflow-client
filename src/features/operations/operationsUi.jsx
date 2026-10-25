import { ErrorState, LoadingState } from '../../components/States.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'

const today = () => new Date().toISOString().slice(0, 10)
const expenseCurrencies = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('currency')
  : ['AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'HKD', 'IDR', 'INR', 'JPY', 'KRW', 'MYR', 'NZD', 'PHP', 'SGD', 'THB', 'TWD', 'USD', 'VND']
const expenseCategories = ['Travel', 'Meals', 'Accommodation', 'Software', 'Office supplies', 'Equipment', 'Training', 'Other']
function money(amount, currency = '') {
  const raw = String(amount ?? '0').trim()
  const negative = raw.startsWith('-')
  const [wholePart = '0', fractionPart = ''] = (negative ? raw.slice(1) : raw).split('.')
  let whole = BigInt(wholePart || '0')
  let cents = BigInt((fractionPart + '00').slice(0, 2))
  if ((fractionPart[2] || '0') >= '5') cents += 1n
  if (cents === 100n) { whole += 1n; cents = 0n }
  const formatted = `${new Intl.NumberFormat().format(whole)}.${String(cents).padStart(2, '0')}`
  return `${currency ? `${currency} ` : ''}${negative && (whole > 0n || cents > 0n) ? '-' : ''}${formatted}`
}

function useToken() { return useAuth().session?.access_token }
function Heading({ eyebrow, title, children }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{children}</div>
}
function Notice({ error, notice }) {
  return <>{error && <div className="inline-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status">{notice}</div>}</>
}
function Table({ columns, children }) {
  return <div className="table-scroll"><table><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
function Pager({ list }) {
  if (!list.pagination.total || list.pagination.total <= list.pagination.limit) return null
  return <div className="pagination"><span>{list.offset + 1}–{Math.min(list.offset + list.pagination.limit, list.pagination.total)} of {list.pagination.total}</span><div><button disabled={list.loading || !list.offset} onClick={() => list.setOffset(Math.max(0, list.offset - list.pagination.limit))}>Previous</button><button disabled={list.loading || list.offset + list.pagination.limit >= list.pagination.total} onClick={() => list.setOffset(list.offset + list.pagination.limit)}>Next</button></div></div>
}
function Panel({ title, detail, action, children }) {
  return <section className="panel table-panel"><div className="panel-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>{children}</section>
}
function ListResult({ list, title, columns, children }) {
  if (list.error) return <ErrorState title={title} message={list.error.message} onRetry={list.refresh} />
  if (list.loading) return <LoadingState label={`Loading ${title.toLowerCase()}…`} />
  if (!list.data.length) return <div className="table-empty">No records yet.</div>
  return <>{<Table columns={columns}>{children}</Table>}<Pager list={list} /></>
}

export { today, expenseCurrencies, expenseCategories, money, useToken, Heading, Notice, Table, Panel, ListResult }
