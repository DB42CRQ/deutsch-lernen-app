"""
Deutsch App — Audio Generator
==============================
Generiert MP3-Dateien für alle Dialoge und Vokabeln via Murf API.
Lege deinen API Key in eine Datei namens "murf_key.txt" im selben Ordner.
"""

import urllib.request
import urllib.error
import json
import os
import time

# ── KONFIGURATION ────────────────────────────────────────────
VOICE_ID    = "de-DE-lara"   # Natürliche deutsche Stimme
SPEED       = -10             # Etwas langsamer für Lernende (-20 bis +20)
OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), "public", "audio")
API_URL     = "https://api.murf.ai/v1/speech/generate"

# ── TEXTE DIE VERTONT WERDEN ─────────────────────────────────
AUDIO_FILES = [
    # Dialoge (Hörübungen)
    {
        "id": "dialog_tienda",
        "text": "Guten Tag! Was darf es sein? Ich hätte gerne ein Brot und zwei Brötchen, bitte. Das macht zwei Euro fünfzig. Bitte schön. Auf Wiedersehen!"
    },
    {
        "id": "dialog_presentacion",
        "text": "Hallo! Ich heiße Sarah. Ich komme aus Spanien und wohne jetzt in Berlin. Ich lerne seit drei Monaten Deutsch. Es macht mir sehr viel Spaß!"
    },
    {
        "id": "dialog_restaurante",
        "text": "Guten Abend! Ich hätte gerne die Speisekarte. Natürlich! Und zu trinken? Ein Wasser, bitte. Und zum Essen? Ich nehme das Schnitzel mit Pommes."
    },
    {
        "id": "dialog_bahnhof",
        "text": "Guten Morgen! Eine Fahrkarte nach München, bitte. Einfach oder hin und zurück? Hin und zurück, bitte. Das macht vierzig Euro. Danke schön!"
    },
    # Sprechübungen (Sätze zum Nachsprechen)
    {
        "id": "speak_wie_heisst",
        "text": "Wie heißt du?"
    },
    {
        "id": "speak_wo_wohnst",
        "text": "Wo wohnst du?"
    },
    {
        "id": "speak_was_machst",
        "text": "Was machst du gern?"
    },
    {
        "id": "speak_komme",
        "text": "Ich komme aus Spanien."
    },
    {
        "id": "speak_spreche",
        "text": "Ich spreche ein bisschen Deutsch."
    },
    {
        "id": "speak_lerne",
        "text": "Ich lerne Deutsch, weil ich es sehr schön finde."
    },
]

def load_api_key():
    key_file = os.path.join(os.path.dirname(__file__), "murf_key.txt")
    if not os.path.exists(key_file):
        print("FEHLER: murf_key.txt nicht gefunden!")
        print(f"Erstelle die Datei: {key_file}")
        print("Inhalt: nur deinen API Key, sonst nichts.")
        exit(1)
    with open(key_file) as f:
        key = f.read().strip()
    if not key:
        print("FEHLER: murf_key.txt ist leer!")
        exit(1)
    return key

def generate_audio(api_key, text, voice_id, speed):
    payload = json.dumps({
        "voiceId": voice_id,
        "text": text,
        "speed": speed,
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO",
    }).encode("utf-8")

    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "api-key": api_key,
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))

def download_file(url, dest_path):
    urllib.request.urlretrieve(url, dest_path)

def main():
    print()
    print("=" * 50)
    print("  Deutsch App — Audio Generator")
    print("=" * 50)
    print()

    api_key = load_api_key()
    print(f"API Key: {api_key[:8]}...{api_key[-4:]} ✓")
    print(f"Voice:   {VOICE_ID}")
    print(f"Output:  {OUTPUT_DIR}")
    print()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    success = 0
    failed  = 0

    for item in AUDIO_FILES:
        dest = os.path.join(OUTPUT_DIR, f"{item['id']}.mp3")

        # Skip if already exists
        if os.path.exists(dest):
            print(f"  ⏭  {item['id']}.mp3  (bereits vorhanden, übersprungen)")
            success += 1
            continue

        print(f"  🎙  Generiere {item['id']}...", end=" ", flush=True)
        try:
            result   = generate_audio(api_key, item["text"], VOICE_ID, SPEED)
            audio_url = result.get("audioFile") or result.get("audio_file") or result.get("url")

            if not audio_url:
                print(f"FEHLER: Keine URL in Antwort: {result}")
                failed += 1
                continue

            download_file(audio_url, dest)
            size = os.path.getsize(dest)
            print(f"✓  ({size // 1024} KB)")
            success += 1
            time.sleep(0.5)  # kurze Pause zwischen Requests

        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            print(f"HTTP {e.code}: {body[:120]}")
            failed += 1
        except Exception as e:
            print(f"FEHLER: {e}")
            failed += 1

    print()
    print("=" * 50)
    print(f"  Fertig! {success} erfolgreich, {failed} fehlgeschlagen")
    print(f"  Dateien in: {OUTPUT_DIR}")
    print("=" * 50)
    print()

    if failed == 0:
        print("Nächster Schritt: deploy.bat ausführen!")
    else:
        print("Tipp: Prüfe deinen API Key und die Internetverbindung.")

    input("\nEnter drücken zum Beenden...")

if __name__ == "__main__":
    main()
