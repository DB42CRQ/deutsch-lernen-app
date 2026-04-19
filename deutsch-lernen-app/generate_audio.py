"""
Deutsch App — Audio Generator
==============================
Generiert MP3s für:
  - 12 Dialoge (Escucha-Bereich)
  - 30 Sprechuebungen (Habla > Practicar)
  - 12 Phonetik-Beispiele (Habla > Fonetica)

Stimmen: Lara (weiblich) + Matthias (maennlich)
Benoetigt: pip install pydub  +  ffmpeg im PATH
API-Key: murf_key.txt (im selben Ordner)
"""
import urllib.request, json, os, time, shutil

try:
    from pydub import AudioSegment
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        AudioSegment.converter = ffmpeg
        AudioSegment.ffmpeg    = ffmpeg
    PYDUB_OK = True
except ImportError:
    PYDUB_OK = False

VOICE_A   = "de-DE-lara"       # Lara  — Satzbeispiele, Sprechuebungen, Phonetik
VOICE_B   = "de-DE-matthias"   # Matthias — Dialog Gegenstimme
SPEED     = -10
API_URL   = "https://api.murf.ai/v1/speech/generate"
PAUSE_MS  = 650
OUT_DIR   = os.path.join(os.path.dirname(__file__), "public", "audio")
TMP_DIR   = os.path.join(OUT_DIR, "tmp")

