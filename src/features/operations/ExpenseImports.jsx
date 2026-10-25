import ProximityHeading from '../../components/ProximityHeading.jsx'
import { useState } from 'react'
import { apiRequest } from '../../api/client.js'
import { useApiList } from '../../hooks/useApiList.js'
import { today, useToken, Notice, Table } from './operationsUi.jsx'

export default function ExpenseImports({ onImported }) {
  const token = useToken()
  const [file, setFile] = useState(null)
  const [batchId, setBatchId] = useState('')
  const [batch, setBatch] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadingBatch, setLoadingBatch] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadBatch(id = batchId.trim()) {
    if (!id) return
    setLoadingBatch(true); setError(''); setBatch(null)
    try {
      const result = await apiRequest(`imports/${encodeURIComponent(id)}`, { token })
      setBatch(result.data)
    } catch (err) { setError(`Could not load batch details: ${err.message}`) }
    finally { setLoadingBatch(false) }
  }

  async function upload(event) {
    event.preventDefault()
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Choose a CSV file no larger than 5 MB.'); return }
    setBusy(true); setError(''); setNotice(''); setBatch(null)
    try {
      const csv = await file.text()
      const result = await apiRequest('imports/expenses', { method: 'POST', token, headers: { 'Content-Type': 'text/csv', 'X-Filename': file.name }, body: csv })
      const id = result.data.id || ''
      setBatchId(id)
      setNotice(`Import finished: ${result.data.accepted} accepted, ${result.data.rejected} rejected, ${result.data.duplicates} duplicates. ${result.data.conversions_finalized || 0} converted automatically; ${result.data.conversions_pending || 0} pending conversion. The expense ledger has been refreshed; active date filters still apply.`)
      onImported()
      if (id) await loadBatch(id)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <section className="expense-import-section" aria-labelledby="expense-import-title">
    <div className="panel-heading"><div><ProximityHeading as="h2" id="expense-import-title">Import expenses from CSV</ProximityHeading><p>Upload multiple expenses and review results without leaving this page.</p></div></div>
    <Notice error={error} notice={notice} />
    <div className="management-grid expense-import-grid">
      <section className="panel form-panel">
        <div className="panel-heading"><div><ProximityHeading as="h3">Upload CSV</ProximityHeading><p>Maximum 5 MB and 5,000 rows.</p></div></div>
        <form className="record-form" onSubmit={upload}>
          <label>Expense CSV<input type="file" accept=".csv,text/csv" required disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
          <p className="form-footnote">Required headers: consultant_external_id, transaction_date, original_amount, original_currency, category. Optional: vendor, source_identifier, description.</p>
          <div className="form-actions"><button className="primary-button" disabled={busy || loadingBatch || !file}>{busy ? 'Importing…' : 'Import expenses'}</button></div>
        </form>
        <details className="expense-sample"><summary>Download a sample CSV</summary><SampleDownload token={token} /></details>
      </section>
      <section className="panel form-panel">
        <div className="panel-heading"><div><ProximityHeading as="h3">Import results</ProximityHeading><p>Results load automatically after upload, or enter a previous batch ID.</p></div></div>
        <form className="record-form" onSubmit={e => { e.preventDefault(); loadBatch() }}>
          <label>Batch ID<input required value={batchId} onChange={e => setBatchId(e.target.value)} placeholder="UUID" disabled={busy || loadingBatch} /></label>
          <div className="form-actions"><button className="secondary-action" disabled={busy || loadingBatch || !batchId.trim()}>{loadingBatch ? 'Loading…' : 'Load batch'}</button></div>
        </form>
        {batch && <div className="batch-summary"><strong>{batch.filename}</strong><span>Status: {batch.status}</span><span>Rows: {batch.total_rows} · accepted {batch.accepted_rows} · rejected {batch.rejected_rows} · duplicates {batch.duplicate_rows}</span>{batch.import_row_errors?.length > 0 && <Table columns={['Row', 'Error', 'Message']}>{batch.import_row_errors.map(item => <tr key={item.id}><td>{item.row_number}</td><td>{item.error_code}</td><td>{item.message}</td></tr>)}</Table>}</div>}
      </section>
    </div>
  </section>
}

function SampleDownload({ token }) {
  const people = useApiList('consultants', token, 100)
  const [personId, setPersonId] = useState('')
  const [date, setDate] = useState(today())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function download() {
    setBusy(true); setError('')
    try {
      const person = people.data.find(item => item.id === personId)
      const result = await apiRequest(`consultants/${personId}/country-history`, { token })
      if (!result.data?.some(item => item.effective_from <= date && (!item.effective_to || item.effective_to >= date))) throw new Error('Choose a date covered by this consultant’s country assignment.')
      const cell = value => `"${String(value).replaceAll('"', '""')}"`
      const rows = [['consultant_external_id','transaction_date','original_amount','original_currency','category','vendor','source_identifier','description']]
      ;['128.40','86.25','245.00','42.00','75.00'].forEach((amount, index) => rows.push([person.external_id,date,amount,'USD',index === 2 ? 'Software' : 'Travel','Sample vendor',`DEMO-W1-${person.id}-${date}-${index + 1}`,'Sample testing expense']))
      const url = URL.createObjectURL(new Blob([rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = 'sample-expenses.csv'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="record-form"><label>Sample consultant<select value={personId} onChange={event => setPersonId(event.target.value)}><option value="">Choose an existing consultant</option>{people.data.map(person => <option key={person.id} value={person.id}>{person.name} ({person.external_id})</option>)}</select></label><label>Sample transaction date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><button type="button" className="secondary-action" disabled={!personId || !date || busy} onClick={download}>{busy ? 'Checking assignment…' : 'Download 5 valid sample rows'}</button><p className="form-footnote">Checks the assignment date before download. Reimporting this file uses the same source IDs for duplicate detection.</p>{(error || people.error) && <p role="alert">{error || people.error.message}</p>}</div>
}

