'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client';
import { Report, CompetitorReport } from '@/lib/types';
import { format } from 'date-fns';
import { getAllCompetitorReports } from '@/lib/supabase/reports';
import Link from 'next/link';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [competitorReports, setCompetitorReports] = useState<CompetitorReport[]>([]);
  const [competitors, setCompetitors] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | CompetitorReport | null>(null);
  const [reportType, setReportType] = useState<'all' | 'daily' | 'weekly' | 'competitor'>('all');
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    fetchReports();
    fetchCompetitors();
  }, []);

  useEffect(() => {
    if (reportType === 'competitor') {
      fetchCompetitorReports();
    } else {
      fetchReports();
    }
  }, [reportType, selectedCompetitor, dateFrom, dateTo]);

  const fetchCompetitors = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from('competitors')
        .select('id, name')
        .eq('user_id', profile.id)
        .order('name', { ascending: true });

      setCompetitors(data || []);
    } catch (error) {
      console.error('Error fetching competitors:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) return;

      let query = supabase
        .from('reports')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (reportType === 'daily') {
        query = query.eq('report_type', 'daily');
      } else if (reportType === 'weekly') {
        query = query.eq('report_type', 'weekly');
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitorReports = async () => {
    try {
      setLoading(true);
      const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
      const dateToObj = dateTo ? new Date(dateTo) : undefined;
      
      const reports = await getAllCompetitorReports(
        selectedCompetitor || undefined,
        dateFromObj,
        dateToObj
      );
      
      setCompetitorReports(reports);
    } catch (error) {
      console.error('Error fetching competitor reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (type: 'daily' | 'weekly') => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Please sign in to generate reports');
        return;
      }

      setLoading(true);

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
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

      const newReport = data;
      setReports([newReport, ...reports]);
      setSelectedReport(newReport);
      setReportType(type);
    } catch (error: any) {
      console.error('Error generating report:', error);
      alert(error.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedCompetitor('');
    setDateFrom('');
    setDateTo('');
  };

  if (loading && reports.length === 0 && competitorReports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  const allReports = reportType === 'competitor' ? competitorReports : reports;
  const hasReports = allReports.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports</h1>
          <p className="text-[var(--muted-foreground)]">
            View and generate competitor activity reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => generateReport('daily')}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Daily Report'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => generateReport('weekly')}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Weekly Report'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1.5">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
            >
              <option value="all">All Reports</option>
              <option value="daily">Daily Reports</option>
              <option value="weekly">Weekly Reports</option>
              <option value="competitor">AI Competitor Reports</option>
            </select>
          </div>

          {reportType === 'competitor' && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1.5">Competitor</label>
              <select
                value={selectedCompetitor}
                onChange={(e) => setSelectedCompetitor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
              >
                <option value="">All Competitors</option>
                {competitors.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium mb-1.5">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium mb-1.5">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {(selectedCompetitor || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {!hasReports ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
            <p className="text-[var(--muted-foreground)] mb-4">
              {reportType === 'competitor'
                ? 'Generate AI reports from competitor detail pages'
                : 'Generate a report to see competitor activity summaries'}
            </p>
            {reportType !== 'competitor' && (
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="secondary" 
                  onClick={() => generateReport('daily')}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Daily Report'}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => generateReport('weekly')}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Weekly Report'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="md:col-span-1">
            <h2 className="text-lg font-semibold mb-4">
              {reportType === 'competitor' ? 'AI Reports' : 'Recent Reports'}
            </h2>
            <div className="space-y-2">
              {allReports.map((report) => {
                const isCompetitorReport = 'title' in report;
                return (
                  <Card
                    key={report.id}
                    className={`cursor-pointer transition-colors ${
                      selectedReport?.id === report.id
                        ? 'border-[var(--primary)] bg-[var(--accent)]'
                        : 'hover:border-[var(--border)]'
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {isCompetitorReport
                          ? report.title
                          : report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {format(new Date(report.created_at), 'MMM d')}
                      </span>
                    </div>
                    {!isCompetitorReport && 'date_range_start' in report && (
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {format(new Date(report.date_range_start), 'MMM d')} -{' '}
                        {format(new Date(report.date_range_end), 'MMM d')}
                      </div>
                    )}
                    {isCompetitorReport && (
                      <div className="text-xs text-[var(--muted-foreground)] mt-1">
                        AI Generated
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Report Content */}
          <div className="md:col-span-2">
            {selectedReport ? (
              <Card>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        {'title' in selectedReport
                          ? selectedReport.title
                          : `${selectedReport.report_type.charAt(0).toUpperCase() + selectedReport.report_type.slice(1)} Report`}
                      </h2>
                      {'date_range_start' in selectedReport ? (
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {format(new Date(selectedReport.date_range_start), 'PP')} -{' '}
                          {format(new Date(selectedReport.date_range_end), 'PP')}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Generated {format(new Date(selectedReport.created_at), 'PPp')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {format(new Date(selectedReport.created_at), 'PPp')}
                    </span>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-[var(--foreground)]">
                    {selectedReport.content}
                  </div>
                </div>
                {'competitor_id' in selectedReport && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <Link href={`/dashboard/competitors/${selectedReport.competitor_id}`}>
                      <Button variant="ghost" size="sm">
                        View Competitor →
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            ) : (
              <Card>
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="text-lg font-semibold mb-2">Select a report</h3>
                  <p className="text-[var(--muted-foreground)]">
                    Choose a report from the list to view its content
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
