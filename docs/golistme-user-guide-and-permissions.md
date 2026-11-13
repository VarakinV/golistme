# GoList.me — User Hierarchy, Permissions, and How-To Guide

**Version:** 2026-11-10 (Phase 1 accepted; Phase 2 starts next)
**Audience:** internal team (support, sales, operations), realtors, and assistants.
**Purpose:** source material for SOPs and end-user documentation.

This guide describes what the product does **today**. Where a behavior is
known to be incomplete or inconsistent, it is marked **Known limitation**.
Section 13 lists them all in one place. When a feature changes, update
this guide in the same change.

---

## Contents

1. Key terms
2. User hierarchy (who is who)
3. Workspaces, memberships, and roles
4. Permissions
5. Navigation map (where things are)
6. Account setup (registration, verification, sign-in)
7. Realtor workflows (listings, media, marketing, QR codes)
8. Team workflows (invitations, permissions, switching, own workspace)
9. Admin workflows (SUPERADMIN and ADMIN)
10. Public visitor experience
11. What happens when you delete something
12. Troubleshooting
13. Known limitations (as of 2026-11-10)

---

## 1. Key terms

| Term | Meaning |
| --- | --- |
| **Platform role** | A property of the user account: `SUPERADMIN`, `ADMIN`, or `USER`. Controls access to the admin area. |
| **Workspace** | A realtor's business space. It owns listings, leads, QR codes, marketing assets, and credits. Shown in the UI as "My Workspace" for the owner, or by the realtor's name for assistants. |
| **Realtor (workspace owner)** | A user who owns a workspace (membership role `OWNER`). |
| **Assistant** | A user who is a member of a workspace they do not own (membership role `ASSISTANT`). Assistants have permissions set by the owner. |
| **Membership** | The link between a user and a workspace, with a role, permissions, and a status (`ACTIVE`, `INVITED`, `REMOVED`). |
| **Active workspace** | The workspace the user is currently working in. Set by login history, the sidebar switcher, or creating a workspace. |
| **Listing** | A property being marketed, with photos, videos, floor plans, marketing assets, a 3D tour link, and QR codes. Also called "order" in some older code and URLs. |
| **Listing status** | `DRAFT` (not public), `ACTIVE` (public), or `SOLD` (public, labelled sold). Free to change between any of them. |
| **Asset** | A generated output: reel (video), flyer (PDF), or social post (image). |
| **QR code** | A reusable code with a display ID such as `Q-000001`. It can be assigned to one listing at a time. Printed copies are physical items. |
| **Printables** | The files generated for a QR code: SVG, PNG, and PDF variants for printing (bare code, rider, and decal layouts). |
| **Assignment** | The link between a QR code and a listing. A QR code can be reassigned; the old assignment is ended, not deleted. |
| **Permission** | A capability granted to an assistant (see section 4). |
| **Welcome credit** | One free credit granted once when a realtor workspace is created. Credits are not spent on anything yet (see section 13). |
| **Verified email** | A realtor must verify their email before creating listings. |

---

## 2. User hierarchy (who is who)

```
Platform
├── SUPERADMIN            Full control: admin area, users, roles, deletion.
├── ADMIN                 Admin area: clients, listings, QR codes, templates, dashboard.
└── USER                  Everyone else. A USER's access depends on their workspace memberships:
    ├── Realtor            Owns a workspace (OWNER). Full control of that workspace.
    ├── Assistant          Member of one or more workspaces (ASSISTANT) with chosen permissions.
    │                      An assistant may also be a realtor (owns a workspace and assists others).
    └── Visitor (no login) Public property pages, QR scans, and contact forms.

Account states (apply to any user):
    Unverified email  → can sign in, but is sent to /verify-email and cannot create listings.
    Suspended         → cannot sign in. Sees /account-suspended with a support form.
    Deleted           → account removed (SUPERADMIN action).
```

### 2.1 What each actor can do at a glance

| Actor | Main area | Can do | Cannot do |
| --- | --- | --- | --- |
| **SUPERADMIN** | `/admin/*` | Everything an ADMIN can, plus manage users: change platform role (USER ↔ ADMIN), suspend/activate, delete users. | Change or delete another SUPERADMIN. Delete their own account. |
| **ADMIN** | `/admin/*` | Manage clients (workspaces), create and view listings for any client, manage QR codes, manage video and social templates, invite assistants to any client workspace. | Manage platform users or roles. |
| **Realtor (OWNER)** | `/portal/*` | Create and manage their listings and marketing assets, QR codes, public pages, invite assistants, set and change assistant permissions, remove assistants, switch workspaces, create their own workspace if they have none. | Change their own role. Remove themselves as owner. Invite another OWNER (not possible). |
| **Assistant** | `/portal/*` | Only what their permissions allow (section 4). Can switch to any workspace they belong to. Can create their own realtor workspace. | Invite or remove team members. Change permissions. Access workspaces they were not invited to. |
| **Visitor** | Public URLs | View an ACTIVE or SOLD property page, scan a QR code, submit the contact or QR lead form. | Access any portal or admin page. |

---

## 3. Workspaces, memberships, and roles

