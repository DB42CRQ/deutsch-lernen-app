"""
Deutsch App — Audio Generator (Zwei Stimmen)
=============================================
- Dialoge: Lara (F) und Matthias (M) abwechselnd
- Sprechübungen: Lara (F)
- Benötigt: pip install pydub
- Benötigt: ffmpeg (https://ffmpeg.org/download.html)
"""

import urllib.request, urllib.error, json, os, time, shutil

try:
    from pydub import AudioSegment
    # Help pydub find ffmpeg — search common Windows locations
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        for candidate in [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
        ]:
            if os.path.exists(candidate):
                ffmpeg_path = candidate
                break
    if ffmpeg_path:
        AudioSegment.converter = ffmpeg_path
        AudioSegment.ffmpeg    = ffmpeg_path
        print(f"  ffmpeg: {ffmpeg_path}")
    else:
        print("  WARNUNG: ffmpeg nicht gefunden — Merge funktioniert evtl. nicht")
    PYDUB_OK = True
except ImportError:
    PYDUB_OK = False

VOICE_A     = "de-DE-lara"
VOICE_B     = "de-DE-matthias"
VOICE_SPEAK = "de-DE-lara"
SPEED       = -10
OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), "public", "audio")
TEMP_DIR    = os.path.join(OUTPUT_DIR, "tmp")
API_URL     = "https://api.murf.ai/v1/speech/generate"
PAUSE_MS    = 600

DIALOGS = [
    {
        "id": "dialog_tienda",
        "parts": [
            "Guten Tag! Was darf es sein?",
            "Ich haette gerne ein Brot und zwei Broetchen, bitte.",
            "Das macht zwei Euro fuenfzig.",
            "Bitte schoen. Auf Wiedersehen!",
        ]
    },
    {
        "id": "dialog_presentacion",
        "single_voice": True,
        "parts": [
            "Hallo! Ich heisse Sarah.",
            "Ich komme aus Spanien und wohne jetzt in Berlin.",
            "Ich lerne seit drei Monaten Deutsch.",
            "Es macht mir sehr viel Spass!",
        ]
    },
    {
        "id": "dialog_restaurante",
        "parts": [
            "Guten Abend! Ich haette gerne die Speisekarte.",
            "Natuerlich! Und zu trinken?",
            "Ein Wasser, bitte.",
            "Und zum Essen?",
            "Ich nehme das Schnitzel mit Pommes.",
        ]
    },
    {
        "id": "dialog_bahnhof",
        "parts": [
            "Guten Morgen! Eine Fahrkarte nach Muenchen, bitte.",
            "Einfach oder hin und zurueck?",
            "Hin und zurueck, bitte.",
            "Das macht vierzig Euro.",
            "Danke schoen!",
        ]
    },
]

SPEAK_FILES = [
    {"id": "speak_wie_heisst",  "text": "Wie heisst du?"},
    {"id": "speak_wo_wohnst",   "text": "Wo wohnst du?"},
    {"id": "speak_was_machst",  "text": "Was machst du gern?"},
    {"id": "speak_komme",       "text": "Ich komme aus Spanien."},
    {"id": "speak_spreche",     "text": "Ich spreche ein bisschen Deutsch."},
    {"id": "speak_lerne",       "text": "Ich lerne Deutsch, weil ich es sehr schoen finde."},
]

def load_api_key():
    key_file = os.path.join(os.path.dirname(__file__), "murf_key.txt")
    if not os.path.exists(key_file):
        print(f"FEHLER: murf_key.txt nicht gefunden!")
        exit(1)
    with open(key_file) as f:
        return f.read().strip()

def generate_mp3(api_key, text, voice_id, dest_path):
    payload = json.dumps({
        "voiceId": voice_id,
        "text": text,
        "speed": SPEED,
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO",
    }).encode("utf-8")
    req = urllib.request.Request(
        API_URL, data=payload,
        headers={"Content-Type": "application/json", "api-key": api_key},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read().decode("utf-8"))
    audio_url = result.get("audioFile") or result.get("audio_file") or result.get("url")
    if not audio_url:
        raise Exception(f"Keine URL: {result}")
    urllib.request.urlretrieve(audio_url, dest_path)

