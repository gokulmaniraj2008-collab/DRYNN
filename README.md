# DRYNN — Custom Print Clothing

DRYNN is a custom-print clothing storefront built with Next.js 14 and React 18. The application includes product browsing, custom-order experiences, cart and checkout flows, customer account/order areas, group ordering, and Supabase-backed authentication and data features.

## Features

- Browse the DRYNN clothing storefront and product catalogue.
- Explore custom-print/studio experiences and contact information.
- Add products to the cart.
- Sign in with Google through Supabase Authentication.
- **Guest demo login:** choose **Continue as Guest — Demo** on the login screen to explore the store without creating a Supabase Auth account.
- Demo mode is read-only for real transactions: checkout and group-order create/join actions are blocked until the visitor signs in with Google.
- Exit demo mode returns to the intro screen without signing out a real Supabase account.
- Group ordering, order/account areas, and order tracking are part of the existing application.

> **Demo mode is for browsing and preview only.** It does not create a customer account, submit real orders, or authorize payments. Use Google sign-in for account-based actions and real checkout.

## Tech stack

- Next.js 14
- React 18
- Supabase JavaScript client and Authentication
- Razorpay integration
- Vercel deployment
- Google Fonts: Bebas Neue and DM Sans

## Requirements

- Node.js compatible with Next.js 14
- npm
- A Supabase project configured for the application

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/gokulmaniraj2008-collab/DRYNN.git
   cd DRYNN
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root and add the Supabase project URL and public anon key:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Add other integration variables only when you configure and use those integrations. The application source references these optional settings:

   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK`
   - `NEXT_PUBLIC_ADMIN_EMAIL`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

   Never commit `.env.local`, private API keys, service-role keys, or payment secrets. Keep secret credentials in server-side environment variables and your deployment provider's secure settings.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Build the production application |
| `npm run start` | Start the production server after building |
| `npm run lint` | Run the configured Next.js lint command |

## Authentication and demo access

- **Google login:** uses the configured Supabase Authentication provider. Configure the Google provider and its redirect URLs in your Supabase project before testing real sign-in.
- **Guest demo:** available from the login screen through **Continue as Guest — Demo**. It creates only an in-app demo state; it does not create a Supabase user.
- **Real actions:** sign in with Google before attempting real checkout or group-order creation/joining.
- **Demo exit:** use **Exit Demo** in the navigation to return to the intro screen.

## Deploy to Vercel

1. Import this GitHub repository into Vercel.
2. Configure the required Supabase environment variables in the Vercel project settings.
3. Add optional integration settings only if those services are configured.
4. Deploy the project. Vercel can create preview deployments for pull requests and production deployments from the configured production branch.

## Project links

- GitHub: [gokulmaniraj2008-collab/DRYNN](https://github.com/gokulmaniraj2008-collab/DRYNN)
- Live site: [https://drynn-zxx.vercel.app/](https://drynn-zxx.vercel.app/)