- Each **realtor** has one workspace they own. A user can own at most one
  workspace through the product flows.
- A workspace has **one OWNER**. Invitations are always ASSISTANT
  invitations. The OWNER role cannot be granted to another user in the UI.
- An **assistant** can belong to many workspaces. Each membership has its
  own permissions.
- A **listing** belongs to exactly one workspace. Everyone who works on that
  listing does so through the workspace membership.
- A **QR code** is a reusable asset. It is created by a user (recorded as
  its creator), and is assigned to a listing. When its listing is deleted, the
  QR code is kept and becomes unassigned.

**Membership status:** `ACTIVE` members can work in the workspace.
`REMOVED` members lose access immediately. (The membership row is deleted
when the owner removes an assistant.)

---

## 4. Permissions

### 4.1 The five permissions

| Permission | What it is meant to allow | Default for a new assistant | Current enforcement |
| --- | --- | --- | --- |
| `MANAGE_LISTINGS` | Create, edit, change status of, and delete listings. Upload, delete, and reorder listing media. Add or remove the 3D tour. Create, delete, and reassign QR codes and regenerate QR printables. | On | Enforced across portal UI and API. |
| `GENERATE_MARKETING` | Generate, retry, cancel, and delete reels, flyers, and social posts. Manage the shared reel/flyer source images. | On | Enforced across portal UI and API. |
| `VIEW_LEADS` | See the Leads page and lead details, export leads to CSV, email leads, and see QR-code leads. | On | Enforced on the page and every leads API. |
| `VIEW_ANALYTICS` | See QR scan statistics. | On | Enforced on QR scan stats. Lead counts inside the QR stats dialog require `VIEW_LEADS`. |
| `PURCHASE_CREDITS` | Buy credits for the workspace. | **Off** (must be granted) | **No purchase flow yet** (Phase 7). |

The workspace OWNER always has all five permissions. Permissions are set
per assistant, per workspace. Changing permissions in one workspace does not
affect another.

`VIEW_ANALYTICS` is separate from `VIEW_LEADS` so scan performance can be
shared without exposing personal contact data. It is useful when:
- a marketing assistant reports QR scans and page traffic but should not see
  or contact leads;
- the owner wants to compare which listings or QR placements get scanned
  without giving access to the lead inbox;
- a virtual assistant prepares a weekly scan report while the owner handles
  lead follow-up.

If you do not need that split, grant both permissions; the QR stats dialog
then shows scans and leads together.

### 4.2 Permission matrix by action

Legend: ✓ allowed · ✗ not allowed · ◐ allowed only for part of the data
(see the note under the table).

| Action | Owner | Assistant with the permission | Assistant without the permission | Admin | SUPERADMIN |
| --- | --- | --- | --- | --- | --- |
| Create listing | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ | ✓ (via admin, for a chosen client) | ✓ |
| Edit listing details (Property Info) | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ | ✓ | ✓ |
| Change listing status (Draft/Active/Sold) | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ | ✓ | ✓ |
| Delete listing | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ | Not verified in UI | ✓ (only through user deletion) |
| View listings in the workspace | ✓ | ✓ (any membership) | ✓ | ✓ | ✓ |
| View every listing tab and its content (Property Info, Photos, Videos, Floor Plans, Reels, Flyers, Social Posts, 3D Tour, QR Codes) | ✓ | ✓ (any membership) | ✓ | ✓ | ✓ |
| Download generated reels, flyers, social posts, and QR printables | ✓ | ✓ (any membership) | ✓ | ✓ | ✓ |
| Upload / delete photos, videos, floor plans, attachments; reorder photos | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ | ✓ | ✓ |
| Add or delete 3D Virtual Tour link | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ | ✓ | ✓ |
| Generate Reels (Remotion) | ✓ | `GENERATE_MARKETING` → ✓ | ✗ view-only, permission dialog | ✓ | ✓ |
| Generate Flyers | ✓ | `GENERATE_MARKETING` → ✓ | ✗ view-only, permission dialog | ✓ | ✓ |
| Generate Social Posts | ✓ | `GENERATE_MARKETING` → ✓ | ✗ view-only, permission dialog | ✓ | ✓ |
| Retry, cancel, render, regenerate generated assets | ✓ | `GENERATE_MARKETING` → ✓ | ✗ | ✓ | ✓ |
| Delete a reel, flyer, or social post | ✓ | `GENERATE_MARKETING` → ✓ | ✗ | ✓ | ✓ |
| Upload, delete, or reorder reel/flyer source images | ✓ | `GENERATE_MARKETING` → ✓ | ✗ | ✓ | ✓ |
| Create a QR code for a listing | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ permission dialog, API 403 | ✓ | ✓ |
| Regenerate QR printables | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ | ✓ | ✓ |
| Reassign a QR code | ✓ | `MANAGE_LISTINGS` → ✓ (creator rule applies) | ✗ | ✓ | ✓ |
| Delete a QR code | ✓ | `MANAGE_LISTINGS` → ✓ (creator or assigned workspace member) | ✗ | ✓ | ✓ |
| View QR scan statistics | ✓ | `VIEW_ANALYTICS` → ✓ | ✗ | ✓ | ✓ |
| View QR leads in the stats dialog | ✓ | `VIEW_LEADS` → ✓ | ✗ | ✓ | ✓ |
| Turn weekly QR stats on/off | ✓ | `MANAGE_LISTINGS` → ✓ | ✗ | ✓ | ✓ |
| View, search, filter, and export leads | ✓ | `VIEW_LEADS` → ✓ | ✗ | ✓ | ✓ |
| Email a lead from the lead page | ✓ | `VIEW_LEADS` → ✓ | ✗ | ✓ | ✓ |
| Invite an assistant | ✓ | ✗ | ✗ | ✓ (admin page) | ✓ (admin page) |
| Set or change an assistant's permissions | ✓ | ✗ | ✗ | API only (no admin page) | API only (no admin page) |
| Remove an assistant from the workspace | ✓ | ✗ | ✗ | API only (no admin page) | API only (no admin page) |
| Switch to another workspace you belong to | ✓ | ✓ | ✓ | n/a | n/a |
| Create your own realtor workspace | ✗ already have one | ✓ (if you do not own one) | ✓ | n/a | n/a |
| Buy credits | ✗ (not built) | ✗ | ✗ | ✗ | ✗ |
| Access `/admin/*` | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage platform users and roles | ✗ | ✗ | ✗ | ✗ | ✓ |
| Delete a user account | ✗ | ✗ | ✗ | ✗ | ✓ |

