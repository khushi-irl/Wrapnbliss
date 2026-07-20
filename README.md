# Keep It In Your Pocket — Registration Site

A registration page for Wrap n Bliss's Friendship Day workshop, **"Keep It In Your Pocket"** (2nd Aug 2026, 4–6PM, Romeo Lane, Civil Lines).

- ₹2,499 per person
- Automatic 10% off the total when 4+ people register together in one booking
- Registrants submit name, email, phone, Instagram handle, age, how they found the event, and a UPI payment reference to confirm their spot
- Every registration (and each friend in a group booking) is written as its own row into a Google Sheet
- On submission, the registrant gets a confirmation email (marked **pending verification**, not confirmed), and you get a notification email at `khushij.office@gmail.com` with the booking details so you can verify the payment

It's a static site — `index.html` + `assets/style.css` + `assets/script.js` — with no server of your own to run. The Google Sheet is fed by a small Google Apps Script Web App (`apps-script/Code.gs`).

## 1. Set up the Google Sheet backend

1. Create a new Google Sheet (this will hold your registrations).
2. In the Sheet, go to **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
4. Click **Deploy → New deployment**.
   - Select type **Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
5. Click **Deploy**, authorize the script when prompted (it needs access to the Sheet and Drive, since payment screenshots are saved to a Drive folder).
6. Copy the **Web app URL** you're given — it looks like `https://script.google.com/macros/s/XXXXXXXX/exec`.

The first registration that comes in will auto-create a `Registrations` tab with headers, and (if a screenshot is attached) a Drive folder called `Wrap n Bliss - Payment Screenshots`.

> Redeploy note: every time you edit `Code.gs`, use **Deploy → Manage deployments → Edit → New version** so the live URL picks up your changes.

### Updating an already-deployed script (e.g. to add the email feature)

If you'd already deployed an earlier version of `Code.gs`, update it like this:

1. Open the Apps Script project (Extensions → Apps Script from your Sheet).
2. Select all the existing code and replace it with the latest [`apps-script/Code.gs`](apps-script/Code.gs).
3. **Deploy → Manage deployments → click the pencil/edit icon → Version: New version → Deploy.**
4. Google will ask you to **re-authorize** — this version now needs permission to send email as you (it didn't before). Click through the same "unverified app → Advanced → Go to [project] (unsafe)" flow as the first time; this is expected for your own script.
5. The Web app URL stays the same, so nothing needs to change on the site side.

Emails send via your own Gmail account (`MailApp`), which has a free daily quota of 100 emails — far more than a workshop like this needs.

## 2. Connect the site to your sheet

Open `assets/script.js` and paste your Web App URL in:

```js
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
  ...
};
```

## 3. Payment details

The UPI ID (`9711178550@ptsbi`) and your Paytm UPI QR code (`assets/upi-qr.png`) are both already in place.

Registrants pay you directly via UPI, then type their transaction/reference ID (UTR) into the form as proof — this is what confirms their spot. Verify payments against your UPI app / bank statement and cross-check against the `Payment Reference (UTR)` column in the sheet.

## 4. Add your logo

The header and footer look for a logo image at `assets/logo.png` (currently missing — they just hide gracefully without it). Upload your real logo file there, same way you added the UPI QR code: on GitHub, go into the `assets` folder and use **Add file → Upload files**, name it exactly `logo.png`.

## 5. Deploy the site

Since it's a static site, any static host works — e.g. GitHub Pages:

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the repo settings, enable **GitHub Pages** for the branch/folder this lives in.
3. Share the resulting URL wherever you're promoting the workshop (Instagram bio, etc.).

## What ends up in the sheet

Each row is one participant (so a group of 4 booked together produces 4 rows sharing the same `Booking ID`):

| Column | Notes |
|---|---|
| Timestamp | When the booking was submitted |
| Booking ID | Shared across everyone in the same group booking |
| Participant # | Order within the booking |
| Participant Name / Age / Instagram Handle | Per person |
| Primary Contact | `Yes` for the person who filled the form, `No` for their friends |
| Email / Phone | Only collected for the primary contact |
| How They Found Us | Only collected for the primary contact |
| Group Size / Price Per Person / Group Discount Applied / Total Amount Paid (booking) | Same across all rows in a booking |
| Payment Reference (UTR) | What you check to confirm payment |
| Payment Screenshot | Link to the uploaded image in Drive, if one was attached |
| Notes | Optional free text from the primary contact |

## Local preview

No build step — just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