# ── 12 DIALOGE ───────────────────────────────────────────────
DIALOGS = [
  { "id":"dialog_tienda",
    "parts":["Guten Tag! Was darf es sein?",
             "Ich hätte gerne ein Brot und zwei Brötchen, bitte.",
             "Das macht zwei Euro fünfzig.",
             "Bitte schön. Auf Wiedersehen!"] },
  { "id":"dialog_presentacion", "single":True,
    "parts":["Hallo! Ich heiße Sarah.",
             "Ich komme aus Spanien und wohne jetzt in Berlin.",
             "Ich lerne seit drei Monaten Deutsch.",
             "Es macht mir sehr viel Spaß!"] },
  { "id":"dialog_rutina", "single":True,
    "parts":["Ich stehe jeden Morgen um sieben Uhr auf.",
             "Dann frühstücke ich und trinke Kaffee.",
             "Um acht Uhr fahre ich mit dem Bus zur Arbeit.",
             "Abends koche ich und sehe fern."] },
  { "id":"dialog_familia", "single":True,
    "parts":["Meine Familie ist nicht sehr groß.",
             "Ich habe einen Bruder und eine Schwester.",
             "Mein Bruder heißt Marco und ist zwanzig Jahre alt.",
             "Meine Schwester ist noch jung, sie ist erst zehn Jahre alt."] },
  { "id":"dialog_restaurante",
    "parts":["Guten Abend! Ich hätte gerne die Speisekarte.",
             "Natürlich! Und zu trinken?",
             "Ein Wasser, bitte.",
             "Und zum Essen?",
             "Ich nehme das Schnitzel mit Pommes.",
             "Sehr gerne. Das macht zusammen vierzehn Euro."] },
  { "id":"dialog_bahnhof",
    "parts":["Guten Morgen! Eine Fahrkarte nach München, bitte.",
             "Einfach oder hin und zurück?",
             "Hin und zurück, bitte.",
             "Wann möchten Sie fahren?",
             "Heute um zehn Uhr.",
             "Das macht vierzig Euro.",
             "Danke schön!"] },
  { "id":"dialog_telefon",
    "parts":["Hallo, hier ist Anna Müller. Kann ich bitte mit Herrn Weber sprechen?",
             "Tut mir leid, Herr Weber ist gerade nicht im Büro. Kann ich eine Nachricht hinterlassen?",
             "Ja, bitte. Sagen Sie ihm, dass ich morgen um neun Uhr anrufe."] },
  { "id":"dialog_arzt",
    "parts":["Guten Morgen. Was kann ich für Sie tun?",
             "Ich fühle mich nicht gut. Ich habe seit gestern Kopfschmerzen und Fieber.",
             "Seit wann haben Sie das Fieber?",
             "Seit heute Morgen.",
             "Ich schreibe Ihnen ein Rezept. Sie sollten viel trinken und sich ausruhen."] },
  { "id":"dialog_bewerbung",
    "parts":["Guten Morgen, Frau Garcia. Erzählen Sie mir bitte etwas über sich.",
             "Ich habe Wirtschaft studiert und fünf Jahre in einer Marketingagentur gearbeitet.",
             "Ich suche jetzt eine neue Herausforderung.",
             "Warum möchten Sie zu uns wechseln?",
             "Ihr Unternehmen hat einen sehr guten Ruf, und ich glaube, dass ich meine Kenntnisse hier gut einsetzen kann."] },
  { "id":"dialog_umwelt",
    "parts":["Ich finde, wir müssen mehr für die Umwelt tun. Der Klimawandel ist ein ernstes Problem.",
             "Da bin ich völlig einverstanden. Aber ich denke, dass die Regierung mehr Verantwortung übernehmen muss.",
             "Stimmt, aber auch jeder Einzelne kann etwas beitragen. Weniger Auto fahren zum Beispiel.",
             "Das ist richtig. Ich fahre seit letztem Jahr Fahrrad zur Arbeit."] },
  { "id":"dialog_wohnung",
    "parts":["Ich rufe wegen der Wohnung an, die Sie inseriert haben.",
             "Ja, die Wohnung hat drei Zimmer, eine Küche und ein Bad. Sie ist im vierten Stock.",
             "Wie hoch ist die Miete?",
             "Die Kaltmiete beträgt achthundert Euro. Mit Nebenkosten sind es neunhundert.",
             "Wäre es möglich, die Wohnung zu besichtigen?",
             "Natürlich. Wie wäre es mit Donnerstag um achtzehn Uhr?"] },
  # ── B2 ──────────────────────────────────────────────────────
  { "id":"dialog_b2_gehalt",
    "parts":["Frau Lehmann, Sie wollten mich sprechen. Worum geht es?",
             "Ja, ich möchte gerne über mein Gehalt sprechen. Ich arbeite jetzt seit drei Jahren hier und habe in dieser Zeit viel Verantwortung übernommen.",
             "Das stimmt, Ihre Leistungen sind sehr gut. Was haben Sie konkret im Sinn?",
             "Ich habe mir aktuelle Marktdaten angesehen. Für meine Position und Erfahrung liegt das übliche Gehalt etwa fünfzehn Prozent über meinem jetzigen.",
             "Das ist ein konkreter Vorschlag. Ich kann Ihnen heute keine endgültige Antwort geben, aber ich finde Ihren Ansatz überzeugend.",
             "Ich würde mich über eine kleine Erhöhung jetzt freuen, plus die Möglichkeit eines Bonus am Jahresende.",
             "Das klingt nach einem guten Kompromiss. Geben Sie mir eine Woche, dann sprechen wir weiter."] },
  { "id":"dialog_b2_podcast",
    "parts":["Willkommen zu unserem Podcast über Psychologie im Alltag. Heute sprechen wir über kognitive Verzerrungen.",
             "Kognitive Verzerrungen sind systematische Denkmuster, die unsere Wahrnehmung und Entscheidungen beeinflussen.",
             "Können Sie ein Beispiel nennen?",
             "Sehr gerne. Der Bestätigungsfehler ist weit verbreitet: Wir suchen unbewusst nur Informationen, die unsere bestehenden Ansichten bestätigen.",
             "Das klingt gefährlich. Betrifft das alle Menschen?",
             "Ja, alle. Aber Investoren und Politiker sind besonders anfällig, weil ihre Entscheidungen große Konsequenzen haben.",
             "Was können wir dagegen tun?",
             "Aktiv nach Gegenbeispielen suchen. Das klingt einfach, ist aber erstaunlich wirksam."] },
  { "id":"dialog_b2_wirtschaft",
    "parts":["Guten Abend und willkommen zur Wirtschaftsdebatte. Unser Thema heute: Inflation und Mittelstand.",
             "Die Situation ist ernst. Kleine und mittlere Betriebe kämpfen mit stark gestiegenen Energiekosten und können diese nicht vollständig weitergeben.",
             "Ich teile die Sorge, aber staatliche Subventionen sind keine Lösung. Sie verzerren den Wettbewerb und schaffen Abhängigkeiten.",
             "Ohne kurzfristige Hilfe werden viele Betriebe jedoch die nächsten zwei Jahre nicht überstehen.",
             "Da sind wir uns einig: Die Lage ist ernst und es besteht dringender Handlungsbedarf. Wir streiten nur über die Instrumente.",
             "Genau. Und das ist eine wichtige Diskussion, die wir führen müssen."] },
  { "id":"dialog_b2_ki",
    "parts":["Frau Professorin, künstliche Intelligenz ist überall. Was sind die größten ethischen Fragen?",
             "Es gibt drei Hauptbereiche: Datenschutz, Arbeitsmarkt und Regulierung. Beim Datenschutz beunruhigt mich besonders die Gesichtserkennung im öffentlichen Raum.",
             "Zur Massenüberwachung?",
             "Genau. Das ist ein erheblicher Eingriff in die Privatsphäre. Ohne klare gesetzliche Grenzen ist das gefährlich.",
             "Und der Arbeitsmarkt?",
             "KI ersetzt bestimmte Tätigkeiten, schafft aber auch neue. Die Herausforderung ist, dass der Wandel sehr schnell geht.",
             "Was fordern Sie von der Politik?",
             "Klare gesetzliche Rahmenbedingungen. Der Markt kann das alleine nicht regeln."] },
  { "id":"dialog_nachrichten", "single":True,
    "parts":["Guten Abend. Hier sind die Nachrichten.",
             "Die Bundesregierung hat heute ein neues Klimaschutzpaket beschlossen.",
             "Es sieht vor, den Anteil erneuerbarer Energien bis 2030 auf achtzig Prozent zu erhöhen.",
             "Kritiker bemängeln jedoch, dass die Maßnahmen nicht weit genug gehen.",
             "Außerdem hat die Europäische Zentralbank den Leitzins erneut angehoben."] },
]

