/**
 * Bargeld-App → Google Sheets
 *
 * In die Google-Tabelle einfügen: Erweiterungen → Apps Script → diesen Text
 * komplett einfügen, SCHLUESSEL ersetzen, speichern, dann
 * Bereitstellen → Neue Bereitstellung → Typ „Web-App“,
 * Ausführen als: Ich, Zugriff: Jeder → Bereitstellen.
 * Die angezeigte Web-App-URL in der Bargeld-App unter Einstellungen eintragen.
 */
const SCHLUESSEL = "HIER-DEN-SCHLUESSEL-AUS-DER-APP-EINFUEGEN";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.token !== SCHLUESSEL) return antwort({ ok: false, fehler: "Schlüssel passt nicht" });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    schreibeEintraege(ss, data.entries || []);
    schreibeMonate(ss, data.entries || []);
    return antwort({ ok: true, anzahl: (data.entries || []).length });
  } catch (err) {
    return antwort({ ok: false, fehler: String(err) });
  }
}

// Kurzer Test im Browser: Web-App-URL aufrufen zeigt „Bargeld-Skript läuft“.
function doGet() {
  return antwort({ ok: true, info: "Bargeld-Skript läuft" });
}

function schreibeEintraege(ss, entries) {
  const sh = ss.getSheetByName("Bargeld") || ss.insertSheet("Bargeld", 0);
  const kopf = ["Typ", "Datum", "Kategorie", "Betrag", "Kommentar", "Einzelbeträge", "ID"];
  const zeilen = entries
    .slice()
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created || 0) - (b.created || 0))
    .map(e => [
      e.type === "in" ? "Einnahme" : "Ausgabe",
      zuDatum(e.date),
      e.cat || "",
      e.cents / 100,
      e.comment || "",
      e.parts || "",
      e.id
    ]);
  sh.clearContents();
  sh.getRange(1, 1, 1, kopf.length).setValues([kopf]).setFontWeight("bold");
  sh.setFrozenRows(1);
  if (zeilen.length) {
    sh.getRange(2, 1, zeilen.length, kopf.length).setValues(zeilen);
    sh.getRange(2, 2, zeilen.length, 1).setNumberFormat("dd.MM.yyyy");
    sh.getRange(2, 4, zeilen.length, 1).setNumberFormat("#,##0.00 €");
    sh.getRange(2, 6, zeilen.length, 2).setNumberFormat("@");
  }
}

function schreibeMonate(ss, entries) {
  const sh = ss.getSheetByName("Monate") || ss.insertSheet("Monate");
  const monate = {};
  entries.forEach(e => {
    const m = e.date.slice(0, 7);
    monate[m] = monate[m] || { aus: 0, ein: 0 };
    if (e.type === "in") monate[m].ein += e.cents; else monate[m].aus += e.cents;
  });
  const zeilen = Object.keys(monate).sort().map(m => {
    const v = monate[m];
    return [m.slice(5) + "/" + m.slice(0, 4), v.aus / 100, v.ein / 100, (v.ein - v.aus) / 100];
  });
  sh.clearContents();
  sh.getRange(1, 1, 1, 4).setValues([["Monat", "Ausgaben", "Einnahmen", "Saldo"]]).setFontWeight("bold");
  sh.setFrozenRows(1);
  if (zeilen.length) {
    sh.getRange(2, 1, zeilen.length, 1).setNumberFormat("@");
    sh.getRange(2, 1, zeilen.length, 4).setValues(zeilen);
    sh.getRange(2, 2, zeilen.length, 3).setNumberFormat("#,##0.00 €");
  }
}

function zuDatum(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function antwort(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