**Important:** if a permission is not granted, the action stays visible but
the portal shows a "Permission needed" dialog and the API returns
`403 Missing permission`. Assistants can always view listings, every listing
tab, and download generated assets.

`◐` applies only to QR stats: the dialog shows scan counts when the user has
`VIEW_ANALYTICS` and lead counts/leads when the user has `VIEW_LEADS`. The API
strips whichever part the user may not see.

### 4.3 Viewing versus changing

Assistants can always open `/portal/orders` and `/portal/orders/[id]`, see
every tab, and download reels, flyers, social posts, and QR printables.
`MANAGE_LISTINGS` controls changes to listing data, media, the 3D tour, and
QR codes. `GENERATE_MARKETING` controls marketing generation and deletion.
`VIEW_LEADS` controls the Leads area. There are no remaining "any member can
change this" actions in the listing workspace.

---

## 5. Navigation map

### 5.1 Realtor and assistant portal (`/portal`)

**Sidebar**

| Item | Where it goes | Who sees it |
| --- | --- | --- |
| Portal | `/portal` — home with credits, recent listings, and the **+ Create Listing** button | Everyone with a workspace |
| My Listings | `/portal/orders` — all listings with status, Edit Listing, Public Page, and delete | Everyone with a workspace |
| My QR Codes | `/portal/qr-codes` — QR codes you created or that are assigned to your workspace; reassign, stats, delete | Everyone with a workspace |
| **Manage** section | | |
| My Team | `/portal/team` — members, permissions, invitations | Everyone (only the OWNER can invite, edit, or remove) |
| Workspaces | Dropdown to switch workspace | Only if you belong to more than one workspace |
| **+ Create Listing** button (bottom of sidebar) | `/portal/orders/new` | Everyone with a workspace |

**Top bar:** account menu with **My Profile** (`/my-profile`) and **Log out**.

**Yellow bar** under the top bar: "You are in {realtor name}'s workspace."
Shown only when you are an assistant in someone else's workspace.

### 5.2 Listing detail tabs (`/portal/orders/[id]`)

| Tab | Purpose | Visible when |
| --- | --- | --- |
| Property Info | Address, size, year, MLS, price, bedrooms, bathrooms, description; status; Delete listing | Always |
| Photos | Upload and manage photos | Always |
| Videos | Upload and manage videos | Always |
| Floor Plans | Upload floor plans | Always |
| Reels | Reel source images, Generate Reels, reel list | `GENERATE_MARKETING` |
| Flyers | Generate flyers, flyer list | `GENERATE_MARKETING` |
| Social Posts | Generate social posts, post list | `GENERATE_MARKETING` |
| 3D Virtual Tour | Add tour links (Matterport, iGUIDE, others) | Always (see 13 for assistant bug) |
| QR Codes | Generate QR codes for this listing, print files, stats | Always (Generate, reassign, and delete need `MANAGE_LISTINGS`; stats need `VIEW_ANALYTICS` and/or `VIEW_LEADS`) |

PDFs are not offered as a tab. Attachments are not part of the product
flow.

### 5.3 Admin area (`/admin`)

| Item | Where | Who |
| --- | --- | --- |
| Dashboard | `/admin/dashboard` | ADMIN, SUPERADMIN |
| Clients | `/admin/clients` — workspaces; `/admin/clients/[id]` details; `/admin/clients/[id]/users` members and invitations | ADMIN, SUPERADMIN |
| Listings | `/admin/orders` — all listings; `/admin/orders/new` — create for a client | ADMIN, SUPERADMIN |
| QR codes | `/admin/qr-codes` — all QR codes; stats, reassign, weekly stats, delete | ADMIN, SUPERADMIN |
| Video templates | `/admin/templates` | ADMIN, SUPERADMIN |
| Social media templates | `/admin/social-templates` | ADMIN, SUPERADMIN |
| Users | `/admin/users` — roles, status, delete | **SUPERADMIN only** |

