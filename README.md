# 🐀 NYC Deli Rats 2026

> "A highly organized New Yorker built a military-grade spreadsheet and then yelled at everyone until they used it correctly."

## What This Is

A single-season, pre-event operational system for **Burning Man 2026** camp coordination. This system:

- ✅ Collects structured camper data
- ✅ Translates data into real-world spatial + operational decisions
- ✅ Assigns responsibilities across build, kitchen, and strike
- ✅ Eliminates ambiguity before arrival

This is **NOT**:
- ❌ A social platform
- ❌ A live event tool
- ❌ A post-event archive

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/nyc-deli-rats.git
cd nyc-deli-rats
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

4. Set up the database:
   - Go to your Supabase project
   - Run the SQL migration in `supabase/migrations/001_initial_schema.sql`

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## System Architecture

### Primary Modules

| Module | Route | Purpose |
|--------|-------|---------|
| Camper Intake | `/intake` | Collect structured camper data |
| Camp Layout | `/layout-view` | Visual camp placement system |
| Kitchen Ops | `/kitchen` | Kitchen roles and shifts |
| Schedule | `/schedule` | View and manage assignments |
| Build Week | `/build-week` | Early arrival coordination |
| Admin | `/admin` | System administration |

### Data Flow

```
Intake → feeds EVERYTHING
   ↓
Layout ← depends on Intake (dimensions + needs)
Schedule ← depends on Intake (availability + participation)
Kitchen ← depends on Schedule
Build Week ← depends on Intake + Tasks
```

**No module operates in isolation.**

## Database Schema

Key tables:
- `campers` - All camper data (identity, shelter, participation)
- `kitchen_roles` - Kitchen role definitions
- `kitchen_shifts` - Scheduled shifts
- `schedule_assignments` - Camper-to-shift assignments
- `build_tasks` - Build week tasks
- `checklist_templates` - Reusable checklists
- `system_settings` - Configuration values

See `supabase/migrations/001_initial_schema.sql` for complete schema.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin ops) | No |

## Domain Configuration

Current domain: `nycdelirats2026.com`

For GoDaddy DNS:
1. Add A record: `@` → Vercel IP
2. Add CNAME: `www` → `cname.vercel-dns.com`

Or use Vercel nameservers for automatic DNS.

## Critical Dates

| Date | Event |
|------|-------|
| Aug 1, 2026 | Registration Deadline |
| Aug 23, 2026 | Build Week Starts |
| Aug 30, 2026 | Burn Starts |
| Sep 7, 2026 | Exodus |

## System Lifecycle

This system is **temporary**. Required features:

- Full system sunset toggle
- Archive or export data
- Disable all forms
- Convert to read-only OR delete

Toggle available in Admin → Settings → Danger Zone.

## Tone Guidelines

The system maintains a consistent tone:
- Direct, blunt, slightly hostile but funny
- Removes ambiguity through attitude
- Example microcopy:
  - "If you guess, we will treat it as fact."
  - "Measure your tent. Not vibes."
  - "This is how we avoid chaos. Help us help you."

See `src/lib/tone.ts` for the complete copy system.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Private project for NYC Deli Rats camp.

---

🥪 **Remember**: Sandwiches don't make themselves. Neither does camp infrastructure.
