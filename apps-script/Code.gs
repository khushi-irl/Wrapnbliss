/**
 * Wrap n Bliss — "Keep It In Your Pocket" workshop registration backend.
 *
 * Deploy this as a Google Apps Script Web App bound to the Google Sheet
 * you want registrations saved into. Full setup steps are in README.md.
 */

const SHEET_NAME = "Registrations";
const SCREENSHOT_FOLDER_NAME = "Wrap n Bliss - Payment Screenshots";
const OWNER_EMAIL = "khushij.office@gmail.com";
const WORKSHOP_LABEL = "Keep It In Your Pocket";
const WORKSHOP_WHEN = "2nd August 2026, 4:00 - 6:00 PM";
const WORKSHOP_WHERE = "Romeo Lane, Civil Lines";

const HEADERS = [
  "Timestamp",
  "Booking ID",
  "Participant #",
  "Participant Name",
  "Age",
  "Instagram Handle",
  "Primary Contact",
  "Email",
  "Phone",
  "How They Found Us",
  "Group Size",
  "Price Per Person",
  "Group Discount Applied",
  "Total Amount Paid (booking)",
  "Payment Reference (UTR)",
  "Payment Screenshot",
  "Notes",
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function saveScreenshot_(base64DataUrl, bookingId) {
  if (!base64DataUrl) return "";
  try {
    const match = base64DataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!match) return "";
    const contentType = match[1];
    const bytes = Utilities.base64Decode(match[2]);
    const blob = Utilities.newBlob(bytes, contentType, bookingId + "-payment." + (contentType.split("/")[1] || "jpg"));

    const folders = DriveApp.getFoldersByName(SCREENSHOT_FOLDER_NAME);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(SCREENSHOT_FOLDER_NAME);

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return "Upload failed: " + err.message;
  }
}

function sendEmails_(bookingId, participants, p) {
  try {
    const primary = participants.filter(function (x) { return x.isPrimary; })[0];
    if (!primary || !primary.email) return;

    const names = participants.map(function (x) { return x.name; }).filter(String).join(", ");

    const participantBody =
      "Booking ID: " + bookingId + "\n" +
      "Group size: " + (p.groupSize || "") + "\n" +
      "Names: " + names + "\n" +
      "Total amount: Rs " + (p.totalAmount || "") + "\n" +
      "Payment reference (UTR) you submitted: " + (p.paymentRef || "") + "\n\n" +
      "Workshop: " + WORKSHOP_LABEL + "\n" +
      "When: " + WORKSHOP_WHEN + "\n" +
      "Where: " + WORKSHOP_WHERE + "\n\n" +
      "Your spot is PENDING VERIFICATION — we're not confirmed yet. We'll check your payment reference " +
      "against our account and contact you again once it's verified and your spot(s) are confirmed.\n\n" +
      "Questions in the meantime? DM us on Instagram @wrapnbliss.\n\n" +
      "— Wrap n Bliss";

    MailApp.sendEmail({
      to: primary.email,
      subject: "We've received your registration — " + WORKSHOP_LABEL,
      body: participantBody,
    });

    const ownerBody =
      "New registration received.\n\n" +
      "Booking ID: " + bookingId + "\n" +
      "Group size: " + (p.groupSize || "") + "\n" +
      "Names: " + names + "\n" +
      "Primary contact: " + primary.name + " <" + primary.email + ">, " + (primary.phone || "") + "\n" +
      "How they found us: " + (primary.howFound || "") + "\n" +
      "Total amount: Rs " + (p.totalAmount || "") + " (discount applied: " + (p.discountApplied || "") + ")\n" +
      "Payment reference (UTR): " + (p.paymentRef || "") + "\n" +
      "Notes: " + (p.notes || "") + "\n\n" +
      "Go verify the payment and check it off in the sheet.";

    MailApp.sendEmail({
      to: OWNER_EMAIL,
      subject: "New registration: " + primary.name + " (" + (p.groupSize || "1") + " " + (p.groupSize == 1 ? "spot" : "spots") + ")",
      body: ownerBody,
    });
  } catch (err) {
    // Email failures should never block the registration itself — the row is
    // already saved. Errors here just mean no email went out this time.
  }
}

function doPost(e) {
  try {
    const p = e.parameter;
    const sheet = getSheet_();
    const timestamp = new Date();
    const bookingId = p.bookingId || "";

    const screenshotUrl = saveScreenshot_(p.paymentScreenshotBase64, bookingId);

    let participants = [];
    try {
      participants = JSON.parse(p.participants || "[]");
    } catch (err) {
      participants = [];
    }

    participants.forEach(function (participant, idx) {
      sheet.appendRow([
        timestamp,
        bookingId,
        idx + 1,
        participant.name || "",
        participant.age || "",
        participant.instagram || "",
        participant.isPrimary ? "Yes" : "No",
        participant.email || "",
        participant.phone || "",
        participant.howFound || "",
        p.groupSize || "",
        p.pricePerPerson || "",
        p.discountApplied || "",
        p.totalAmount || "",
        p.paymentRef || "",
        screenshotUrl,
        p.notes || "",
      ]);
    });

    sendEmails_(bookingId, participants, p);

    return ContentService.createTextOutput(
      JSON.stringify({ result: "success", bookingId: bookingId })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ result: "error", message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "Wrap n Bliss registration endpoint is live."
  );
}
