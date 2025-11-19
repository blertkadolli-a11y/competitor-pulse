'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getCompetitorById,
  getSnapshotsByCompetitor,
  getAlertsByCompetitor,
  markAlertAsRead,
  markAllAlertsAsRead,
} from '@/lib/supabase/competitors';
import { Competitor, Snapshot, Alert } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';

export default function CompetitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'snapshots' | 'alerts'>('overview');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchCompetitorData();
    }
  }, [id]);

  const fetchCompetitorData = async () => {
    try {
      setLoading(true);
      setError('');
      const [competitorData, snapshotsData, alertsData] = await Promise.all([
        getCompetitorById(id),
        getSnapshotsByCompetitor(id),
        getAlertsByCompetitor(id),
      ]);

      if (!competitorData) {
        setError('Competitor not found');
        return;
      }

      setCompetitor(competitorData);
      setSnapshots(snapshotsData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Error fetching competitor data:', err);
      setError(err.message || 'Failed to load competitor data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts(alerts.map((alert) => (alert.id === alertId ? { ...alert, is_read: true } : alert)));
    } catch (err: any) {
      console.error('Error marking alert as read:', err);
      alert(err.message || 'Failed to mark alert as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsAsRead(id);
      setAlerts(alerts.map((alert) => ({ ...alert, is_read: true })));
    } catch (err: any) {
      console.error('Error marking all alerts as read:', err);
      alert(err.message || 'Failed to mark alerts as read');
    }
  };

  const handleScanNow = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      setError('');

      const response = await fetch(`/api/competitors/${id}/scan`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to scan competitor';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setScanResult({
        success: true,
        message: data.message || 'Scan completed successfully',
      });

      // Refresh snapshots and alerts
      await fetchCompetitorData();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setScanResult(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error scanning competitor:', err);
      setScanResult({
        success: false,
        message: err.message || 'Failed to scan competitor',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      setReportResult(null);
      setError('');

      const response = await fetch(`/api/competitors/${id}/generate-report`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to generate report';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setReportResult({
        success: true,
        message: `Report "${data.title}" generated successfully!`,
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setReportResult(null);
      }, 5000);

      // Optionally redirect to reports page
      setTimeout(() => {
        router.push('/dashboard/reports');
      }, 2000);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setReportResult({
        success: false,
        message: err.message || 'Failed to generate report',
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const getAlertTypeIcon = (type: Alert['type']) => {
    const icons: Record<Alert['type'], string> = {
      pricing: '💰',
      content: '📝',
      feature: '✨',
      other: '📄',
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

  if (error || !competitor) {
    return (
      <div>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold mb-2">{error || 'Competitor not found'}</h3>
          <Link href="/dashboard/competitors">
            <Button>Back to Competitors</Button>
          </Link>
        </div>
      </div>
    );
  }

  const unreadAlertsCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/competitors"
          className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block"
        >
          ← Back to Competitors
        </Link>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{competitor.name}</h1>
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline block mb-4"
                >
                  {competitor.website}
                </a>
                {competitor.social_links && Object.keys(competitor.social_links).length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {Object.entries(competitor.social_links).map(([platform, url]) => {
                      if (!url) return null;
                      return (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] capitalize"
                        >
                          {platform}
                        </a>
                      );
                    })}
                  </div>
                )}
                <p className="text-sm text-[var(--muted-foreground)]">
                  Added {formatDistanceToNow(new Date(competitor.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <div className="flex gap-2">
                  <Button
                    onClick={handleScanNow}
                    disabled={scanning}
                    variant="secondary"
                    className="min-w-[120px]"
                  >
                    {scanning ? 'Scanning...' : 'Scan Now'}
                  </Button>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={generatingReport || snapshots.length === 0}
                    className="min-w-[140px]"
                  >
                    {generatingReport ? 'Generating...' : 'Generate AI Report'}
                  </Button>
                </div>
                {scanResult && (
                  <div
                    className={`text-sm ${
                      scanResult.success
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {scanResult.message}
                  </div>
                )}
                {reportResult && (
                  <div
                    className={`text-sm ${
                      reportResult.success
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {reportResult.message}
                  </div>
                )}
                {snapshots.length === 0 && (
                  <div className="text-xs text-[var(--muted-foreground)]">
                    Scan the competitor first to generate a report
                  </div>
                )}
              </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'overview'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
              }
            `}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'snapshots'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
              }
            `}
          >
            Snapshots ({snapshots.length})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'alerts'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
              }
            `}
          >
            Alerts ({alerts.length})
            {unreadAlertsCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <Card>
              <div className="text-sm text-[var(--muted-foreground)] mb-1">Total Snapshots</div>
              <div className="text-3xl font-bold">{snapshots.length}</div>
            </Card>
            <Card>
              <div className="text-sm text-[var(--muted-foreground)] mb-1">Total Alerts</div>
              <div className="text-3xl font-bold">{alerts.length}</div>
            </Card>
            <Card>
              <div className="text-sm text-[var(--muted-foreground)] mb-1">Unread Alerts</div>
              <div className="text-3xl font-bold">{unreadAlertsCount}</div>
            </Card>
            <Card>
              <div className="text-sm text-[var(--muted-foreground)] mb-1">Last Scan</div>
              <div className="text-sm font-semibold">
                {snapshots.length > 0
                  ? formatDistanceToNow(new Date(snapshots[0].created_at), { addSuffix: true })
                  : 'Never'}
              </div>
              {snapshots.length > 0 && (
                <div className="text-xs text-[var(--muted-foreground)] mt-1">
                  {format(new Date(snapshots[0].created_at), 'PPp')}
                </div>
              )}
            </Card>
          </div>

          {/* Latest Alerts */}
          {alerts.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Latest Alerts</h3>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      !alert.is_read
                        ? 'border-[var(--primary)] bg-[var(--accent)]'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl">{getAlertTypeIcon(alert.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize text-sm">{alert.type}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                          {!alert.is_read && (
                            <span className="text-xs bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-0.5 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--foreground)]">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {alerts.length > 5 && (
                  <div className="text-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('alerts')}
                    >
                      View all {alerts.length} alerts →
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Recent Snapshots */}
          {snapshots.length > 0 && (
            <Card className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Recent Snapshots</h3>
              <div className="space-y-3">
                {snapshots.slice(0, 3).map((snapshot) => {
                  const hasChanges =
                    snapshot.changes_summary &&
                    Object.keys(snapshot.changes_summary).length > 0;
                  return (
                    <div
                      key={snapshot.id}
                      className="p-3 rounded-lg border border-[var(--border)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm">
                            {format(new Date(snapshot.created_at), 'PPp')}
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {formatDistanceToNow(new Date(snapshot.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        {hasChanges && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                            Changes Detected
                          </span>
                        )}
                      </div>
                      {hasChanges &&
                        snapshot.changes_summary?.text_changes &&
                        snapshot.changes_summary.text_changes.length > 0 && (
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {snapshot.changes_summary.text_changes[0]}
                          </div>
                        )}
                    </div>
                  );
                })}
                {snapshots.length > 3 && (
                  <div className="text-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('snapshots')}
                    >
                      View all {snapshots.length} snapshots →
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          {snapshots.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📸</div>
                <h3 className="text-lg font-semibold mb-2">No snapshots yet</h3>
                <p className="text-[var(--muted-foreground)]">
                  Snapshots will appear here once we start monitoring this competitor
                </p>
              </div>
            </Card>
          ) : (
            snapshots.map((snapshot) => (
              <Card key={snapshot.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold mb-1">
                      Snapshot from {format(new Date(snapshot.created_at), 'PPp')}
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatDistanceToNow(new Date(snapshot.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {snapshot.changes_summary &&
                  Object.keys(snapshot.changes_summary).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Changes Detected:</h4>
                      <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                        {snapshot.changes_summary.text_changes &&
                          snapshot.changes_summary.text_changes.length > 0 && (
                            <div>
                              <strong>Text:</strong> {snapshot.changes_summary.text_changes.join(', ')}
                            </div>
                          )}
                        {snapshot.changes_summary.pricing_changes &&
                          snapshot.changes_summary.pricing_changes.length > 0 && (
                            <div>
                              <strong>Pricing:</strong>{' '}
                              {snapshot.changes_summary.pricing_changes
                                .map((p: any) => p.description)
                                .join(', ')}
                            </div>
                          )}
                        {snapshot.changes_summary.feature_changes &&
                          snapshot.changes_summary.feature_changes.length > 0 && (
                            <div>
                              <strong>Features:</strong>{' '}
                              {snapshot.changes_summary.feature_changes
                                .map((f: any) => f.feature)
                                .join(', ')}
                            </div>
                          )}
                      </div>
                    </div>
                  )}
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔔</div>
                <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
                <p className="text-[var(--muted-foreground)]">
                  Alerts will appear here when changes are detected
                </p>
              </div>
            </Card>
          ) : (
            <>
              {unreadAlertsCount > 0 && (
                <div className="flex justify-end mb-4">
                  <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                    Mark all as read
                  </Button>
                </div>
              )}
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={!alert.is_read ? 'border-[var(--primary)] bg-[var(--accent)]' : ''}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{getAlertTypeIcon(alert.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold capitalize">{alert.type}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                        {!alert.is_read && (
                          <span className="ml-auto text-xs bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--foreground)] mb-3">{alert.message}</p>
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAlertRead(alert.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
