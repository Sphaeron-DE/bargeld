/**
 * Bargeld-App ↔ Haushaltsbuch (Google Sheets)
 *
 * Gehört in die Haushaltsbuch-Tabelle: Erweiterungen → Apps Script → diesen Text
 * komplett einfügen, SCHLUESSEL ersetzen, speichern, dann
 * Bereitstellen → Neue Bereitstellung → Typ „Web-App“,
 * Ausführen als: Ich, Zugriff: Jeder → Bereitstellen.
 * Die angezeigte Web-App-URL in der Bargeld-App unter Einstellungen eintragen.
 *
 * Was das Skript tut:
 *  - Blatt „Bargeld“: alle Bargeld-Einträge der App (wird bei jedem Senden neu geschrieben).
 *    Spalte H = Zeile im Haushaltsbuch (aus Blatt „Zuordnung“), I = Monat, J = Jahr.
 *  - Blatt „Finanzguru“: Buchungen aus dem Finanzguru-Export. Neue Buchungen werden
 *    angehängt, schon vorhandene (gleiche Buchungs-ID) übersprungen.
 *    Spalte „Zeile“ ordnet jede Buchung einer Zeile in Tabelle1 zu: automatisch über das
 *    Blatt „Regeln“ (Suchtext → Zeile), Umbuchungen bekommen „-“. Leere Zeile = noch offen.
 *  - Antwortet mit dem Budget des laufenden Monats aus „Tabelle1“, inkl. Einzelbuchungen je Zeile.
 */
const SCHLUESSEL = "HIER-DEN-SCHLUESSEL-AUS-DER-APP-EINFUEGEN";

// Zeilen in Tabelle1
const Z = {
  einnahmen: 2, gehalt: 3, fix: 4, optional: 9, invest: 13, kredit: 15, sonstige: 16,
  fixZeilen: [5, 6, 7, 8, 10, 11, 12, 14, 15],
  varZeilen: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
  standZelle: "Q2"
};
const EDENRED = 25;

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.token !== SCHLUESSEL) return antwort({ ok: false, fehler: "Schlüssel passt nicht" });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const res = { ok: true };

    if (data.entries) {
      schreibeBargeld(ss, data.entries);
      res.anzahl = data.entries.length;
    }
    if (data.finanzguru) {
      res.finanzguru = schreibeFinanzguru(ss, data.finanzguru);
    }
    SpreadsheetApp.flush();
    res.budget = budget(ss);
    return antwort(res);
  } catch (err) {
    return antwort({ ok: false, fehler: String(err) });
  }
}

function doGet() {
  return antwort({ ok: true, info: "Bargeld-Skript läuft" });
}

/* ---------- Bargeld ---------- */
function zuordnung(ss) {
  const sh = ss.getSheetByName("Zuordnung");
  const map = {};
  if (!sh) return map;
  sh.getDataRange().getValues().slice(1).forEach(r => {
    if (r[0] && r[2]) map[String(r[1]).trim() + "|" + String(r[0]).trim().toLowerCase()] = Number(r[2]);
  });
  return map;
}

function schreibeBargeld(ss, entries) {
  const sh = ss.getSheetByName("Bargeld") || ss.insertSheet("Bargeld");
  const map = zuordnung(ss);
  const kopf = ["Typ", "Datum", "Kategorie", "Betrag", "Kommentar", "Einzelbeträge", "ID", "Zeile", "Monat", "Jahr"];
  const zeilen = entries
    .slice()
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created || 0) - (b.created || 0))
    .map(e => {
      const typ = e.type === "in" ? "Einnahme" : "Ausgabe";
      const [y, m, d] = e.date.split("-").map(Number);
      const zeile = map[typ + "|" + String(e.cat || "").trim().toLowerCase()] || (typ === "Einnahme" ? 2 : 28);
      return [typ, new Date(y, m - 1, d, 12), e.cat || "", e.cents / 100, e.comment || "", e.parts || "", e.id, zeile, m, y];
    });
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), kopf.length).clearContent();
  sh.getRange(1, 1, 1, kopf.length).setValues([kopf]).setFontWeight("bold");
  sh.setFrozenRows(1);
  if (zeilen.length) {
    sh.getRange(2, 1, zeilen.length, kopf.length).setValues(zeilen);
    sh.getRange(2, 2, zeilen.length, 1).setNumberFormat("dd.MM.yyyy");
    sh.getRange(2, 4, zeilen.length, 1).setNumberFormat("#,##0.00 €");
    sh.getRange(2, 6, zeilen.length, 2).setNumberFormat("@");
  }
}

