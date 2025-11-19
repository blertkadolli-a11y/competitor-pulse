# Database Schema Setup Guide

## ✅ Files Created

I've created a complete competitor tracking system with:

### 1. **Database Schema** (`supabase/competitor_schema.sql`)
   - `competitors` table with `id`, `user_id`, `name`, `website`, `social_links` (jsonb), `created_at`
   - `snapshots` table with `id`, `competitor_id`, `html_content`, `changes_summary` (jsonb), `created_at`
   - `alerts` table with `id`, `competitor_id`, `type`, `message`, `created_at`, `is_read`
   - Row Level Security (RLS) policies
   - Indexes for performance
   - Triggers for `updated_at` timestamps

### 2. **TypeScript Types** (`lib/types.ts`)
   - Fully typed interfaces for all entities
   - `Competitor`, `Snapshot`, `Alert` interfaces
   - `SocialLinks`, `ChangesSummary`, `PricingChange`, `FeatureChange` helper types

### 3. **Supabase Helper Functions** (`lib/supabase/competitors.ts`)
   - **Competitors CRUD:**
     - `getAllCompetitors()` - Get all competitors for logged-in user
     - `getCompetitorById(id)` - Get single competitor
     - `createCompetitor(name, website, socialLinks?)` - Create new competitor
     - `updateCompetitor(id, updates)` - Update competitor
     - `deleteCompetitor(id)` - Delete competitor
   
   - **Snapshots:**
     - `getSnapshotsByCompetitor(competitorId)` - Get all snapshots for a competitor
     - `createSnapshot(competitorId, htmlContent?, changesSummary?)` - Create snapshot
   
   - **Alerts:**
     - `getAlertsByCompetitor(competitorId)` - Get alerts for a competitor
     - `getAllAlerts(unreadOnly?)` - Get all alerts (optionally unread only)
     - `createAlert(competitorId, type, message)` - Create alert
     - `markAlertAsRead(id)` - Mark single alert as read
     - `markAllAlertsAsRead(competitorId?)` - Mark all alerts as read

### 4. **UI Pages**

   - **Competitor List Page** (`app/dashboard/competitors/page.tsx`)
     - Shows all competitors in a grid
     - Displays name, website, social links
     - "View Details" and "Delete" actions
     - Empty state when no competitors
   
   - **Add Competitor Page** (`app/dashboard/competitors/new/page.tsx`)
     - Form with name and website (required)
     - Social links fields (Twitter, LinkedIn, Facebook, Instagram, YouTube, TikTok)
     - Validates and normalizes URLs
     - Saves to database using helper functions
   
   - **Competitor Detail Page** (`app/dashboard/competitors/[id]/page.tsx`)
     - Tabbed interface: Overview, Snapshots, Alerts
     - Overview shows stats (total snapshots, alerts, unread alerts)
     - Snapshots tab shows all snapshots with change summaries
     - Alerts tab shows all alerts with read/unread status
     - Mark alerts as read functionality

## 📋 Setup Instructions

### Step 1: Run the Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/zbvjupvrozyrvmkrgacg
2. Click **SQL Editor** in the left sidebar
3. Open the file `supabase/competitor_schema.sql` from your project
4. Copy the **entire contents** of the file
5. Paste into the SQL Editor in Supabase
6. Click **Run** (or press Cmd/Ctrl + Enter)

This will:
- Create/update the tables if they don't exist
- Set up RLS policies
- Create indexes
- Set up triggers

### Step 2: Verify Tables Were Created

1. In Supabase Dashboard, go to **Table Editor**
2. You should see:
   - `competitors` table
   - `snapshots` table
   - `alerts` table

### Step 3: Test the Pages

1. Go to: http://localhost:3000/dashboard/competitors
2. Click **"Add Competitor"**
3. Fill in the form:
   - Name: Test Competitor
   - Website: example.com
   - (Optional) Add social links
4. Click **"Add Competitor"**
5. You should see the competitor in the list
6. Click **"View Details"** to see the detail page

## 🔧 TypeScript Types

All types are defined in `lib/types.ts`:

```typescript
// Competitor with social links stored as JSONB
Competitor {
  id: string;
  user_id: string;
  name: string;
  website: string;
  social_links: SocialLinks;
  created_at: string;
  updated_at: string;
}

// Snapshot with changes summary
Snapshot {
  id: string;
  competitor_id: string;
  html_content?: string;
  changes_summary: ChangesSummary;
  created_at: string;
}

// Alert with type and read status
Alert {
  id: string;
  competitor_id: string;
  type: 'pricing' | 'content' | 'feature' | 'other';
  message: string;
  created_at: string;
  is_read: boolean;
}
```

## 📦 Supabase Helper Functions

All CRUD operations are in `lib/supabase/competitors.ts`:

```typescript
// Get all competitors
const competitors = await getAllCompetitors();

// Create competitor
const competitor = await createCompetitor(
  'Acme Inc',
  'https://acme.com',
  { twitter: 'https://twitter.com/acme', linkedin: 'https://linkedin.com/company/acme' }
);

// Get competitor details
const competitor = await getCompetitorById(id);

// Get snapshots
const snapshots = await getSnapshotsByCompetitor(competitorId);

// Get alerts
const alerts = await getAlertsByCompetitor(competitorId);

// Mark alert as read
await markAlertAsRead(alertId);
```

## 🎨 UI Pages

### Competitors List (`/dashboard/competitors`)
- Grid layout showing all competitors
- Each card shows: name, website, social links, "Added X ago"
- Actions: View Details, Delete

### Add Competitor (`/dashboard/competitors/new`)
- Clean form with validation
- Website URL normalization (adds https:// if missing)
- Social links are optional

### Competitor Detail (`/dashboard/competitors/[id]`)
- **Overview Tab:** Stats cards (snapshots, alerts, unread)
- **Snapshots Tab:** List of all snapshots with change summaries
- **Alerts Tab:** List of alerts with read/unread indicators

## ✨ Features

- ✅ Fully typed TypeScript interfaces
- ✅ Row Level Security (RLS) protecting user data
- ✅ Automatic user_id assignment (uses logged-in user's profile)
- ✅ Social links stored as JSONB (flexible schema)
- ✅ Changes summary stored as JSONB (supports various change types)
- ✅ Alert read/unread status tracking
- ✅ Responsive UI with Tailwind CSS
- ✅ Error handling and loading states
- ✅ Empty states for better UX

## 🚀 Next Steps

After running the schema, you can:
1. Add competitors via the UI
2. Create snapshots programmatically (via API or scraping)
3. Create alerts when changes are detected
4. View everything in the dashboard

The system is ready to use! 🎉

