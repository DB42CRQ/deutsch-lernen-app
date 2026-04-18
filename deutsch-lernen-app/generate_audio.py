"""
Deutsch App — Audio Generator (alle Dialoge)
=============================================
Generiert MP3s für alle 12 Dialoge + 6 Sprechübungen.
Stimme A = Lara (F), Stimme B = Matthias (M).
Benötigt: pip install pydub  +  ffmpeg im PATH
"""
import urllib.request, urllib.error, json, os, time, shutil

try:
    from pydub import AudioSegment
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        AudioSegment.converter = ffmpeg
        AudioSegment.ffmpeg    = ffmpeg
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
  { "id":"dialog_tienda",
    "parts":["Guten Tag! Was darf es sein?","Ich hätte gerne ein Brot und zwei Brötchen, bitte.","Das macht zwei Euro fünfzig.","Bitte schön. Auf Wiedersehen!"] },
  { "id":"dialog_presentacion", "single_voice":True,
    "parts":["Hallo! Ich heisse Sarah.","Ich komme aus Spanien und wohne jetzt in Berlin.","Ich lerne seit drei Monaten Deutsch.","Es macht mir sehr viel Spass!"] },
  { "id":"dialog_rutina", "single_voice":True,
    "parts":["Ich stehe jeden Morgen um sieben Uhr auf.","Dann frühstücke ich und trinke Kaffee.","Um acht Uhr fahre ich mit dem Bus zur Arbeit.","Abends koche ich und sehe fern."] },
  { "id":"dialog_familia", "single_voice":True,
    "parts":["Meine Familie ist nicht sehr gross. Ich habe einen Bruder und eine Schwester.","Mein Bruder heisst Marco und ist zwanzig Jahre alt.","Meine Schwester ist noch jung, sie ist erst zehn Jahre alt."] },
  { "id":"dialog_restaurante",
    "parts":["Guten Abend! Ich hätte gerne die Speisekarte.","Natürlich! Und zu trinken?","Ein Wasser, bitte.","Und zum Essen?","Ich nehme das Schnitzel mit Pommes.","Sehr gerne. Das macht zusammen vierzehn Euro."] },
  { "id":"dialog_bahnhof",
    "parts":["Guten Morgen! Eine Fahrkarte nach München, bitte.","Einfach oder hin und zurück?","Hin und zurück, bitte.","Wann möchten Sie fahren?","Heute um zehn Uhr.","Das macht vierzig Euro.","Danke schön!"] },
  { "id":"dialog_telefon",
    "parts":["Hallo, hier ist Anna Müller. Kann ich bitte mit Herrn Weber sprechen?","Tut mir leid, Herr Weber ist gerade nicht im Büro. Kann ich eine Nachricht hinterlassen?","Ja, bitte. Sagen Sie ihm, dass ich morgen um neun Uhr anrufe."] },
  { "id":"dialog_arzt",
    "parts":["Guten Morgen. Was kann ich für Sie tun?","Ich fühle mich nicht gut. Ich habe seit gestern Kopfschmerzen und Fieber.","Seit wann haben Sie das Fieber?","Seit heute Morgen.","Ich schreibe Ihnen ein Rezept. Sie sollten viel trinken und sich ausruhen."] },
  { "id":"dialog_bewerbung",
    "parts":["Guten Morgen, Frau Garcia. Erzählen Sie mir bitte etwas über sich.","Ich habe Wirtschaft studiert und fünf Jahre in einer Marketingagentur gearbeitet. Ich suche jetzt eine neue Herausforderung.","Warum möchten Sie zu uns wechseln?","Ihr Unternehmen hat einen sehr guten Ruf, und ich glaube, dass ich meine Kenntnisse hier gut einsetzen kann."] },
  { "id":"dialog_umwelt",
    "parts":["Ich finde, wir müssen mehr für die Umwelt tun. Der Klimawandel ist ein ernstes Problem.","Da bin ich völlig einverstanden. Aber ich denke, dass die Regierung mehr Verantwortung übernehmen muss.","Stimmt, aber auch jeder Einzelne kann etwas beitragen. Weniger Auto fahren zum Beispiel.","Das ist richtig. Ich fahre seit letztem Jahr Fahrrad zur Arbeit."] },
  { "id":"dialog_wohnung",
    "parts":["Ich rufe wegen der Wohnung an, die Sie inseriert haben.","Ja, die Wohnung hat drei Zimmer, eine Küche und ein Bad. Sie ist im vierten Stock.","Wie hoch ist die Miete?","Die Kaltmiete betraegt achthundert Euro. Mit Nebenkosten sind es neunhundert.","Wäre es möglich, die Wohnung zu besichtigen?","Natürlich. Wie wäre es mit Donnerstag um achtzehn Uhr?"] },
  { "id":"dialog_nachrichten", "single_voice":True,
    "parts":["Guten Abend. Hier sind die Nachrichten.","Die Bundesregierung hat heute ein neues Klimaschutzpaket beschlossen.","Es sieht vor, den Anteil erneuerbarer Energien bis 2030 auf achtzig Prozent zu erhöhen.","Kritiker bemängeln jedoch, dass die Massnahmen nicht weit genug gehen.","Ausserdem hat die Europäische Zentralbank den Leitzins erneut angehoben."] },
]

