"""
Murf — Verfügbare deutsche Stimmen anzeigen
"""
import urllib.request
import json
import os

key_file = os.path.join(os.path.dirname(__file__), "murf_key.txt")
with open(key_file) as f:
    api_key = f.read().strip()

req = urllib.request.Request(
    "https://api.murf.ai/v1/speech/voices",
    headers={"api-key": api_key},
    method="GET"
)

with urllib.request.urlopen(req, timeout=15) as r:
    voices = json.loads(r.read().decode("utf-8"))

print("\nDeutsche Stimmen:\n" + "="*50)
for v in voices:
    lang = v.get("language") or v.get("locale") or ""
    vid  = v.get("voiceId") or v.get("voice_id") or v.get("id") or ""
    name = v.get("displayName") or v.get("name") or ""
    if "de" in lang.lower() or "german" in lang.lower():
        print(f"  ID:   {vid}")
        print(f"  Name: {name}  |  Lang: {lang}")
        print()

input("Enter drücken zum Beenden...")