def merge_mp3s(part_paths, output_path):
    combined = AudioSegment.empty()
    pause = AudioSegment.silent(duration=PAUSE_MS)
    for i, path in enumerate(part_paths):
        combined += AudioSegment.from_mp3(path)
        if i < len(part_paths) - 1:
            combined += pause
    combined.export(output_path, format="mp3")

def main():
    print("\n" + "="*55)
    print("  Deutsch App - Audio Generator (Zwei Stimmen)")
    print("="*55 + "\n")

    if not PYDUB_OK:
        print("FEHLER: pydub nicht installiert!")
        print("Ausfuehren:  pip install pydub")
        print("Dann ffmpeg: https://ffmpeg.org/download.html")
        input("\nEnter...")
        return

    api_key = load_api_key()
    print(f"API Key:  {api_key[:8]}...{api_key[-4:]} OK")
    print(f"Stimme A: {VOICE_A}  (erste Person)")
    print(f"Stimme B: {VOICE_B}  (zweite Person)\n")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)

    # Alte MP3s loeschen damit neu generiert wird
    for d in DIALOGS:
        p = os.path.join(OUTPUT_DIR, d["id"] + ".mp3")
        if os.path.exists(p):
            os.remove(p)
            print(f"  Geloescht: {d['id']}.mp3")

    success = 0
    failed  = 0

    print("\n-- Dialoge -----------------------------------------")
    for dialog in DIALOGS:
        dest = os.path.join(OUTPUT_DIR, f"{dialog['id']}.mp3")
        print(f"\n  {dialog['id']}:")
        part_paths = []
        ok = True

        for j, part_text in enumerate(dialog["parts"]):
            single = dialog.get("single_voice", False)
            voice  = VOICE_A if (single or j % 2 == 0) else VOICE_B
            label  = "A" if (single or j % 2 == 0) else "B"
            tmp    = os.path.join(TEMP_DIR, f"{dialog['id']}_part{j}.mp3")
            print(f"    [{label}] {part_text[:50]}", end="  ", flush=True)
            try:
                generate_mp3(api_key, part_text, voice, tmp)
                part_paths.append(tmp)
                print("OK")
                time.sleep(0.4)
            except Exception as e:
                print(f"FEHLER: {e}")
                ok = False
                failed += 1
                break

        if ok and part_paths:
            try:
                merge_mp3s(part_paths, dest)
                print(f"    => {dialog['id']}.mp3  ({os.path.getsize(dest)//1024} KB)  OK")
                success += 1
            except Exception as e:
                print(f"    => Merge FEHLER: {e}")
                failed += 1

        for p in part_paths:
            try: os.remove(p)
            except: pass

    print("\n-- Sprechuebungen ----------------------------------")
    for item in SPEAK_FILES:
        dest = os.path.join(OUTPUT_DIR, f"{item['id']}.mp3")
        if os.path.exists(dest): os.remove(dest)
        print(f"  {item['id']}...", end="  ", flush=True)
        try:
            generate_mp3(api_key, item["text"], VOICE_SPEAK, dest)
            print(f"OK  ({os.path.getsize(dest)//1024} KB)")
            success += 1
            time.sleep(0.4)
        except Exception as e:
            print(f"FEHLER: {e}")
            failed += 1

    try: os.rmdir(TEMP_DIR)
    except: pass

    print(f"\n{'='*55}")
    print(f"  Fertig!  {success} OK   {failed} Fehler")
    if failed == 0:
        print("  Naechster Schritt: deploy.bat ausfuehren!")
    print("="*55)
    input("\nEnter zum Beenden...")

if __name__ == "__main__":
    main()