# ── 30 SPRECHUEBUNGEN ────────────────────────────────────────
SPEAKING = [
  # A1
  {"id":"speak_wie_heißt",   "text":"Wie heißt du?"},
  {"id":"speak_wo_wohnst",    "text":"Wo wohnst du?"},
  {"id":"speak_was_machst",   "text":"Was machst du gern?"},
  {"id":"speak_komme",        "text":"Ich komme aus Spanien."},
  {"id":"speak_spreche",      "text":"Ich spreche ein bisschen Deutsch."},
  {"id":"speak_lerne",        "text":"Ich lerne Deutsch, weil ich es sehr schön finde."},
  {"id":"speak_guten_morgen", "text":"Guten Morgen! Wie geht es Ihnen?"},
  {"id":"speak_hunger",       "text":"Ich habe Hunger. Was gibt es zu essen?"},
  {"id":"speak_bahnhof",      "text":"Entschuldigung, wo ist der Bahnhof?"},
  {"id":"speak_müde",        "text":"Ich bin müde. Ich möchte schlafen."},
  # A2
  {"id":"speak_arbeit",       "text":"Ich arbeite seit zwei Jahren als Lehrerin."},
  {"id":"speak_berlin",       "text":"Letzte Woche war ich in Berlin. Es hat mir gut gefallen."},
  {"id":"speak_helfen",       "text":"Können Sie mir bitte helfen? Ich suche den Supermarkt."},
  {"id":"speak_kaffee",       "text":"Ich möchte einen Kaffee und ein Stück Kuchen, bitte."},
  {"id":"speak_gestern",      "text":"Was hast du gestern Abend gemacht?"},
  {"id":"speak_arzt_2",       "text":"Ich habe Bauchschmerzen. Ich brauche einen Arzt."},
  {"id":"speak_zug",          "text":"Der Zug fährt um zehn Uhr ab. Wir haben noch Zeit."},
  {"id":"speak_anrufen",      "text":"Ich rufe dich morgen an. Bis dann!"},
  {"id":"speak_wetter",       "text":"Das Wetter ist heute schön. Sollen wir spazieren gehen?"},
  {"id":"speak_deutschland",  "text":"Ich war noch nie in Deutschland, aber ich möchte gern hinfahren."},
  # B1
  {"id":"speak_meinung",      "text":"Meiner Meinung nach sollten wir mehr öffentliche Verkehrsmittel nutzen."},
  {"id":"speak_obwohl",       "text":"Obwohl es regnet, gehe ich heute noch joggen."},
  {"id":"speak_kurs",         "text":"Ich würde gerne an dem Kurs teilnehmen, falls noch Plätze frei sind."},
  {"id":"speak_fahrrad",      "text":"Da ich kein Auto habe, fahre ich immer mit dem Fahrrad zur Arbeit."},
  {"id":"speak_treffen",      "text":"Es wäre schön, wenn wir uns öfter treffen könnten."},
  {"id":"speak_wichtig",      "text":"Ich halte es für wichtig, dass man jeden Tag Deutsch übt."},
  {"id":"speak_fest",         "text":"Trotz des schlechten Wetters haben wir das Fest genossen."},
  {"id":"speak_erklären",    "text":"Könnten Sie mir erklären, wie das funktioniert?"},
  {"id":"speak_reisen",       "text":"Ich habe vor, im nächsten Jahr nach Deutschland zu reisen."},
  {"id":"speak_pünktlich",   "text":"Was ich an Deutschland besonders mag, ist die Pünktlichkeit."},
]

