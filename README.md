# CompetitorPulse

A full-featured SaaS application for tracking competitors, monitoring website changes, and getting AI-powered insights.

## Features

- **Competitor Tracking**: Add and manage competitors with their websites and social links
- **24/7 Monitoring**: Automated scraping of competitor websites every 24 hours
- **Change Detection**: Automatically detects text changes, pricing updates, new features, and more
- **AI Summaries**: Get intelligent summaries of competitor activity powered by OpenAI
- **Email Reports**: Receive daily or weekly email reports with competitor insights
- **Alerts**: Get notified when important changes are detected
- **Stripe Integration**: Manage subscriptions and payments
- **Clean UI**: Modern, minimal design with smooth animations

## Tech Stack

- **Next.js 16** (App Router) with TypeScript
- **Supabase** for authentication and database
- **Stripe** for payment processing
- **OpenAI** for AI-powered summaries
- **Tailwind CSS** for styling
- **Framer Motion** for animations

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (see `env.template`):
```bash
cp env.template .env.local
# Fill in your values
```

3. Run database migrations in Supabase (see `supabase/` folder)

4. Start development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Deployment

See `PRE_LAUNCH_CHECKLIST.md` for detailed deployment instructions.

## License

Private - All rights reserved
