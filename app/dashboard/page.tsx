'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTransition } from '@/components/page-transition'
import { MetricCard } from '@/components/metric-card'
import { supabase } from '@/lib/supabase/client'
import { Competitor } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { Users, TrendingUp, Bell, FileText } from 'lucide-react'

export default function DashboardPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalCompetitors: 0,
    totalChanges: 0,
    unreadAlerts: 0,
    lastUpdated: null as string | null,
  })

  useEffect(() => {
    let mounted = true
    
    const fetchDashboardData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || !mounted) {
          setLoading(false)
          return
        }

        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!profile || !mounted) {
          setLoading(false)
          return
        }

        // Parallelize all queries for better performance
        const [competitorsResult, snapshotsResult, alertsResult] = await Promise.all([
          supabase
            .from('competitors')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('snapshots')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_read', false),
        ])

        if (!mounted) return

        if (competitorsResult.data) {
          setCompetitors(competitorsResult.data)
          setStats((prev) => ({ ...prev, totalCompetitors: competitorsResult.data.length }))
        }

        if (snapshotsResult.count !== null) {
          setStats((prev) => ({ ...prev, totalChanges: snapshotsResult.count || 0 }))
        }

        if (alertsResult.count !== null) {
          setStats((prev) => ({ ...prev, unreadAlerts: alertsResult.count || 0 }))
        }

        // Check for errors in any query
        if (competitorsResult.error) {
          console.error('Error fetching competitors:', competitorsResult.error)
          setError('Failed to load competitors')
        }
        if (snapshotsResult.error) {
          console.error('Error fetching snapshots:', snapshotsResult.error)
        }
        if (alertsResult.error) {
          console.error('Error fetching alerts:', alertsResult.error)
        }
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error)
        setError(error.message || 'Failed to load dashboard data')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchDashboardData()

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Monitor your competitors in real-time</p>
          </div>
          <Link href="/dashboard/competitors/new">
            <Button>Add Competitor</Button>
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Competitors"
            value={stats.totalCompetitors}
            icon={Users}
            index={0}
          />
          <MetricCard
            title="Recent Changes"
            value={stats.totalChanges}
            description="+2 from last week"
            icon={TrendingUp}
            index={1}
          />
          <MetricCard
            title="Alerts This Week"
            value={stats.unreadAlerts}
            description="3 high priority"
            icon={Bell}
            index={2}
          />
          <MetricCard
            title="Reports Generated"
            value={0}
            icon={FileText}
            index={3}
          />
        </div>

        {/* Recent Competitors */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Competitors</h2>
            <Link
              href="/dashboard/competitors"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {competitors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold mb-2">No competitors yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your competitors by adding your first one
                </p>
                <Link href="/dashboard/competitors/new">
                  <Button>Add Competitor</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {competitors.map((competitor) => (
                <Link key={competitor.id} href={`/dashboard/competitors/${competitor.id}`}>
                  <Card className="hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">{competitor.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {competitor.website}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added {formatDistanceToNow(new Date(competitor.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="text-2xl">→</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/dashboard/competitors/new">
                <Button variant="secondary" className="w-full">
                  Add Competitor
                </Button>
              </Link>
              <Link href="/dashboard/alerts">
                <Button variant="secondary" className="w-full">
                  View Alerts
                </Button>
              </Link>
              <Link href="/dashboard/reports">
                <Button variant="secondary" className="w-full">
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