# ── 12 PHONETIK-BEISPIELE ────────────────────────────────────
# Alle drei Beispielwoerter werden mit Pause zusammengesetzt
PHONETICS = [
  {"id":"phon_ch",  "words":["ich", "mich", "nicht"]},
  {"id":"phon_ue",  "words":["über", "müde", "fünf"]},
  {"id":"phon_oe",  "words":["schön", "können", "hören"]},
  {"id":"phon_ss",  "words":["Straße", "heißen", "groß"]},
  {"id":"phon_w",   "words":["wie", "wo", "was"]},
  {"id":"phon_ei",  "words":["ein", "mein", "Stein"]},
  {"id":"phon_ie",  "words":["wie", "Liebe", "Brief"]},
  {"id":"phon_sp",  "words":["sprechen", "Spaß", "Sport"]},
  {"id":"phon_st",  "words":["Stadt", "stehen", "Straße"]},
  {"id":"phon_z",   "words":["Zeit", "Zug", "Zahl"]},
  {"id":"phon_r",   "words":["rot", "Regen", "Brot"]},
  {"id":"phon_ae",  "words":["spät", "Mädchen", "Käse"]},
]


def load_key():
    kf = os.path.join(os.path.dirname(__file__), "murf_key.txt")
    if not os.path.exists(kf):
        print("FEHLER: murf_key.txt fehlt!"); input("Enter..."); exit(1)
    with open(kf) as f:
        return f.read().strip()


def gen_mp3(api_key, text, voice, dest):
    payload = json.dumps({
        "voiceId": voice, "text": text, "speed": SPEED,
        "format": "MP3", "sampleRate": 24000, "channelType": "MONO"
    }).encode()
    req = urllib.request.Request(
        API_URL, data=payload,
        headers={"Content-Type": "application/json", "api-key": api_key},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read().decode())
    url = result.get("audioFile") or result.get("audio_file") or result.get("url")
    if not url:
        raise Exception("No URL: " + str(result))
    urllib.request.urlretrieve(url, dest)


def merge(parts, out, pause_ms=PAUSE_MS):
    combined = AudioSegment.empty()
    pause = AudioSegment.silent(duration=pause_ms)
    for i, p in enumerate(parts):
        combined += AudioSegment.from_mp3(p)
        if i < len(parts) - 1:
            combined += pause
    combined.export(out, format="mp3")


def skip_or_gen(dest, label):
    if os.path.exists(dest):
        sz = os.path.getsize(dest) // 1024
        print(f"  ⏭  {label} ({sz} KB, ya existe)")
        return True
    return False


