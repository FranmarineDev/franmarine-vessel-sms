# Email templates

Paste each into **Supabase → Authentication → Emails → Templates** (select the template, replace the body, save).

| Supabase template | File | Subject to set |
|---|---|---|
| Confirm sign up | confirm-signup.html | Confirm your Franmarine Vessel SMS account |
| Invite user | invite.html | You've been added to the Franmarine Vessel SMS |
| Reset password | reset-password.html | Reset your Vessel SMS password |
| Magic link | magic-link.html | Your Vessel SMS sign-in link |

Sender: **Project Settings → Authentication → SMTP Settings** → Custom SMTP on, sender name
`Franmarine Vessel SMS`, sender email `noreply@franmarine.com.au`, credentials from Resend (domain
verified by IT via DNS) or a Microsoft 365 mailbox with SMTP AUTH. Without custom SMTP, Supabase's
built-in sender is limited to a few emails per hour and shows a supabase.io address.
