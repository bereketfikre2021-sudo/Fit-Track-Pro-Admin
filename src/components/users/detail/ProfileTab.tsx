import { useQuery } from '@tanstack/react-query'
import { UserCircle, Ruler, Scale, Target, Dumbbell, Calendar } from 'lucide-react'
import { fetchUserProfile, fetchUserRoles, fetchUserBodyStats } from '@/lib/users.queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
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
  const bmi = weight / ((height / 100) ** 2)
  return bmi.toFixed(1)
}

function bmiCategory(bmi: string): string {
  const n = parseFloat(bmi)
  if (isNaN(n)) return ''
  if (n < 18.5) return 'Underweight'
  if (n < 25) return 'Normal'
  if (n < 30) return 'Overweight'
  return 'Obese'
}

export function ProfileTab({ userId }: ProfileTabProps) {
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

  if (pLoading || rLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!profile) return <p className="text-sm text-muted-foreground py-8 text-center">Profile not found</p>

  const bmi = calcBMI(profile.current_weight_kg, profile.height_cm)
  const cat = bmiCategory(bmi)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-5">
      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-primary" />Profile</CardTitle></CardHeader>
        <CardContent>
          <StatItem icon={Calendar} label="Joined" value={formatDate(profile.registration_date)} />
          <StatItem icon={UserCircle} label="Gender" value={profile.gender} />
          <StatItem icon={Target} label="Fitness goal" value={profile.fitness_goal?.replace('_', ' ')} />
          <StatItem icon={Dumbbell} label="Fitness level" value={profile.fitness_level} />
          <StatItem icon={Target} label="Focus area" value={profile.focus_area} />
          <div className="py-2.5 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">Workout days</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(profile.workout_days ?? []).map((d) => (
                <Badge key={d} variant="outline">{d.slice(0, 3)}</Badge>
              ))}
              {!profile.workout_days?.length && <span className="text-sm text-foreground">—</span>}
            </div>
          </div>
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
          <StatItem icon={Ruler} label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : null} />
          <StatItem icon={Scale} label="Current weight" value={profile.current_weight_kg ? `${profile.current_weight_kg} kg` : null} />
          <StatItem icon={Target} label="Target weight" value={profile.target_weight_kg ? `${profile.target_weight_kg} kg` : null} />
          <div className="py-2.5 border-b border-border flex items-center gap-3">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1">BMI</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{bmi}</span>
              {cat && <Badge variant={cat === 'Normal' ? 'success' : cat === 'Underweight' ? 'info' : 'warning'}>{cat}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight chart */}
      {bodyStats.length > 0 && (
        <Card className="lg:col-span-2">
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
