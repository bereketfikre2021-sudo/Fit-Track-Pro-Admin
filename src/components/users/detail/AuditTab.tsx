/**
 * AuditTab.tsx
 * User audit log — login rows show friendly device name.
 *
 * Device info is captured in audit_logs.user_agent when the user signs in
 * (written by the frontend's onAuthStateChange handler in useAuth.jsx).
 *
 * Columns: Time | Action | Device / IP | Details
 * (Table and Severity removed per user request)
 */

import { useQuery } from '@tanstack/react-query'
import { fetchUserAuditLogs } from '@/lib/users.queries'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'
import { Monitor, Smartphone, Tablet, HelpCircle, Globe } from 'lucide-react'

interface Props { userId: string }

// ── User-agent parser ─────────────────────────────────────────────────────────

type DeviceType = 'Mobile' | 'Tablet' | 'Desktop' | 'Unknown'

interface ParsedUA {
  deviceName: string   // e.g. "Chrome 124 on Android 13"
  browser:    string   // e.g. "Chrome 124"
  os:         string   // e.g. "Android 13"
  type:       DeviceType
}

function parseUA(ua: string | null): ParsedUA {
  if (!ua) return { deviceName: 'Unknown device', browser: 'Unknown', os: 'Unknown', type: 'Unknown' }

  // ── Device type ───────────────────────────────────────────────────────────
  let type: DeviceType = 'Desktop'
  if      (/tablet|ipad|playbook|silk/i.test(ua))                                            type = 'Tablet'
  else if (/mobile|android.*mobile|iphone|ipod|blackberry|opera mini|windows phone/i.test(ua)) type = 'Mobile'

  // ── OS ────────────────────────────────────────────────────────────────────
  let os = 'Unknown'
  if      (/windows nt 10\.0/i.test(ua))  os = 'Windows 10/11'
  else if (/windows nt 6\.3/i.test(ua))   os = 'Windows 8.1'
  else if (/windows nt 6\.[12]/i.test(ua)) os = 'Windows 7/8'
  else if (/windows/i.test(ua))            os = 'Windows'
  else if (/macintosh|mac os x/i.test(ua)) {
    const v = ua.match(/mac os x (\d+[._]\d+)/i)
    os = v ? `macOS ${v[1].replace(/_/g, '.')}` : 'macOS'
  }
  else if (/iphone/i.test(ua)) {
    const v = ua.match(/os (\d+)[._](\d+)/i)
    os = v ? `iOS ${v[1]}.${v[2]}` : 'iOS'
  }
  else if (/ipad/i.test(ua)) {
    const v = ua.match(/os (\d+)[._](\d+)/i)
    os = v ? `iPadOS ${v[1]}.${v[2]}` : 'iPadOS'
  }
  else if (/android/i.test(ua)) {
    const v = ua.match(/android (\d+\.?\d*)/i)
    os = v ? `Android ${v[1]}` : 'Android'
  }
  else if (/linux/i.test(ua)) os = 'Linux'

  // ── Browser ───────────────────────────────────────────────────────────────
  let browser = 'Unknown browser'
  if      (/edg(e|\/)\d/i.test(ua))        { const v = ua.match(/edg[e\/](\d+)/i);          browser = `Edge ${v?.[1] ?? ''}`.trim() }
  else if (/opr\/\d/i.test(ua))             { const v = ua.match(/opr\/(\d+)/i);             browser = `Opera ${v?.[1] ?? ''}`.trim() }
  else if (/fxios\/\d/i.test(ua))           { const v = ua.match(/fxios\/(\d+)/i);           browser = `Firefox ${v?.[1] ?? ''}`.trim() }
  else if (/firefox\/\d/i.test(ua))         { const v = ua.match(/firefox\/(\d+)/i);         browser = `Firefox ${v?.[1] ?? ''}`.trim() }
  else if (/crios\/\d/i.test(ua))           { const v = ua.match(/crios\/(\d+)/i);           browser = `Chrome ${v?.[1] ?? ''}`.trim() }
  else if (/chrome\/\d/i.test(ua))          { const v = ua.match(/chrome\/(\d+)/i);          browser = `Chrome ${v?.[1] ?? ''}`.trim() }
  else if (/version\/\d.*safari/i.test(ua)) { const v = ua.match(/version\/(\d+)/i);        browser = `Safari ${v?.[1] ?? ''}`.trim() }
  else if (/safari/i.test(ua))               browser = 'Safari'
  else if (/msie|trident/i.test(ua))         browser = 'Internet Explorer'
  else if (/samsung/i.test(ua))              browser = 'Samsung Browser'

  const deviceName = os !== 'Unknown' ? `${browser} on ${os}` : browser

  return { deviceName, browser, os, type }
}

