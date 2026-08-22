import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { UserCircle, Ruler, Scale, Target, Dumbbell, Calendar, Pencil, Check, X } from 'lucide-react'
import { fetchUserProfile, fetchUserRoles, fetchUserBodyStats } from '@/lib/users.queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ProfileTabProps { userId: string }

function StatItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? '—'}</span>
    </div>
  )
}

function calcBMI(weight: number | null, height: number | null): string {
  if (!weight || !height) return '—'
  return (weight / ((height / 100) ** 2)).toFixed(1)
}

function bmiCategory(bmi: string): string {
  const n = parseFloat(bmi)
  if (isNaN(n)) return ''
  if (n < 18.5) return 'Underweight'
  if (n < 25)   return 'Normal'
  if (n < 30)   return 'Overweight'
  return 'Obese'
}

const FITNESS_GOALS    = ['strength', 'muscle', 'fat', 'endurance', 'general']
const FITNESS_LEVELS   = ['beginner', 'intermediate', 'advanced']
const DAYS_OF_WEEK     = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function ProfileTab({ userId }: ProfileTabProps) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [draft, setDraft]     = useState<Record<string, any>>({})

  const { data: profile, isLoading: pLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId),
  })
  const { data: roles = [], isLoading: rLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => fetchUserRoles(userId),
  })
  const { data: bodyStats = [], isLoading: bLoading } = useQuery({
    queryKey: ['user-body-stats', userId],
    queryFn: () => fetchUserBodyStats(userId),
  })

  const startEdit = () => {
    if (!profile) return
    setDraft({
      height_cm:          profile.height_cm ?? '',
      current_weight_kg:  profile.current_weight_kg ?? '',
      target_weight_kg:   profile.target_weight_kg ?? '',
      fitness_goal:       profile.fitness_goal ?? 'muscle',
      fitness_level:      profile.fitness_level ?? 'beginner',
      focus_area:         profile.focus_area ?? '',
      workout_days:       profile.workout_days ?? [],
    })
    setEditing(true)
  }

  const cancelEdit = () => { setEditing(false); setDraft({}) }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        height_cm:         draft.height_cm ? Number(draft.height_cm) : null,
        current_weight_kg: draft.current_weight_kg ? Number(draft.current_weight_kg) : null,
        target_weight_kg:  draft.target_weight_kg ? Number(draft.target_weight_kg) : null,
        fitness_goal:      draft.fitness_goal || null,
        fitness_level:     draft.fitness_level || null,
        focus_area:        draft.focus_area || null,
        workout_days:      draft.workout_days,
      }
      const { error } = await supabase.from('users').update(payload).eq('id', userId)
      if (error) throw error
      toast.success('Profile updated')
      qc.invalidateQueries({ queryKey: ['user-profile', userId] })
      setEditing(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: string) => {
    setDraft((d: any) => ({
      ...d,
      workout_days: d.workout_days.includes(day)
        ? d.workout_days.filter((x: string) => x !== day)
        : [...d.workout_days, day],
    }))
  }

  if (pLoading || rLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!profile) return <p className="text-sm text-muted-foreground py-8 text-center">Profile not found</p>

  const bmi = calcBMI(profile.current_weight_kg, profile.height_cm)
  const cat = bmiCategory(bmi)

  return (
    <div className="space-y-5 pt-5">
      {/* Edit toggle */}
      <div className="flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" leftIcon={<X className="h-3.5 w-3.5" />} onClick={cancelEdit} disabled={saving}>Cancel</Button>
            <Button size="sm" leftIcon={<Check className="h-3.5 w-3.5" />} onClick={saveEdit} loading={saving}>Save changes</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={startEdit}>Edit profile</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Basic info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-primary" />Profile</CardTitle></CardHeader>
          <CardContent>
            <StatItem icon={Calendar} label="Joined"  value={formatDate(profile.registration_date)} />
            <StatItem icon={UserCircle} label="Gender" value={profile.gender} />

            {editing ? (
              <>
                <div className="py-2.5 border-b border-border space-y-1.5">
                  <label className="text-xs text-muted-foreground">Fitness goal</label>
                  <select value={draft.fitness_goal} onChange={e => setDraft((d:any) => ({...d, fitness_goal: e.target.value}))}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    {FITNESS_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="py-2.5 border-b border-border space-y-1.5">
                  <label className="text-xs text-muted-foreground">Fitness level</label>
                  <select value={draft.fitness_level} onChange={e => setDraft((d:any) => ({...d, fitness_level: e.target.value}))}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    {FITNESS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="py-2.5 border-b border-border space-y-1.5">
                  <label className="text-xs text-muted-foreground">Workout days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map(day => (
                      <button key={day} type="button"
                        onClick={() => toggleDay(day)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${draft.workout_days.includes(day) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <StatItem icon={Target}   label="Fitness goal"  value={profile.fitness_goal?.replace('_', ' ')} />
                <StatItem icon={Dumbbell} label="Fitness level" value={profile.fitness_level} />
                <StatItem icon={Target}   label="Focus area"    value={profile.focus_area} />
                <div className="py-2.5 border-b border-border">
                  <span className="text-sm text-muted-foreground">Workout days</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(profile.workout_days ?? []).map((d) => <Badge key={d} variant="outline">{d.slice(0, 3)}</Badge>)}
                    {!profile.workout_days?.length && <span className="text-sm text-foreground">—</span>}
                  </div>
                </div>
              </>
            )}

            <div className="py-2.5">
              <span className="text-sm text-muted-foreground">Roles</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {roles.map((r) => <Badge key={r.id} variant="warning">{r.role}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Body stats */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="h-4 w-4 text-primary" />Body Stats</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <>
                <div className="py-2 border-b border-border">
                  <Input label="Height (cm)" type="number" value={draft.height_cm}
                    onChange={e => setDraft((d:any) => ({...d, height_cm: e.target.value}))} />
                </div>
                <div className="py-2 border-b border-border">
                  <Input label="Current weight (kg)" type="number" value={draft.current_weight_kg}
                    onChange={e => setDraft((d:any) => ({...d, current_weight_kg: e.target.value}))} />
                </div>
                <div className="py-2">
                  <Input label="Target weight (kg)" type="number" value={draft.target_weight_kg}
                    onChange={e => setDraft((d:any) => ({...d, target_weight_kg: e.target.value}))} />
                </div>
              </>
            ) : (
              <>
                <StatItem icon={Ruler}  label="Height"          value={profile.height_cm ? `${profile.height_cm} cm` : null} />
                <StatItem icon={Scale}  label="Current weight"  value={profile.current_weight_kg ? `${profile.current_weight_kg} kg` : null} />
                <StatItem icon={Target} label="Target weight"   value={profile.target_weight_kg ? `${profile.target_weight_kg} kg` : null} />
                <div className="py-2.5 border-b border-border flex items-center gap-3">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground flex-1">BMI</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{bmi}</span>
                    {cat && <Badge variant={cat === 'Normal' ? 'success' : cat === 'Underweight' ? 'info' : 'warning'}>{cat}</Badge>}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight chart */}
      {bodyStats.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Weight History (last 30 logs)</CardTitle></CardHeader>
          <CardContent>
            {bLoading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[...bodyStats].reverse()} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="log_date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} unit=" kg" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }}
                    formatter={(v: number) => [`${v} kg`, 'Weight']} />
                  <Line type="monotone" dataKey="weight_kg" stroke="hsl(84 81% 44%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
