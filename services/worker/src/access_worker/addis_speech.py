"""Only this private egress worker holds the Addis AI credential."""

import json
import os
import re
import sqlite3
import struct
import threading
import time
import uuid
from datetime import UTC, datetime

from access_core.career_speech import MAX_RESPONSE_BYTES, SpeechPrompt, prompt_messages
from access_core.speech_transport import SpeechFailure, fetch_bounded, json_object, recognized_text

PROVIDER = "https://api.addisassistant.com"
DESTINATIONS = {("https", "api.addisassistant.com", 443)}
SLOTS = threading.BoundedSemaphore(2)


def reserve_request():
    try:
        limit = int(os.environ.get("ACCESS_SPEECH_DAILY_REQUEST_LIMIT", "100"))
        if not 1 <= limit <= 200:
            raise SpeechFailure()
        path = os.environ.get("ACCESS_SPEECH_BUDGET_DB")
        if not path:
            raise SpeechFailure()
        now = datetime.now(UTC)
        day = now.date().isoformat()
        minute = int(now.timestamp()) // 60
        with sqlite3.connect(path, timeout=2) as database:
            database.execute("CREATE TABLE IF NOT EXISTS speech_budget (day TEXT PRIMARY KEY, requests INTEGER NOT NULL, minute INTEGER NOT NULL, recent INTEGER NOT NULL)")
            database.execute("BEGIN IMMEDIATE")
            database.execute("DELETE FROM speech_budget WHERE day <> ?", (day,))
            row = database.execute("SELECT requests, minute, recent FROM speech_budget WHERE day = ?", (day,)).fetchone()
            count, previous_minute, recent = row or (0, minute, 0)
            recent = recent if minute == previous_minute else 0
            if count >= limit:
                raise SpeechFailure(429, 86400 - int(now.timestamp()) % 86400)
            if recent >= 30:
                raise SpeechFailure(429, 60 - int(now.timestamp()) % 60)
            database.execute("INSERT OR REPLACE INTO speech_budget VALUES (?, ?, ?, ?)", (day, count + 1, minute, recent + 1))
    except (ValueError, OSError, sqlite3.Error):
        raise SpeechFailure() from None


class AddisSpeech:
    def __init__(self):
        self.voice: str | None = None
        self.voice_until = 0.0
        self.voice_lock = threading.Lock()

    def request(self, path: str, *, body: bytes | None = None, content_type: str = "application/json", audio: bool = False):
        key = os.environ.get("ADDIS_API_KEY", "")
        if not key or len(key) > 512 or not key.isascii() or any(ord(char) < 33 for char in key):
            raise SpeechFailure()
        return fetch_bounded(PROVIDER + path, destinations=DESTINATIONS,
                             headers={"x-api-key": key, "Content-Type": content_type}, body=body,
                             content_types={"application/octet-stream", "audio/mpeg", "application/json"} if audio else {"application/json"},
                             limit=MAX_RESPONSE_BYTES + 131072 if audio else 131072)

    def current_voice(self) -> str:
        with self.voice_lock:
            if self.voice and time.monotonic() < self.voice_until:
                return self.voice
            payload, _ = self.request("/api/v1/voice/voices?language=am")
            voices = json_object(payload).get("data")
            if not isinstance(voices, list):
                raise SpeechFailure()
            available = [voice for voice in voices if isinstance(voice, dict) and voice.get("language") == "am" and
                         voice.get("is_available") is True and isinstance(voice.get("id"), str) and re.fullmatch(r"am-[a-z0-9-]{1,60}", voice["id"])]
            if not available:
                raise SpeechFailure()
            self.voice = next((voice["id"] for voice in available if voice.get("is_default") is True), available[0]["id"])
            self.voice_until = time.monotonic() + 300
            return self.voice

    def transcribe(self, audio: bytes) -> str:
        request_id = str(uuid.uuid4())
        boundary = uuid.uuid4().hex
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="audio"; filename="{request_id}.wav"\r\n'
                'Content-Type: audio/wav\r\n\r\n').encode() + audio + f"\r\n--{boundary}--\r\n".encode()
        payload, _ = self.request(f"/api/v1/scribe/transcribe?language=am&backend=turbo&request_id={request_id}",
                                  body=body, content_type=f"multipart/form-data; boundary={boundary}")
        data = json_object(payload).get("data")
        return recognized_text(data.get("text") if isinstance(data, dict) else None)

    def synthesize(self, prompt: SpeechPrompt) -> bytes:
        text = " ".join(prompt_messages(prompt))
        if not 1 <= len(text) <= 3000:
            raise SpeechFailure(422)
        body = json.dumps({"text": text, "language": "am", "voice_id": self.current_voice(),
                           "output_format": "mp3_44100", "client_request_id": str(uuid.uuid4())}).encode()
        payload, headers = self.request("/api/v1/voice/generations/stream", body=body, audio=True)
        if headers.get("X-Addis-Audio-Protocol") != "mp3-frames-v1" or headers.get_content_type() == "application/json":
            raise SpeechFailure()
        position = 0
        chunks = []
        size = 0
        while position + 4 <= len(payload):
            length = struct.unpack_from(">I", payload, position)[0]
            position += 4
            if length == 0:
                if len(payload) - position > 131072:
                    raise SpeechFailure()
                completion = json_object(payload[position:])
                if not chunks or completion.get("error") or not isinstance(completion.get("data"), dict):
                    raise SpeechFailure()
                return b"".join(chunks)
            size += length
            if size > MAX_RESPONSE_BYTES or position + length > len(payload):
                raise SpeechFailure()
            chunks.append(payload[position:position + length])
            position += length
        raise SpeechFailure()


provider = AddisSpeech()
