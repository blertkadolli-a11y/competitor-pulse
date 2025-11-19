'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client';
import { Alert, Change } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface AlertWithChange extends Alert {
  change: Change;
  competitor_name: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertWithChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) return;

      let query = supabase
        .from('alerts')
        .select(`
          *,
          change:changes(*),
          competitor:competitors(name)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      const alertsWithData: AlertWithChange[] = (data || []).map((alert: any) => ({
        ...alert,
        change: alert.change,
        competitor_name: alert.competitor?.name || 'Unknown',
      }));

      setAlerts(alertsWithData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(
        alerts.map((alert) =>
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) return;

      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;

      setAlerts(alerts.map((alert) => ({ ...alert, is_read: true })));
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
    }
  };

  const getChangeTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: '📝',
      pricing: '💰',
      feature: '✨',
      new_section: '➕',
      removed_section: '➖',
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Alerts</h1>
          <p className="text-[var(--muted-foreground)]">
            Get notified about important changes
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-[var(--border)] mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setFilter('unread')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                filter === 'unread'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }
            `}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                filter === 'all'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }
            `}
          >
            All ({alerts.length})
          </button>
        </nav>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔔</div>
            <h3 className="text-lg font-semibold mb-2">No alerts</h3>
            <p className="text-[var(--muted-foreground)]">
              {filter === 'unread'
                ? "You're all caught up! No unread alerts."
                : 'You have no alerts yet. They will appear here when changes are detected.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={!alert.is_read ? 'border-[var(--primary)] bg-[var(--accent)]' : ''}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">
                  {alert.change ? getChangeTypeIcon(alert.change.change_type) : '📄'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{alert.competitor_name}</span>
                    {alert.change && (
                      <>
                        <span className="text-sm text-[var(--muted-foreground)]">•</span>
                        <span className="text-sm font-medium capitalize">
                          {alert.change.change_type.replace('_', ' ')}
                        </span>
                      </>
                    )}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                    {!alert.is_read && (
                      <span className="ml-auto text-xs bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  {alert.change && (
                    <p className="text-sm text-[var(--foreground)] mb-3">
                      {alert.change.description}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Link href={`/dashboard/competitors/${alert.competitor_id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {!alert.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