function DeviceIcon({ type, className }: { type: DeviceType; className?: string }) {
  if (type === 'Mobile')  return <Smartphone className={className} />
  if (type === 'Tablet')  return <Tablet     className={className} />
  if (type === 'Desktop') return <Monitor    className={className} />
  return <HelpCircle className={className} />
}

const DEVICE_TYPE_STYLE: Record<DeviceType, string> = {
  Mobile:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Tablet:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Desktop: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Unknown: 'bg-muted text-muted-foreground border-border',
}

// ── Action badge map ──────────────────────────────────────────────────────────

const ACTION_BADGE: Record<string, 'default' | 'info' | 'warning' | 'danger' | 'outline'> = {
  insert:       'default',
  update:       'info',
  delete:       'danger',
  login:        'default',
  logout:       'outline',
  export:       'info',
  admin_action: 'warning',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditTab({ userId }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['user-audit', userId],
    queryFn:  () => fetchUserAuditLogs(userId),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!data.length) return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Monitor className="h-10 w-10 text-muted-foreground opacity-30" />
      <p className="text-sm text-muted-foreground">No activity log entries found.</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Device info will appear here after the user signs in with the latest version of the app.
      </p>
    </div>
  )

  // ── Build unique device list from login rows that have a user_agent ───────
  const deviceMap = new Map<string, {
    parsed:    ParsedUA
    ip:        string | null
    last_seen: string
    count:     number
  }>()

  for (const log of data) {
    if (log.action !== 'login' || !log.user_agent) continue
    const ua  = log.user_agent
    const rec = deviceMap.get(ua)
    if (rec) {
      rec.count++
      if (log.created_at > rec.last_seen) { rec.last_seen = log.created_at; rec.ip = log.ip_address }
    } else {
      deviceMap.set(ua, { parsed: parseUA(ua), ip: log.ip_address, last_seen: log.created_at, count: 1 })
    }
  }

  const devices = [...deviceMap.values()].sort((a, b) => b.last_seen.localeCompare(a.last_seen))

  return (
    <div className="space-y-6 pt-5">

      {/* ── Known Devices ──────────────────────────────────────────────────── */}
      {devices.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            Known Devices
            <span className="text-xs font-normal text-muted-foreground">
              ({devices.length} unique {devices.length === 1 ? 'device' : 'devices'})
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {devices.map((d, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <DeviceIcon type={d.parsed.type} className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Friendly device name — the key visible info */}
                  <p className="text-sm font-semibold leading-tight truncate">{d.parsed.deviceName}</p>
                  {/* Type pill + IP */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${DEVICE_TYPE_STYLE[d.parsed.type]}`}>
                      {d.parsed.type}
                    </span>
                    {d.ip && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Globe className="h-2.5 w-2.5" />{d.ip}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {d.count} sign-in{d.count !== 1 ? 's' : ''} · Last: {formatDateTime(d.last_seen)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No device info yet — explain why */}
      {devices.length === 0 && data.some((l) => l.action === 'login') && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          Login events found but no device info captured yet. Device names will appear after
          the user signs in with the updated app version.
        </div>
      )}

      {/* ── Activity Log ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold mb-3">Activity Log</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Device / IP</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((log) => {
                const parsed = log.user_agent ? parseUA(log.user_agent) : null
                return (
                  <tr key={log.id} className="hover:bg-muted/20">

                    {/* Time */}
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-2.5">
                      <Badge variant={(ACTION_BADGE[log.action] ?? 'default') as any}>
                        {log.action}
                      </Badge>
                    </td>

                    {/* Device / IP */}
                    <td className="px-4 py-2.5">
                      {parsed ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <DeviceIcon type={parsed.type}
                            className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate max-w-[180px]">
                              {parsed.deviceName}
                            </p>
                            {log.ip_address && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                <Globe className="h-2.5 w-2.5" />{log.ip_address}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {log.ip_address ?? '—'}
                        </span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs max-w-[220px] truncate">
                      {log.new_values
                        ? JSON.stringify(log.new_values).slice(0, 100)
                        : '—'}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
