'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAllCompetitors, deleteCompetitor } from '@/lib/supabase/competitors';
import { Competitor } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function CompetitorsListPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllCompetitors();
      setCompetitors(data);
    } catch (err: any) {
      console.error('Error fetching competitors:', err);
      setError(err.message || 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competitor? This will also delete all snapshots and alerts.')) {
      return;
    }

    try {
      await deleteCompetitor(id);
      setCompetitors(competitors.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting competitor:', err);
      alert(err.message || 'Failed to delete competitor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted-foreground)]">Loading competitors...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Competitors</h1>
          <p className="text-[var(--muted-foreground)]">
            Manage and track all your competitors
          </p>
        </div>
        <Link href="/dashboard/competitors/new">
          <Button>Add Competitor</Button>
        </Link>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800">
          <div className="text-red-600 dark:text-red-400">{error}</div>
        </Card>
      )}

      {competitors.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2">No competitors yet</h3>
            <p className="text-[var(--muted-foreground)] mb-4">
              Start tracking your competitors by adding your first one
            </p>
            <Link href="/dashboard/competitors/new">
              <Button>Add Competitor</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map((competitor) => (
            <Card key={competitor.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{competitor.name}</h3>
                  <a
                    href={competitor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--primary)] hover:underline block mb-2"
                  >
                    {competitor.website}
                  </a>
                </div>
              </div>

              {/* Social Links */}
              {competitor.social_links && Object.keys(competitor.social_links).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(competitor.social_links).map(([platform, url]) => {
                    if (!url) return null;
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] capitalize"
                      >
                        {platform}
                      </a>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Added {formatDistanceToNow(new Date(competitor.created_at), { addSuffix: true })}
              </p>

              <div className="flex gap-2">
                <Link href={`/dashboard/competitors/${competitor.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full" size="sm">
                    View Details
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(competitor.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