Admins who open `/portal` are redirected to `/admin/dashboard`.

---

## 6. Account setup

### 6.1 Register a new realtor account

1. Open `/register`.
2. Enter **First name**, **Last name**, **Email**, **Password**, and
   **Re-enter password**. The password must meet all five rules, shown as a
   checklist:
   - At least 8 characters
   - One lowercase letter
   - One uppercase letter
   - One number
   - One special character
3. Click **Create Account**. The account, your realtor workspace, and your
   **one welcome credit** are created together.
4. You are signed in and taken to `/verify-email`.
5. Open the verification email from GoList.me and click
   **Verify email address** (link valid for 24 hours).
   - If you do not receive it, check spam, then click
     **Resend verification email** on the `/verify-email` page (you can resend
     once per minute).
6. After verification you land in `/portal`.

**Notes**

- Emails are not case-sensitive. `Jane@Example.com` and `jane@example.com`
  are the same account. Registration stores the lowercase form.
- Until your email is verified you cannot create listings (the API returns
  403 "Email verification required").

### 6.2 Sign in

1. Open `/login`.
2. Enter your email and password, then click **Sign In**. Email case does not
   matter.
3. You are taken to `/portal` (or to `/admin/dashboard` for admins).

**Sign in with a magic link instead:** on `/login`, use **Login with Magic
Link**, enter your email, and click **Send Magic Link**. Follow the link in
the email. This works for existing accounts and for emails with a pending
invitation.

**Forgot your password:** use **Forgot password?** on `/login`. (Not covered
by the 2026-11-10 test pass. Test before relying on it in SOPs.)

**Log out:** account menu (top bar) → **Log out**.

### 6.3 Suspended accounts

If an admin suspends your account, sign-in is refused and you are taken to
`/account-suspended`.

1. Fill in **First name**, **Last name**, **Account email**, and **Message**.
   The message is pre-filled: *"My account was blocked by mistake. Please
   review my account and unblock it."* Edit it if needed (10 to 2,000
   characters).
2. Click **Email Support**. The message goes to `support@golist.me`, with your
   email as reply-to.
3. Wait for a reply by email. The page is not indexed by search engines.

### 6.4 Update your profile and password

1. Open **My Profile** from the account menu (or go to `/my-profile`).
2. **Profile information:** change the **Display name** or choose a new
   **profile image** (JPEG, PNG, or WebP, under 5 MB). Click **Save changes**.
3. **Change password:** enter **Current password**, **New password** (same
   five rules), and **Confirm password**. Click **Update password**.

---

## 7. Realtor workflows (listings, media, marketing, QR codes)

All steps assume you are signed in with a verified email and an active
workspace. Assistants follow the same steps if their permissions allow them
(section 4).

### 7.1 Create a listing

1. Click **+ Create Listing** (sidebar bottom, or the button on `/portal` or
   `/portal/orders`).
2. Fill in the form:
   - **Property Address** (required). Start typing and pick a suggestion. The
     city, province, postal code, and map location fill in automatically.
   - **Property Size (sqft)**, **Year Built**, **MLS Number**,
     **List Price**, **Bedrooms**, **Bathrooms** (free text, for example
     `3 + 1` or `2.5`), and **Short Description**.
3. Click **Create Listing**.
4. You land on the new listing's detail page. It starts as **Draft**, so its
   public page is not visible yet.

### 7.2 Edit listing details

1. Open the listing (My Listings → **Edit Listing**).
2. On the **Property Info** tab, click **Edit**, change the fields, and click
   **Save**. A "Changes saved" message confirms it.
3. Requires `MANAGE_LISTINGS` for assistants.

### 7.3 Change a listing's status

Statuses: **Draft** (not public), **Active** (public), **Sold** (public and
labelled sold). You can switch between any statuses, in any order.

1. On `/portal/orders`, use the **Status** dropdown in the listing's row, or
   use the status selector on the listing's detail page.
2. The change is saved immediately.
3. Effect on the public page (`/p/<slug>`):
   - **Draft:** not public (visitors see "not found").
   - **Active:** public.
   - **Sold:** public, with a sold label (currently shown on template V3;
     other templates still need the label added).

**Note:** the **Public Page** button is shown for every listing, including
Drafts. Drafts show "not found" to visitors.

### 7.4 Upload photos, videos, and floor plans

1. Open the listing and go to **Photos**, **Videos**, or **Floor Plans**.
2. Drag files into the upload area, or click to browse. Uploads start
   automatically and show progress per file.
3. Photos are copied into an MLS-optimized version in the background.
4. To delete: select the item(s) in the grid and use the delete control.
5. To reorder photos: drag a photo onto another position in the grid. A gray
   "Drop here" square shows where the photo will land.
   Uploads, deletes, and reorders require the `MANAGE_LISTINGS` permission.

