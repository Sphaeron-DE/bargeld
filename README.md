# Bargeld-App einrichten

Die App besteht aus 6 Dateien: index.html, manifest.webmanifest, sw.js, icon-180.png, icon-192.png, icon-512.png.
Sie braucht eine https-Adresse, damit Safari sie als App auf den Home-Bildschirm legen und offline nutzen kann. Kostenlos geht das mit GitHub Pages.

## 1. Auf GitHub Pages stellen (einmalig, ca. 15 Minuten)

1. Auf github.com anmelden, oben rechts **+** → **New repository**.
2. Name: `bargeld`, Sichtbarkeit **Public** (GitHub Pages ist im Gratis-Konto nur für öffentliche Repos verfügbar. Öffentlich ist nur der App-Code, deine Einträge liegen nur auf dem iPhone).
3. Im neuen Repo **Add file** → **Upload files**, die 6 Dateien hineinziehen, **Commit changes**.
4. **Settings** → **Pages** → bei „Branch“ `main` und `/ (root)` wählen → **Save**.
5. Nach 1–2 Minuten ist die App erreichbar unter `https://sphaeron-de.github.io/bargeld/`.

## 2. Aufs iPhone holen

1. Die Adresse in **Safari** öffnen.
2. Teilen-Symbol → **Zum Home-Bildschirm** → Hinzufügen.
3. Ab jetzt nur noch über das Symbol „Bargeld“ öffnen (nicht über Safari). Nur dort liegen deine Daten.

## 3. Täglich sichern

- Wenn es neue Einträge gibt und die letzte Sicherung älter als ca. 20 Stunden ist, erscheint oben ein gelber Hinweis mit **Sichern**.
- Im Teilen-Menü **In Dateien sichern** → einen festen Ordner in iCloud Drive wählen, z. B. `Haushaltsbuch/Bargeld`.
- Jede Sicherung enthält **alle** Einträge. Die neueste Datei reicht also für alles.
- Zum Monatsende einfach die neueste Sicherung zusammen mit dem Finanzguru-Export schicken.

## Wiederherstellen

Einstellungen → **Sicherung einlesen** → CSV-Datei wählen. Bereits vorhandene Einträge werden übersprungen, es entsteht nichts doppelt.

## Wichtig

- Das App-Symbol vom Home-Bildschirm zu löschen löscht auch die Daten. Vorher sichern.
- Der Export ist eine CSV-Datei mit Semikolon (öffnet sich direkt in Excel/Numbers): Typ; Datum; Kategorie; Betrag; Kommentar; ID.
- Kategorien lassen sich in den Einstellungen anlegen, umbenennen, sortieren und ausblenden.

## Google Sheets (automatischer Abgleich)

Damit landen alle Einträge nach jedem Speichern automatisch in einer Google-Tabelle in deinem Drive.

1. In Google Drive (am besten am PC) im Haushaltsbuch-Ordner **Neu → Google Tabellen** anlegen, z. B. „Bargeld“.
2. In der Tabelle **Erweiterungen → Apps Script** öffnen. Den vorhandenen Text löschen und den Inhalt von `google-sheets-skript.gs` einfügen.
3. In der Bargeld-App unter **Einstellungen → Google Sheets** den **Schlüssel** kopieren und im Skript statt `HIER-DEN-SCHLUESSEL-AUS-DER-APP-EINFUEGEN` einsetzen (Anführungszeichen stehen lassen). Speichern (Disketten-Symbol).
4. **Bereitstellen → Neue Bereitstellung** → Zahnrad → **Web-App**. „Ausführen als: Ich“, „Zugriff: Jeder“ → **Bereitstellen**. Google fragt einmal nach Berechtigungen: Konto wählen → „Erweitert“ → „Zu … wechseln (unsicher)“ → Zulassen. Das ist normal bei eigenen Skripten.
5. Die angezeigte **Web-App-URL** (endet auf `/exec`) kopieren, in der App unter Einstellungen → Google Sheets einfügen und **Speichern & jetzt senden** tippen.

Die Tabelle bekommt zwei Blätter: **Bargeld** (alle Einträge) und **Monate** (Ausgaben, Einnahmen, Saldo je Monat). Die App überschreibt diese beiden Blätter bei jedem Senden komplett, eigene Notizen also in ein anderes Blatt schreiben.
Der Schlüssel sorgt dafür, dass nur deine App in die Tabelle schreiben kann.
