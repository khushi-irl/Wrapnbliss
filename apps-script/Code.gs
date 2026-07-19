/**
 * Wrap n Bliss — "Keep It In Your Pocket" workshop registration backend.
 *
 * Deploy this as a Google Apps Script Web App bound to the Google Sheet
 * you want registrations saved into. Full setup steps are in README.md.
 */

const SHEET_NAME = "Registrations";
const SCREENSHOT_FOLDER_NAME = "Wrap n Bliss - Payment Screenshots";

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