/* ---------- Finanzguru ---------- */
function schreibeFinanzguru(ss, fg) {
  const kopf = fg.header;
  const idSpalte = kopf.indexOf("Buchungs-ID");
  if (idSpalte < 0) throw new Error("Spalte Buchungs-ID fehlt im Export");
  let sh = ss.getSheetByName("Finanzguru");
  if (!sh) {
    sh = ss.insertSheet("Finanzguru");
    sh.getRange(1, 1, 1, kopf.length + 1).setValues([kopf.concat(["Importiert am"])]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  let vorhKopf = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (vorhKopf.indexOf("Zeile") < 0) {
    if (sh.getMaxColumns() < vorhKopf.length + 1) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
    sh.getRange(1, vorhKopf.length + 1).setValue("Zeile").setFontWeight("bold");
    vorhKopf = vorhKopf.concat(["Zeile"]);
  }
  const regeln = ladeRegeln(ss);
  const ab = new Date(new Date().getFullYear() - 1, 0, 1); // nur aktuelle Buchungen automatisch zuordnen
  const vorhId = vorhKopf.indexOf("Buchungs-ID");
  const ids = new Set();
  if (sh.getLastRow() > 1) {
    sh.getRange(2, vorhId + 1, sh.getLastRow() - 1, 1).getValues().forEach(r => ids.add(String(r[0])));
  }
  const jetzt = new Date();
  const neu = [];
  fg.rows.forEach(r => {
    const id = String(r[idSpalte] || "");
    if (!id || ids.has(id)) return;
    ids.add(id);
    // Spalten in der Reihenfolge des vorhandenen Blatts ablegen
    const roh = name => { const i = kopf.indexOf(name); return i < 0 ? "" : r[i]; };
    const tag = new Date(String(roh("Buchungstag")).slice(0, 10) + "T12:00:00");
    const zuordnungZeile = tag >= ab ? ordneZu(regeln, roh) : "";
    const zeile = vorhKopf.map(k => {
      if (k === "Importiert am") return jetzt;
      if (k === "Zeile") return zuordnungZeile;
      const i = kopf.indexOf(k);
      if (i < 0) return "";
      const v = r[i];
      return (k === "Buchungstag" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) ? new Date(v.slice(0, 10) + "T12:00:00") : v;
    });
    neu.push(zeile);
  });
  if (neu.length) {
    const start = sh.getLastRow() + 1;
    sh.getRange(start, 1, neu.length, vorhKopf.length).setValues(neu);
    const tag = vorhKopf.indexOf("Buchungstag");
    if (tag >= 0) sh.getRange(start, tag + 1, neu.length, 1).setNumberFormat("dd.MM.yyyy");
    // nach Buchungstag sortieren, neueste oben
    if (tag >= 0) sh.getRange(2, 1, sh.getLastRow() - 1, vorhKopf.length).sort({ column: tag + 1, ascending: false });
  }
  return { neu: neu.length, gesamt: ids.size };
}

function ladeRegeln(ss) {
  const sh = ss.getSheetByName("Regeln");
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()
    .filter(r => r[0] !== "" && r[1] !== "")
    .map(r => ({ text: String(r[0]).toLowerCase(), zeile: r[1] }));
}

function ordneZu(regeln, roh) {
  if (String(roh("Analyse-Umbuchung")).toLowerCase() === "ja") return "-";
  const text = [roh("Beguenstigter/Auftraggeber"), roh("Verwendungszweck"), roh("Analyse-Unterkategorie")].join(" ").toLowerCase();
  const treffer = regeln.find(x => text.indexOf(x.text) >= 0);
  return treffer ? treffer.zeile : "";
}

/* Einzelbuchungen des Monats je Tabelle1-Zeile (Konto + Bargeld) */
function details(ss, jahr, monat) {
  const d = {};
  const add = (z, x) => { (d[z] = d[z] || []).push(x); };
  const tz = ss.getSpreadsheetTimeZone();
  const fmt = v => Utilities.formatDate(v, tz, "dd.MM.");
  const fg = ss.getSheetByName("Finanzguru");
  if (fg && fg.getLastRow() > 1) {
    const w = fg.getDataRange().getValues();
    const k = w[0];
    const ix = n => k.indexOf(n);
    const iT = ix("Buchungstag"), iB = ix("Betrag"), iE = ix("Beguenstigter/Auftraggeber"), iV = ix("Verwendungszweck"), iZ = ix("Zeile");
    if (iT >= 0 && iZ >= 0) {
      for (let i = 1; i < w.length; i++) {
        const t = w[i][iT];
        if (!(t instanceof Date) || t.getFullYear() !== jahr || t.getMonth() + 1 !== monat) continue;
        const z = Number(w[i][iZ]);
        if (!z) continue;
        add(z, { datum: fmt(t), wer: String(w[i][iE] || ""), text: String(w[i][iV] || "").slice(0, 80), betrag: -Number(w[i][iB]) });
      }
    }
  }
  const bg = ss.getSheetByName("Bargeld");
  if (bg && bg.getLastRow() > 1) {
    bg.getRange(2, 1, bg.getLastRow() - 1, 10).getValues().forEach(r => {
      if (Number(r[8]) !== monat || Number(r[9]) !== jahr) return;
      const ein = r[0] === "Einnahme";
      add(Number(r[7]), { datum: r[1] instanceof Date ? fmt(r[1]) : "", wer: "Bar · " + r[2],
        text: [r[4], r[5]].filter(String).join(" · "), betrag: ein ? -Number(r[3]) : Number(r[3]), bar: true });
    });
  }
  Object.keys(d).forEach(z => d[z].sort((a, b) => b.datum.split(".").reverse().join("").localeCompare(a.datum.split(".").reverse().join(""))));
  return d;
}

/* Buchungen ohne Zuordnung im laufenden Monat zählen */
function offene(ss, jahr, monat) {
  const fg = ss.getSheetByName("Finanzguru");
  if (!fg || fg.getLastRow() < 2) return 0;
  const w = fg.getDataRange().getValues(), k = w[0];
  const iT = k.indexOf("Buchungstag"), iZ = k.indexOf("Zeile");
  if (iT < 0 || iZ < 0) return 0;
  let n = 0;
  for (let i = 1; i < w.length; i++) if (w[i][iT] instanceof Date && w[i][iT].getFullYear() === jahr && w[i][iT].getMonth() + 1 === monat && w[i][iZ] === "") n++;
  return n;
}

/* ---------- Budget ---------- */
function budget(ss) {
  const t = ss.getSheetByName("Tabelle1");
  const bz = ss.getSheetByName("Bargeld je Zeile");
  const heute = new Date();
  const jahr = Number(t.getRange("A1").getValue());
  // Laufendes Jahr = Jahr der Tabelle, sonst letzter Monat der Tabelle
  const monat = (heute.getFullYear() === jahr) ? heute.getMonth() + 1 : 12;
  const spalte = monat + 1; // B = Januar
  const T = t.getRange(1, 1, 32, 15).getValues();
  const B = bz ? bz.getRange(1, 1, 28, 13).getValues() : [];
  const zahl = v => (typeof v === "number" ? v : 0);
  const name = r => String(T[r - 1][0]).replace(/^\*+/, "").trim();
  const ist = r => zahl(T[r - 1][spalte - 1]);
  const bar = r => (B[r - 1] ? zahl(B[r - 1][spalte - 1]) : 0);
  const schnitt = r => zahl(T[r - 1][14]);
  const median = r => {
    const w = [];
    for (let c = 2; c < spalte; c++) w.push(zahl(T[r - 1][c - 1]));
    if (!w.length) return schnitt(r);
    w.sort((a, b) => a - b);
    const h = Math.floor(w.length / 2);
    return w.length % 2 ? w[h] : (w[h - 1] + w[h]) / 2;
  };
  const kontoDa = ist(Z.fix) > 0; // Kontodaten für den Monat schon eingetragen

  // Einnahmen
  let einnahmen, einErwartet = false;
  if (ist(Z.gehalt) > 0) {
    einnahmen = ist(Z.einnahmen);
  } else {
    einErwartet = true;
    const extra = kontoDa ? Math.max(ist(Z.einnahmen) - EDENRED - bar(Z.einnahmen), 0) : 0;
    einnahmen = median(Z.gehalt) + EDENRED + bar(Z.einnahmen) + extra;
  }

  // Feste und geplante Posten: gebucht oder erwartet (Median der Vormonate)
  const fest = Z.fixZeilen.map(r => {
    const w = ist(r);
    return w > 0 ? { zeile: r, name: name(r), wert: w, erwartet: false } : { zeile: r, name: name(r), wert: median(r), erwartet: true };
  }).filter(x => x.wert > 0);

  // Variable Ausgaben: bisher (Konto + Bargeld)
  const variabel = Z.varZeilen.map(r => ({
    zeile: r,
    name: name(r),
    wert: kontoDa ? ist(r) : bar(r),
    schnitt: schnitt(r)
  }));

  const summeFest = fest.reduce((s, x) => s + x.wert, 0);
  const summeVar = variabel.reduce((s, x) => s + x.wert, 0);
  const stand = t.getRange(Z.standZelle).getValue();

  return {
    monat: String(T[0][spalte - 1]) + " " + jahr,
    kontodatenBis: stand instanceof Date ? Utilities.formatDate(stand, ss.getSpreadsheetTimeZone(), "dd.MM.yyyy") : String(stand || ""),
    einnahmen: { wert: einnahmen, erwartet: einErwartet },
    fest: fest, summeFest: summeFest,
    variabel: variabel, summeVar: summeVar,
    schnittVar: variabel.reduce((s, x) => s + x.schnitt, 0),
    rest: einnahmen - summeFest - summeVar,
    details: details(ss, jahr, monat),
    offen: offene(ss, jahr, monat),
    erstellt: new Date().toISOString()
  };
}

function antwort(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Zum Testen im Editor: Funktion „testBudget“ auswählen und Ausführen.
function testBudget() {
  Logger.log(JSON.stringify(budget(SpreadsheetApp.getActiveSpreadsheet()), null, 2));
}