SPEAK_FILES = [
  {"id":"speak_wie_heisst",  "text":"Wie heisst du?"},
  {"id":"speak_wo_wohnst",   "text":"Wo wohnst du?"},
  {"id":"speak_was_machst",  "text":"Was machst du gern?"},
  {"id":"speak_komme",       "text":"Ich komme aus Spanien."},
  {"id":"speak_spreche",     "text":"Ich spreche ein bisschen Deutsch."},
  {"id":"speak_lerne",       "text":"Ich lerne Deutsch, weil ich es sehr schön finde."},
]

def load_key():
    kf = os.path.join(os.path.dirname(__file__), "murf_key.txt")
    if not os.path.exists(kf): print("FEHLER: murf_key.txt fehlt!"); exit(1)
    with open(kf) as f: return f.read().strip()

def gen_mp3(api_key, text, voice, dest):
    payload = json.dumps({"voiceId":voice,"text":text,"speed":SPEED,"format":"MP3","sampleRate":24000,"channelType":"MONO"}).encode()
    req = urllib.request.Request(API_URL, data=payload,
          headers={"Content-Type":"application/json","api-key":api_key}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read().decode())
    url = result.get("audioFile") or result.get("audio_file") or result.get("url")
    if not url: raise Exception("No URL: "+str(result))
    urllib.request.urlretrieve(url, dest)

def merge(parts, out):
    combined = AudioSegment.empty()
    pause = AudioSegment.silent(duration=PAUSE_MS)
    for i,p in enumerate(parts):
        combined += AudioSegment.from_mp3(p)
        if i < len(parts)-1: combined += pause
    combined.export(out, format="mp3")

def main():
    print("\n================================================")
    print("  Deutsch App — Audio Generator (12 Dialoge)")
    print("================================================\n")
    if not PYDUB_OK:
        print("FEHLER: pip install pydub  +  ffmpeg noetig"); input("Enter..."); return

    api_key = load_key()
    print(f"Key: {api_key[:8]}...{api_key[-4:]} OK\n")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)

    ok=0; fail=0

    print("── Dialoge ──────────────────────────────────")
    for d in DIALOGS:
        dest = os.path.join(OUTPUT_DIR, d["id"]+".mp3")
        if os.path.exists(dest):
            print(f"  ⏭  {d['id']}.mp3 (ya existe)"); ok+=1; continue
        print(f"\n  {d['id']}:")
        parts=[]; good=True
        for j,txt in enumerate(d["parts"]):
            single = d.get("single_voice", False)
            voice = VOICE_A if (single or j%2==0) else VOICE_B
            lbl = "A" if (single or j%2==0) else "B"
            tmp = os.path.join(TEMP_DIR, f"{d['id']}_p{j}.mp3")
            print(f"    [{lbl}] {txt[:55]}...", end="  ", flush=True)
            try:
                gen_mp3(api_key, txt, voice, tmp)
                parts.append(tmp); print("OK"); time.sleep(0.4)
            except Exception as e:
                print(f"FEHLER: {e}"); good=False; fail+=1; break
        if good and parts:
            try:
                merge(parts, dest)
                print(f"    => {d['id']}.mp3 ({os.path.getsize(dest)//1024} KB) OK"); ok+=1
            except Exception as e:
                print(f"    Merge FEHLER: {e}"); fail+=1
        for p in parts:
            try: os.remove(p)
            except: pass

    print("\n── Sprechuebungen ───────────────────────────")
    for s in SPEAK_FILES:
        dest = os.path.join(OUTPUT_DIR, s["id"]+".mp3")
        if os.path.exists(dest):
            print(f"  ⏭  {s['id']}.mp3 (ya existe)"); ok+=1; continue
        print(f"  {s['id']}...", end="  ", flush=True)
        try:
            gen_mp3(api_key, s["text"], VOICE_SPEAK, dest)
            print(f"OK ({os.path.getsize(dest)//1024} KB)"); ok+=1; time.sleep(0.4)
        except Exception as e:
            print(f"FEHLER: {e}"); fail+=1

    try: os.rmdir(TEMP_DIR)
    except: pass
    print(f"\n================================================")
    print(f"  Fertig!  {ok} OK   {fail} Fehler")
    if fail==0: print("  Naechster Schritt: deploy.bat!")
    print("================================================")
    input("\nEnter zum Beenden...")

if __name__=="__main__": main()
