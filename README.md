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
