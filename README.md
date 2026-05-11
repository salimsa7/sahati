# Sahati Gym Management System

A web application for a gym with three distinct user roles (Member, Gym Staff, Admin) built with Astro and Supabase.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (>= 22.12.0)
- pnpm (recommended) or npm/yarn
- A Supabase project

### 2. Database Setup
1. Go to your Supabase project dashboard.
2. Open the **SQL Editor**.
3. Create a new query and paste the contents of `supabase_schema.sql` (found in the project root).
4. Run the query to create tables and set up RLS policies.
5. In the **Authentication** settings:
   - Ensure "Email/Password" provider is enabled.
   - (Optional but recommended) Disable "Confirm Email" if you want instant registration for testing.

### 3. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Installation & Development
```sh
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## 🏗️ Project Structure
- `/src/pages`: Contains the routes for members, staff, and admin.
- `/src/api`: Server-side API routes for authentication and data management.
- `/src/middleware.ts`: Handles authentication and role-based access control.
- `supabase_schema.sql`: Database schema and RLS policies.

## 👥 User Roles
- **Member**: Can register, view dashboard, show QR code, and change password.
- **Gym Staff**: Can verify QR codes (via webcam or manual entry), search members, and renew subscriptions.
- **Admin**: Full CRUD access to members and staff accounts, management of subscriptions, and viewing access logs.

## 🎨 Tech Stack
- **Framework**: [Astro](https://astro.build/)
- **Backend**: [Supabase](https://supabase.com/) (Auth, PostgreSQL, RLS)
- **QR Scanning**: [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- **QR Generation**: [qrcode](https://www.npmjs.com/package/qrcode)
