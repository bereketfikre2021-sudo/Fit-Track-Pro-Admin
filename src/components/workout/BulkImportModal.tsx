/**
 * BulkImportModal.tsx
 * Generic JSON bulk import modal for exercises and templates.
 */

import { useState, useRef } from 'react'
import { Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface BulkImportModalProps {
  open: boolean
  onClose: () => void
  title: string
  templateData: object[]           // example rows shown to user
  onImport: (rows: object[]) => Promise<{ inserted: number; errors: string[] }>
  onSuccess: () => void
  fields: string[]                 // field names to show in template
}

export function BulkImportModal({
  open, onClose, title, templateData, onImport, onSuccess, fields,
}: BulkImportModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null)
  const [jsonText, setJsonText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStatus('idle')
    setResult(null)
    setJsonText('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setJsonText((ev.target?.result as string) ?? '')
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    let rows: object[]
    try {
      rows = JSON.parse(jsonText)
      if (!Array.isArray(rows)) throw new Error('JSON must be an array of objects')
    } catch {
      setResult({ inserted: 0, errors: ['Invalid JSON — must be an array of objects'] })
      setStatus('error')
      return
    }
    setStatus('loading')
    const r = await onImport(rows)
    setResult(r)
    setStatus(r.errors.length === 0 ? 'done' : 'error')
    if (r.inserted > 0) onSuccess()
  }

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'import-template.json'
    a.click()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Bulk Import — ${title}`} size="md">
      <div className="space-y-4">
        {/* Instructions */}
        <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Required fields: <span className="font-mono">{fields.slice(0, 3).join(', ')}</span></p>
          <p>Upload a JSON file or paste JSON below. Must be an array of objects.</p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button" size="sm" variant="outline"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={downloadTemplate}
          >
            Download template
          </Button>
          <Button
            type="button" size="sm" variant="outline"
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            onClick={() => fileRef.current?.click()}
          >
            Upload JSON file
          </Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">JSON data</label>
          <textarea
            rows={10}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={`[\n  { "name": "Exercise 1", "category": "strength", ... }\n]`}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Result */}
        {result && (
          <div className={cn(
            'rounded-lg p-3 space-y-1',
            status === 'done' ? 'bg-emerald-500/10' : 'bg-destructive/10',
          )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {status === 'done'
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" />Imported {result.inserted} row(s) successfully</>
                : <><AlertCircle className="h-4 w-4 text-destructive" />{result.inserted > 0 ? `Imported ${result.inserted} rows with errors:` : 'Import failed'}</>
              }
            </div>
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive font-mono pl-6">{e}</p>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={handleClose}>
            {status === 'done' ? 'Close' : 'Cancel'}
          </Button>
          {status !== 'done' && (
            <Button onClick={handleImport} loading={status === 'loading'} disabled={!jsonText.trim()}>
              Import
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
