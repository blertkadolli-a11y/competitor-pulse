'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { createCompetitor } from '@/lib/supabase/competitors';
import { SocialLinks } from '@/lib/types';
import { canAddCompetitor } from '@/lib/subscriptions/check';

export default function AddCompetitorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscriptionCheck, setSubscriptionCheck] = useState<{
    allowed: boolean;
    reason?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    twitter: '',
    linkedin: '',
    facebook: '',
    instagram: '',
    youtube: '',
    tiktok: '',
  });

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const check = await canAddCompetitor();
    setSubscriptionCheck(check);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check subscription limit
    const check = await canAddCompetitor();
    if (!check.allowed) {
      setError(check.reason || 'Cannot add competitor');
      return;
    }

    setLoading(true);

    try {
      // Build social links object (only include non-empty values)
      const socialLinks: SocialLinks = {};
      if (formData.twitter.trim()) socialLinks.twitter = formData.twitter.trim();
      if (formData.linkedin.trim()) socialLinks.linkedin = formData.linkedin.trim();
      if (formData.facebook.trim()) socialLinks.facebook = formData.facebook.trim();
      if (formData.instagram.trim()) socialLinks.instagram = formData.instagram.trim();
      if (formData.youtube.trim()) socialLinks.youtube = formData.youtube.trim();
      if (formData.tiktok.trim()) socialLinks.tiktok = formData.tiktok.trim();

      await createCompetitor(
        formData.name,
        formData.website,
        Object.keys(socialLinks).length > 0 ? socialLinks : undefined
      );

      router.push('/dashboard/competitors');
      router.refresh();
    } catch (err: any) {
      console.error('Error creating competitor:', err);
      setError(err.message || 'Failed to add competitor');
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/competitors"
          className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block"
        >
          ← Back to Competitors
        </Link>
        <h1 className="text-3xl font-bold mb-2">Add Competitor</h1>
        <p className="text-[var(--muted-foreground)]">
          Track a new competitor to monitor their website changes
        </p>
      </div>

      <Card className="max-w-2xl">
        {subscriptionCheck && !subscriptionCheck.allowed && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Plan Limit Reached
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  {subscriptionCheck.reason}
                </p>
                <Link href="/pricing">
                  <Button variant="secondary" size="sm">
                    Upgrade Plan
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Competitor Name *"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Acme Inc."
          />

          <Input
            label="Website URL *"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            required
            placeholder="e.g., acme.com or https://acme.com"
          />

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--foreground)]">Social Links (Optional)</h3>

            <Input
              label="Twitter / X"
              type="url"
              value={formData.twitter}
              onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
              placeholder="https://twitter.com/acme"
            />

            <Input
              label="LinkedIn"
              type="url"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              placeholder="https://linkedin.com/company/acme"
            />

            <Input
              label="Facebook"
              type="url"
              value={formData.facebook}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              placeholder="https://facebook.com/acme"
            />

            <Input
              label="Instagram"
              type="url"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder="https://instagram.com/acme"
            />

            <Input
              label="YouTube"
              type="url"
              value={formData.youtube}
              onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
              placeholder="https://youtube.com/@acme"
            />

            <Input
              label="TikTok"
              type="url"
              value={formData.tiktok}
              onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
              placeholder="https://tiktok.com/@acme"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading || (subscriptionCheck && !subscriptionCheck.allowed)}
              className="flex-1"
            >
              {loading ? 'Adding...' : 'Add Competitor'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
