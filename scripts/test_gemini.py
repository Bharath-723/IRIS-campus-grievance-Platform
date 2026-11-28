import urllib.request
import urllib.error
import json
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY", "")
print("Key length:", len(key))

# Test with gemini-2.0-flash, gemini-1.5-flash, etc.
models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]

for model in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": "Say test"}]}]
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = resp.read().decode()
            print(f"SUCCESS on {model}: {data[:100]}")
            break
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"ERROR on {model} ({e.code}): {err_body}")
    except Exception as e:
        print(f"FAILED on {model}: {e}")
