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
  const primary = participants.filter(function (x) { return x.isPrimary; })[0];
  const names = participants.map(function (x) { return x.name; }).filter(String).join(", ");

  // One personalized email to every participant who gave an email address —
  // not just the primary contact.
  participants.forEach(function (participant) {
    if (!participant.email) return;
    try {
      const body =
        "Hi " + (participant.name || "there") + ",\n\n" +
        "Your spot is RESERVED for:\n\n" +
        "Workshop: " + WORKSHOP_LABEL + "\n" +
        "When: " + WORKSHOP_WHEN + "\n" +
        "Where: " + WORKSHOP_WHERE + "\n\n" +
        "Booking ID: " + bookingId + "\n" +
        "Group size: " + (p.groupSize || "") + "\n" +
        "Names in this booking: " + names + "\n" +
        "Total amount: Rs " + (p.totalAmount || "") + "\n" +
        "Payment reference (UTR) submitted: " + (p.paymentRef || "") + "\n\n" +
        "This is pending payment verification — we'll check the payment reference against our account " +
        "and contact you again once it's confirmed.\n\n" +
        "Questions in the meantime? DM us on Instagram @wrapnbliss.\n\n" +
        "See you on 2nd August!\n" +
        "— Wrap n Bliss";

      MailApp.sendEmail({
        to: participant.email,
        subject: "Your spot is reserved — " + WORKSHOP_LABEL,
        body: body,
      });
    } catch (err) {
      // One bad email address shouldn't stop the others from sending, or
      // block the registration itself — the row is already saved.
    }
  });

  // One summary email to the owner per booking, so she knows who just registered.
  try {
    const ownerBody =
      "New registration received.\n\n" +
      "Booking ID: " + bookingId + "\n" +
      "Group size: " + (p.groupSize || "") + "\n" +
      "Names: " + names + "\n" +
      "Primary contact: " + (primary ? primary.name + " <" + primary.email + ">, " + (primary.phone || "") : "") + "\n" +
      "How they found us: " + (primary ? primary.howFound || "" : "") + "\n" +
      "Total amount: Rs " + (p.totalAmount || "") + " (discount applied: " + (p.discountApplied || "") + ")\n" +
      "Payment reference (UTR): " + (p.paymentRef || "") + "\n" +
      "Notes: " + (p.notes || "") + "\n\n" +
      "Go verify the payment and check it off in the sheet.";

    MailApp.sendEmail({
      to: OWNER_EMAIL,
      subject: "New registration: " + (primary ? primary.name : names) + " (" + (p.groupSize || "1") + " " + (p.groupSize == 1 ? "spot" : "spots") + ")",
      body: ownerBody,
    });
  } catch (err) {
    // Same as above — never let an email failure block the registration.
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
