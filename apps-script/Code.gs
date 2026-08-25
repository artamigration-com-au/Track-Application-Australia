/**
 * =====================================================================
 *  ONLINE VIDEO INTERVIEW  —  GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * =====================================================================
 *  doGet()   -> returns applicants (A2:A8) OR questions (rows 2-11)
 *  doPost()  -> saves uploaded Base64 video to Drive + writes link in col C
 *
 *  HARDCODED CONFIG:
 *    FOLDER_ID = "1iyk_2f1rI_lHN37gobmgAFSsr2TAfkIs"
 *
 *  SHEET LAYOUT:
 *    Sheet "Applicants" : applicant names in cells A2:A8
 *    Sheet "Questions" : row 1 headers (Question | Audio | Video Response)
 *                        rows 2-11: 10 questions in col A, audio URLs in col B,
 *                        col C filled dynamically with the uploaded video URL.
 * =====================================================================
 */

var FOLDER_ID = "1iyk_2f1rI_lHN37gobmgAFSsr2TAfkIs";
var APPLICANTS_SHEET = "Applicants";
var QUESTIONS_SHEET = "Questions";

/**
 * GET  ->  ?action=applicants  : returns A2:A8 as array of strings
 *        ?action=questions    : returns rows 2-11 (cols A & B) as
 *                               [ { question, audio }, ... ]
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "applicants") {
      var aSheet = ss.getSheetByName(APPLICANTS_SHEET);
      if (!aSheet) throw new Error("Sheet '" + APPLICANTS_SHEET + "' not found");
      var last = aSheet.getLastRow();
      var endRow = Math.max(8, last); // A2:A8 (or more if present)
      var vals = aSheet.getRange(2, 1, endRow - 1, 1).getValues();
      var names = [];
      for (var i = 0; i < vals.length; i++) {
        var v = vals[i][0];
        if (v !== "" && v !== null) names.push(String(v));
      }
      return json(names);
    }

    if (action === "questions") {
      var qSheet = ss.getSheetByName(QUESTIONS_SHEET);
      if (!qSheet) throw new Error("Sheet '" + QUESTIONS_SHEET + "' not found");
      var qRange = qSheet.getRange(2, 1, 10, 2);
      var qVals = qRange.getValues();
      var out = [];
      for (var j = 0; j < qVals.length; j++) {
        out.push({
          question: String(qVals[j][0] || ""),
          audio:    String(qVals[j][1] || "")
        });
      }
      return json(out);
    }

    return json({ error: "Unknown action. Use ?action=applicants or ?action=questions" });
  } catch (err) {
    return json({ error: String(err) });
  }
}

/**
 * POST body (sent as text/plain to avoid CORS preflight):
 *   { "rowIndex": 2, "applicant": "Name", "video": "<base64 webm>" }
 *
 * Decodes the Base64 video, saves it as .webm into the Drive folder,
 * sets public view permission, and writes the viewable URL into
 * column C of the matching question row.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var rowIndex = parseInt(payload.rowIndex, 10); // 2..11
    var applicant = payload.applicant || "Unknown";
    var b64 = payload.video;

    if (!rowIndex || !b64) throw new Error("Missing rowIndex or video data");

    // decode base64 -> bytes
    var bytes = Utilities.base64Decode(b64);

    // save into Drive folder
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var safeName = String(applicant).replace(/[^a-zA-Z0-9\u0600-\u06FF _-]/g, "_");
    var fileName = safeName + "_Q" + (rowIndex - 1) + "_" +
                   Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss") + ".webm";
    var file = folder.createFile(fileName, bytes, "video/webm");

    // make publicly viewable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();

    // write URL into column C of the matching question row
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var qSheet = ss.getSheetByName(QUESTIONS_SHEET);
    if (qSheet) {
      qSheet.getRange(rowIndex, 3).setValue(fileUrl);
      // also log applicant name in column D for reference (optional)
      if (qSheet.getLastColumn() >= 4) {
        qSheet.getRange(rowIndex, 4).setValue(applicant + " | " + fileName);
      }
    }

    return json({ status: "ok", url: fileUrl });
  } catch (err) {
    return json({ error: String(err) });
  }
}

/** Helper: return a JSON ContentService response (CORS-safe via JSONP-free JSON). */
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
