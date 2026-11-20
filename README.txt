BIODIVERSITY SPECIES EXPLORER — SUPABASE VERSION

IMPORTANT: Keep index.html, style.css (not needed in this build; styles are inside index.html), script.js, and config.js together in one folder.

ONE-TIME SUPABASE SETUP
1. Open https://supabase.com/dashboard and select your project.
2. Open SQL Editor > New query.
3. Open SETUP_SUPABASE.sql from this folder, copy all its contents, paste into SQL Editor, then click Run.
4. Open Storage. Create a bucket named exactly: species-images (if it does not already exist).
5. Open the species-images bucket settings and turn ON Public bucket, then Save. This allows visitors to view images; uploads still require login and storage policies.
6. Open Authentication > Users. You said you already created your admin user, so keep that account.

OPEN THE WEBSITE
1. Extract the ZIP into a new folder.
2. Keep all files together.
3. Double-click index.html while connected to the internet. The Supabase JavaScript library loads from a CDN.
4. Public visitors can browse the species list.
5. To manage species, click Manage Species and sign in using the email and password of your Supabase Authentication user.
6. Add/Edit/Delete and image uploads require that sign-in. Images must be JPG, PNG, or WEBP and at most 5 MB.

DATABASE BEHAVIOR
- Species records are saved in Supabase and shared across devices.
- Favorites are saved only in the current browser.
- The publishable key in config.js is intended for browser use. Do NOT place a service_role key or secret key in website files.
- Row Level Security is enabled. Any authenticated Supabase user currently has permission to manage species; do not create public sign-up links if you want only your own account to manage the catalog.

If the page says it cannot connect, check that SETUP_SUPABASE.sql ran successfully and that the project URL/key in config.js match your Supabase project.