Accepted files: images (JPG, PNG, WebP, GIF, HEIC) for photos and floor plans;
videos (MP4, MOV, WebM) for videos. PDFs are not accepted for photos or floor
plans. Invalid files are rejected before upload with an explanation.

### 7.5 Add a 3D Virtual Tour

1. Open the listing and go to **3D Virtual Tour**.
2. Enter a **Title** (defaults to "3D Virtual Tour") and paste the
   **Embed URL** (Matterport, iGUIDE, or another provider's embed link).
3. Click **Add**. The tour appears in the list.
4. To remove a tour, use the delete control on its row.
5. Requires `MANAGE_LISTINGS`.

### 7.6 Generate Reels (video)

Reels are generated from the listing's **reel source images**.

1. Open the listing and go to **Reels** (requires `GENERATE_MARKETING`).
2. Upload at least **3 images** with the uploader. You can also delete or
   reorder them in the grid.
3. Click **Generate Reels with Remotion**. The button is disabled until
   there are enough images; a message such as "Missing to generate: ..."
   tells you what is missing.
4. The reel list shows each reel with its status (**Queued**, **Rendering**,
   **Complete**, or **Failed**). Refresh the page to see progress.
5. Per reel:
   - **Retry** (re-render), including with a different music track.
   - **Cancel** while it is rendering (requires `GENERATE_MARKETING`).
   - **Delete** (requires `MANAGE_LISTINGS`).
6. Watch the finished reel once it shows **Complete** in the list.

### 7.7 Generate Flyers

1. Open the listing and go to **Flyers** (requires `GENERATE_MARKETING`).
2. Make sure there are at least **3 images** in the reel source grid (the
   same images used for Reels; the Flyers tab shows the same uploader).
3. Click **Generate Flyers**. Three flyer PDFs are created.
4. In the flyer list, wait for the status to become **Complete**. Completed
   flyers are listed with their status set to Complete.
5. Per flyer: **Retry** (requires `GENERATE_MARKETING`) and **Delete**
   (requires `MANAGE_LISTINGS`).

### 7.8 Generate Social Posts

1. Open the listing and go to **Social Posts** (requires `GENERATE_MARKETING`).
2. Make sure there is at least **1 image** in the source grid.
3. Click **Generate Posts**. One post is created per active social template.
4. Each post shows its status. Use **Render** (or the retry icon) to render
   it. Completed posts show **Download**.
5. Delete a post with its delete control (requires `MANAGE_LISTINGS`).

### 7.9 Create a QR code for a listing

1. Open the listing and go to **QR Codes** (requires `MANAGE_LISTINGS` to
   create).
2. Click **Generate QR Code**.
3. A QR code is created with an ID such as `Q-000001`, assigned to this
   listing. Seven print variants are generated automatically:
   - Bare QR code
   - Rider layouts: scan with info, scan with tour and price, scan to see
     inside
   - Decal layouts: scan with info, scan with tour and price, scan to see
     inside
4. Each QR card shows **Print Artifacts** with **Download PNG** and
   **Download PDF** links for each variant.

### 7.10 Reassign a QR code to another listing

Use this when a physical sign or decal should now point to a different
(current or future) listing.

1. Go to **My QR Codes** (`/portal/qr-codes`).
2. Find the QR code. Click the **Edit** icon.
3. In the reassign dialog, choose the **listing** to assign it to, and
   confirm.
4. The previous assignment ends. The printables stay the same, so physical
   copies keep working.

**Who can reassign:**
- Anyone with `GENERATE_MARKETING` on the listing's workspace.
- If the QR code is **unassigned** (its listing was deleted), only the
  account that created it can assign it again (or an admin).

### 7.11 View QR stats and leads, and turn weekly stats on or off

1. Go to **My QR Codes**, or open the **QR Codes** tab of a listing.
2. Click the **stats** icon (chart) on the QR code.
3. The stats dialog shows scans and the **Leads** captured through that QR
   code, including the last 7 days.
4. Use the **Weekly Stats** switch on the QR row to turn the weekly email
   summary on or off for that listing's assignment.

**Note:** leads from every property page form and QR code now appear on the
**Leads** page (section 7.15). Scan counts require `VIEW_ANALYTICS`; the lead
part of this dialog requires `VIEW_LEADS`.

### 7.12 Delete a QR code

1. Go to **My QR Codes** (or the QR tab of the listing).
2. Click the **trash** icon on the QR code and read the confirmation.
3. Click **Delete QR code**.
4. Result: the QR code, its printables (SVG, PNG, and PDF) in storage, its
   assignment history, and its scan statistics are removed. **Printed copies
   stop working.**

Only delete a QR code if its physical copies have been retired. To keep a
printed code in use, reassign it instead (section 7.10).

### 7.13 Delete a listing

1. Open **My Listings** and click the **trash** icon on the row, or open the
   listing and click the trash icon in the header.
2. Read the confirmation. It says the listing, its uploaded media, and all
   generated assets are deleted, and that this cannot be undone.
3. Click **Delete listing**.
4. Result:
   - All photos, MLS copies, videos, floor plans, attachments, reels, flyers,
     social posts, reel source images, 3D tour links, the public page, and
     the listing's leads are removed.
   - The listing's files in storage are removed.
   - **QR codes are not deleted.** A QR code that was assigned to this
     listing becomes **Unassigned** (if it has no other active assignment).
     It stays on **My QR Codes**, and you can reassign it to another listing.

Requires `MANAGE_LISTINGS`.

### 7.14 Public page and sharing

- The public page address is `/p/<slug>` (shown on the listing row as
  **Public Page**). The slug is created from the realtor's name and the
  property address.
- Only Active and Sold listings are visible to the public (section 7.3).

### 7.15 View and contact leads

Requires `VIEW_LEADS`. The **Leads** item appears in the portal sidebar.

1. Open **Leads**. The table shows First Name, Last Name, Email, Phone,
   Property, Source, and when the lead was captured.
2. Sources are labeled: Contact form, QR code, Book a showing, Mortgage
   calculator, Home value request, and Similar homes request.
3. Search by name, email, phone, or property address. Filter by one or more
   lead sources; **All lead sources** clears the filter. Change the number of
   leads per page; pagination is at the bottom.
4. Tick individual leads (or the header checkbox for all) and click
   **Export** to download a CSV of the selection. With nothing selected,
   Export downloads every lead matching the current search and filter.
5. Click a lead to open its page. The page shows contact details, source,
   capture time, the property, and the submitted message.
6. If the lead has an email address, click **Email {name}**. Write a subject
   and message and click **Send email**. The email is sent from GoList.me and
   replies go to your account email.

---

## 8. Team workflows

### 8.1 Invite an assistant (workspace owner)

1. Go to **My Team** (`/portal/team`), under **Manage** in the sidebar.
2. In **Invite an assistant**, enter the assistant's **Email**.
3. Under **Permissions**, tick the permissions to grant (see section 4):
   - Manage listings
   - Generate marketing assets
   - View leads
   - View analytics
   - Purchase credits (off by default; tick only if the assistant should buy
     credits for your workspace)
4. Click **Send invitation**.
5. The invitation appears under **Pending invitations** with its expiry
   date (7 days).

**Errors you may see**
- "User is already a member of this workspace" — the person is already in.
- "An invitation is already pending for this email" — cancel or wait for the
  existing invitation to expire, then send again.
- "Privileged platform accounts cannot be invited" — the email belongs to an
  admin account.

### 8.2 Change an assistant's permissions

1. Go to **My Team**.
2. Find the assistant in **Members** and click **Permissions**.
3. Change the checkboxes and click **Save permissions**.
4. The change applies immediately. Reload the assistant's page to see the
   updated tabs and buttons.

### 8.3 Remove an assistant

1. Go to **My Team**.
2. Click the **trash** icon on the assistant's row and read the confirmation.
3. Click **Remove assistant**.
4. The assistant loses access to this workspace immediately. Their account
   stays active, and they can still sign in and work in any other workspace
   they belong to. You can invite them again later.

### 8.4 Accept an invitation (assistant)

The invitation email contains a link to `/invite/<token>`. What you see
depends on whether you already have an account.

**A. You do not have an account**
1. Open the link. The page shows "Accept invitation".
2. Enter **First name** and **Last name** (both required), **Password**, and
   **Re-enter password**. The same five password rules apply, with a
   checklist.
3. Click **Accept & Create Account**.
4. You are signed in automatically and taken to the inviting workspace's
   `/portal`. Your email is already verified through the invitation.
5. You do **not** receive welcome credits for joining.

**B. You have an account and you are signed in with the invited email**
1. Open the link. The invitation is accepted automatically.
2. The page says you can now manage the workspace, with a **Manage account**
   button.
3. Click **Manage account** to open `/portal` in that workspace.

**C. You have an account but you are signed out**
1. Open the link. The page says you have been invited and asks you to sign in
   as the invited email, with **Log in to accept**.
2. Click it. Sign in on `/login`.
3. You are returned to the invitation, which is accepted. Use **Manage
   account**.

**D. You are signed in with a different email**
1. The page says the invitation is for another email.
2. Click **Sign out**, then sign in with the invited email, and open the
   link again.

**Other messages**
- "Invitation expired" — ask the owner to send a new one.
- "Invitation already used" — the link was used already; sign in and open
  the workspace.
- "Invitation revoked" — the invitation is no longer active.
- "Account unavailable" — the account is suspended; contact support.

### 8.5 Switch between workspaces

Available when you belong to more than one workspace.

1. In the sidebar, under **Manage**, click **Workspaces**.
2. Choose a workspace from the list:
   - **My Workspace** — the one you own.
   - The realtor's name — a workspace where you are an assistant.
3. The portal reloads in that workspace. The current one is marked with a
   check.
4. If you are an assistant in someone else's workspace, a **yellow bar** at
   the top shows "You are in {realtor}'s workspace."
5. Your choice is remembered the next time you sign in.

### 8.6 Create your own realtor workspace (for an assistant)

Available when you do not own a workspace yet.

1. Open **My Profile** (account menu or `/my-profile`).
2. In the card **Create your own realtor workspace**, click
   **Create my Realtor Workspace**.
3. On `/create-workspace`, fill in **First name**, **Last name**, **Account
   email**, **Realtor / brokerage name**, and optionally **Phone**.
4. Click **Create Realtor Profile**.
5. Your new workspace becomes the active one. You can now create listings
   (after verifying your email), invite assistants, and switch back to the
   workspaces you assist from the **Workspaces** menu.
6. You receive one welcome credit for your workspace.

If you already own a workspace, this option does not appear, and the
`/create-workspace` page redirects you to My Profile.

### 8.7 What an assistant sees on first sign-in

- If you have an active workspace, you land in `/portal` for it.
- If you are a member of no workspace, you are taken to `/no-workspace`,
  which explains the situation and offers **Create Realtor Profile** and
  **Log Out**. Ask the realtor to invite you again, or create your own
  workspace.

---

## 9. Admin workflows

Admins sign in with the same `/login` page. Admins go to `/admin/dashboard`.

### 9.1 Manage a client (workspace)

1. Go to **Clients** (`/admin/clients`).
2. Use the add control to create a client workspace, or open an existing one to
   view or edit its details (name, contact, branding).
3. To delete a client workspace, use the delete control. A workspace with
   listings cannot be deleted until its listings are removed.

### 9.2 Invite an assistant to a client workspace (admin)

1. Go to **Clients**, open the client, then **Users**
   (`/admin/clients/[id]/users`).
2. In **Invite an assistant**, enter the email and click **Send invite**.
3. The invitation is an ASSISTANT invitation with the default assistant
   permissions (manage listings, generate marketing assets, view leads, view
   analytics). Adjust permissions afterwards from the owner's **My Team** page
   or ask the owner.
4. The same acceptance steps as section 8.4 apply.

**Note:** the OWNER role is not offered in the admin invitation form.

### 9.3 Create a listing for a client (admin)

1. Go to **Listings** (`/admin/orders`) and click the new-listing control
   (`/admin/orders/new`).
2. Choose the **Realtor** (client workspace) from the searchable list. The
   realtor is required.
3. Fill in the property details as in section 7.1, and save.
4. Manage its status and assets as the realtor would.

### 9.4 Manage QR codes (admin)

1. Go to **QR codes** (`/admin/qr-codes`).
2. For any QR code you can open its stats, toggle **Weekly Stats**, reassign it
   to another listing, or delete it. The delete confirmation and effects are
   the same as section 7.12.

### 9.5 Manage templates

- **Video templates** (`/admin/templates`) and **Social media templates**
  (`/admin/social-templates`) control the outputs that realtors generate.
  Changing a template affects future generations, not finished ones.

### 9.6 Manage users (SUPERADMIN only)

Go to **Users** (`/admin/users`). Only SUPERADMINs see this page.

- **Filter** by platform role (All, USER, ADMIN) and status (All, Active,
  Suspended), and search by name or email.
- **Change role:** choose USER or ADMIN in the row's dropdown and click
  **Save**. SUPERADMIN accounts cannot be changed here.
- **Suspend or activate:** click **Suspend** or **Activate**. A suspended user
  cannot sign in and sees `/account-suspended`.
- **Delete user:** click the delete control and read the confirmation. See
  section 11 for the effects. A SUPERADMIN cannot delete themselves or another
  SUPERADMIN.

**Promoting someone to ADMIN or SUPERADMIN:** the account must already exist.
Promote it in `/admin/users`, or from a terminal with
`node scripts/set-platform-role.js <email> <USER|ADMIN|SUPERADMIN>`. There is
no email invitation for platform roles.

---

## 10. Public visitor experience

- **Property page** (`/p/<slug>`): photos, floor plans, videos, the 3D tour,
  and contact details of the realtor. Visible for **Active** and **Sold**
  listings. **Draft** listings show "not found".
- **Contact form** on the property page: a visitor's name, email, phone, and
  message are saved for the realtor, and the realtor is emailed through the
  product's email service.
- **QR scan** (`/q/<displayId>`): the visitor sees a lead capture step before
  reaching the property page. The lead is saved for the QR code's workspace
  and the realtor is emailed.
- The realtor's contact details on the public page come from the workspace
  profile (name, phone, email, headshot, and logo).

---

## 11. What happens when you delete something

| Action | What is deleted | What is kept | Notes |
| --- | --- | --- | --- |
| **Delete a listing** (7.13) | The listing; photos and their MLS copies; videos; floor plans; attachments; reels, reel source images, flyers, social posts; 3D tour links; public page; leads for the listing; QR assignments and scan events; all files in storage for the listing | QR codes and their printables. The QR codes become **Unassigned** if they have no other active assignment. | Cannot be undone. |
| **Delete a QR code** (7.12) | The QR code; all printable files (SVG, PNG, PDF) in storage; assignment history; scan statistics | The listing it was assigned to | Printed copies stop working. Cannot be undone. |
| **Reassign a QR code** (7.10) | Nothing. The previous assignment is ended. | The printables and history | Keeps the physical code working for the new listing. |
| **Remove an assistant** (8.3) | The assistant's membership in that workspace | The assistant's account and any other workspaces | The assistant can be invited again. |
| **Delete a client workspace** (admin, 9.1) | The workspace, once it has no listings; its branding files | The owner's user account | Blocked while listings exist. |
| **Delete a user** (SUPERADMIN, 9.6) | The user account; the user's listings and their files in storage, for workspaces they own; their profile image and workspace branding files; their memberships in other workspaces | Their owned workspaces are **transferred to the acting SUPERADMIN** (branding cleared). Invitations they sent, payments they initiated, and QR codes they created are reassigned to the acting SUPERADMIN. QR codes are kept and become Unassigned if they have no active listing. | Cannot be undone. |
| **Suspend a user** (SUPERADMIN, 9.6) | Nothing | Everything | The user cannot sign in until reactivated. |

---

## 12. Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| "Email verification required" when creating a listing | Email not verified | Open the verification email, or click **Resend verification email** on `/verify-email`. |
| No verification email | Spam folder, or delay | Check spam. Resend once per minute. |
| Create Listing fails with 403 "Missing permission" | You lack `MANAGE_LISTINGS` in this workspace | Ask the owner to grant the permission. The button is still shown; the API refuses the action. |
| Create Listing fails with "Email verification required" | Email not verified | Verify your email (section 6.1). |
| Reels / Flyers / Social Posts tab missing | Missing `GENERATE_MARKETING` | Ask the owner to grant the permission. |
| Generate buttons disabled | Not enough images | Reels and flyers need **3** images; social posts need **1**. Check the "Missing to generate" message. |
| Upload, delete, reorder, or 3D tour change fails with 403 "Missing permission" | You lack `MANAGE_LISTINGS` in this workspace | Ask the owner to grant the permission. |
| "Workspaces" menu missing | You belong to one workspace only | Nothing to do. |
| Public page shows "not found" | Listing is Draft | Set the listing to **Active** (or **Sold**). |
| Cannot see a QR code | It was created by another person and is unassigned | Only the creator (or an admin) can see or reassign an unassigned QR code. |
| Invitation says already used or expired | Link was opened before or is older than 7 days | Ask the owner to send a new invitation. |
| Sign-in says invalid email or password | Wrong password (email case does not matter) | Use **Forgot password?**, or contact support. |
| Sign-in redirects to the suspended page | Account suspended | Use the **Email Support** form on that page. |

---

## 13. Known limitations (as of 2026-11-11)

These are known and will be addressed in Phase 2. Do not write SOPs that
depend on them working as described until they are fixed.

1. **Resolved in Phase 2.** Assistants can use the 3D Virtual Tour and
   reorder photos. Media uploads, deletes, and reorders require
   `MANAGE_LISTINGS`.
2. **Resolved in Phase 2.** QR create, printables, reassign, delete, and
   weekly-stats changes require `MANAGE_LISTINGS`. QR stats respect
   `VIEW_ANALYTICS` and `VIEW_LEADS`.
3. **Resolved in Phase 2.** `VIEW_LEADS` is enforced on the Leads page and
   all leads APIs. `VIEW_ANALYTICS` is enforced on QR scan statistics.
4. **Resolved in Phase 2.** There is now a Leads page with search, source
   filter, pagination, CSV export, lead details, and email-to-lead. A full
   analytics dashboard is still Phase 6 work.
5. **Credits are not spent.** Each new realtor workspace receives one welcome
   credit. Generating assets is not charged. There is no way to buy credits
   (no Stripe checkout yet).
6. **Sold label is not on every template.** Only template V3 shows the sold
   label.
7. **Admin Public Page links point to Drafts** (which show "not found").
8. **Co-realtors are not available.** Only the database structure exists.
9. **Platform ADMIN invitations are not available.** ADMIN and SUPERADMIN are
    assigned in `/admin/users` or by script.
10. **Google address autocomplete uses the legacy Google Places API** and may
    stop working for new Google Cloud projects. A migration is planned.
11. **The public media storage is readable by anyone who has a file's link**
    (accepted for listing media; private documents are not stored yet).
12. **Forgot-password and password-reset flows** were not part of the
    2026-11-10 test pass.
13. **Reel render completion depends on the sync endpoints** because the
    render callback URL is `localhost` in development.
14. **Old product copy** remains on some marketing pages (homepage and landing
    components). The portal and emails use GoList.me.

---

## Change log

- **2026-11-11:** Phase 2 permission pass. All listing tabs stay visible for
  assistants; actions show a consistent permission dialog. Media uploads,
  deletes, reorders, the 3D tour, and QR management require
  `MANAGE_LISTINGS`. Generated-asset deletion requires `GENERATE_MARKETING`.
  `VIEW_LEADS` is enforced with a new Leads page, CSV export, lead details,
  and email-to-lead. `VIEW_ANALYTICS` gates QR scan stats. Added file-type
  validation and a "Drop here" photo reorder placeholder.
- **2026-11-10:** First complete version. Covers Phase 1 as accepted by the
  owner (workspaces, memberships, permissions, invitations, switching,
  listing lifecycle, generation tabs, QR codes, suspension, and admin
  tools).