def main():
    print("\n" + "="*55)
    print("  Deutsch App — Audio Generator")
    print("  12 Dialoge | 30 Sprech | 12 Phonetik = 54 MP3s")
    print("="*55 + "\n")

    if not PYDUB_OK:
        print("FEHLER: pip install pydub  und  ffmpeg im PATH benoetigt!")
        input("Enter..."); return

    api_key = load_key()
    print(f"Key: {api_key[:8]}...{api_key[-4:]} OK\n")
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(TMP_DIR, exist_ok=True)

    ok = 0; fail = 0

    # ── DIALOGE ──────────────────────────────────────────────
    print("── Dialoge (12) " + "─"*38)
    for d in DIALOGS:
        dest = os.path.join(OUT_DIR, d["id"] + ".mp3")
        if skip_or_gen(dest, d["id"] + ".mp3"): ok += 1; continue

        print(f"\n  ▶ {d['id']}:")
        parts = []; good = True
        for j, txt in enumerate(d["parts"]):
            single = d.get("single", False)
            voice  = VOICE_A if (single or j % 2 == 0) else VOICE_B
            lbl    = "Lara" if (single or j % 2 == 0) else "Matthias"
            tmp    = os.path.join(TMP_DIR, f"{d['id']}_p{j}.mp3")
            preview = txt[:60] + ("…" if len(txt) > 60 else "")
            print(f"    [{lbl}] {preview}", end="  ", flush=True)
            try:
                gen_mp3(api_key, txt, voice, tmp)
                parts.append(tmp); print("✓"); time.sleep(0.5)
            except Exception as e:
                print(f"✗ {e}"); good = False; fail += 1; break

        if good and parts:
            try:
                merge(parts, dest)
                print(f"    ✅ {d['id']}.mp3 — {os.path.getsize(dest)//1024} KB"); ok += 1
            except Exception as e:
                print(f"    ✗ Merge: {e}"); fail += 1
        for p in parts:
            try: os.remove(p)
            except: pass

    # ── SPRECHUEBUNGEN ───────────────────────────────────────
    print("\n\n── Sprechübungen (30) " + "─"*33)
    for s in SPEAKING:
        dest = os.path.join(OUT_DIR, s["id"] + ".mp3")
        if skip_or_gen(dest, s["id"] + ".mp3"): ok += 1; continue
        preview = s["text"][:60] + ("…" if len(s["text"]) > 60 else "")
        print(f"  ▶ {preview}", end="  ", flush=True)
        try:
            gen_mp3(api_key, s["text"], VOICE_A, dest)
            print(f"✓ ({os.path.getsize(dest)//1024} KB)"); ok += 1; time.sleep(0.5)
        except Exception as e:
            print(f"✗ {e}"); fail += 1

    # ── PHONETIK ─────────────────────────────────────────────
    print("\n\n── Phonetik (12) " + "─"*37)
    for ph in PHONETICS:
        dest = os.path.join(OUT_DIR, ph["id"] + ".mp3")
        if skip_or_gen(dest, ph["id"] + ".mp3"): ok += 1; continue
        print(f"  ▶ {ph['id']} — {', '.join(ph['words'])}", end="  ", flush=True)
        # Generate each word separately, then merge with longer pause
        parts = []; good = True
        for j, word in enumerate(ph["words"]):
            tmp = os.path.join(TMP_DIR, f"{ph['id']}_w{j}.mp3")
            try:
                gen_mp3(api_key, word, VOICE_A, tmp)
                parts.append(tmp); time.sleep(0.4)
            except Exception as e:
                print(f"✗ {e}"); good = False; fail += 1; break
        if good and parts:
            try:
                merge(parts, dest, pause_ms=900)  # longer pause between words
                print(f"✓ ({os.path.getsize(dest)//1024} KB)"); ok += 1
            except Exception as e:
                print(f"✗ Merge: {e}"); fail += 1
        for p in parts:
            try: os.remove(p)
            except: pass

    # ── FERTIG ───────────────────────────────────────────────
    try: os.rmdir(TMP_DIR)
    except: pass
    print("\n" + "="*55)
    print(f"  Fertig!  ✅ {ok} OK   ✗ {fail} Fehler")
    if fail == 0:
        print("  Nächster Schritt: deploy.bat ausführen!")
    else:
        print("  Tipp: Beim nächsten Durchlauf werden nur fehlende")
        print("        Dateien neu generiert.")
    print("="*55)
    input("\nEnter zum Beenden...")


if __name__ == "__main__":
    main()
