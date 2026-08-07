/**
 * CsvImportModal.tsx — Generic CSV bulk import modal for nutrition entities
 */

import { useState, useRef } from 'react'
import { Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { csvToArray } from '@/lib/nutrition.queries'

interface CsvImportModalProps {
  open: boolean
  onClose: () => void
  title: string
  templateHeaders: string[]
  templateRow: Record<string, string>
  onImport: (rows: Record<string, string>[]) => Promise<{ inserted: number; errors: string[] }>
  onSuccess: () => void
}

function buildCsvTemplate(headers: string[], row: Record<string, string>): string {
  const escape = (v: string) => v.includes(',') ? `"${v}"` : v
  return [headers.join(','), headers.map((h) => escape(row[h] ?? '')).join(',')].join('\n')
}

export function CsvImportModal({
  open, onClose, title, templateHeaders, templateRow, onImport, onSuccess,
}: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setCsvText(''); setStatus('idle'); setResult(null) }
  const handleClose = () => { reset(); onClose() }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText((ev.target?.result as string) ?? '')
    reader.readAsText(file)
    e.target.value = ''
  }

  const downloadTemplate = () => {
    const csv = buildCsvTemplate(templateHeaders, templateRow)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-template.csv`
    a.click()
  }

  const handleImport = async () => {
    const rows = csvToArray(csvText)
    if (!rows.length) { setResult({ inserted: 0, errors: ['No valid rows found in CSV'] }); setStatus('error'); return }
    setStatus('loading')
    const r = await onImport(rows)
    setResult(r)
    setStatus(r.errors.length === 0 || r.inserted > 0 ? 'done' : 'error')
    if (r.inserted > 0) onSuccess()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`CSV Import — ${title}`} size="md">
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Required columns: <span className="font-mono">{templateHeaders.slice(0, 4).join(', ')}</span>{templateHeaders.length > 4 ? ` +${templateHeaders.length - 4} more` : ''}</p>
          <p>First row must be headers. Download the template to see all supported columns.</p>
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={downloadTemplate}>Download template</Button>
          <Button type="button" size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>Upload CSV</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">CSV content</label>
          <textarea rows={10} value={csvText} onChange={(e) => setCsvText(e.target.value)}
            placeholder={`name,calories,protein_g,...\nInjera,174,5.7,...`}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
        </div>

        {result && (
          <div className={cn('rounded-lg p-3 space-y-1', status === 'done' ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {status === 'done'
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" />Imported {result.inserted} row(s)</>
                : <><AlertCircle className="h-4 w-4 text-destructive" />{result.inserted > 0 ? `${result.inserted} imported with errors:` : 'Import failed'}</>}
            </div>
            {result.errors.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs text-destructive font-mono pl-6">{e}</p>
            ))}
            {result.errors.length > 5 && <p className="text-xs text-muted-foreground pl-6">…and {result.errors.length - 5} more errors</p>}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={handleClose}>{status === 'done' ? 'Close' : 'Cancel'}</Button>
          {status !== 'done' && (
            <Button onClick={handleImport} loading={status === 'loading'} disabled={!csvText.trim()}>Import</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
