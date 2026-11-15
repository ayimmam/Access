"""Restricted, bounded speech transport without payload or credential logging."""

import json
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


class SpeechFailure(Exception):
    def __init__(self, status: int = 503, retry_after: int = 60):
        self.status = status
        self.retry_after = retry_after
        super().__init__("Speech request unavailable")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        raise SpeechFailure()


def fetch_bounded(url: str, *, destinations: set[tuple[str, str, int]], headers: dict,
                  content_types: set[str], limit: int, body: bytes | None = None, timeout: int = 45):
    try:
        parsed = urlsplit(url)
        port = parsed.port if parsed.port is not None else (443 if parsed.scheme == "https" else 80)
        destination = (parsed.scheme, parsed.hostname, port)
        if destination not in destinations or parsed.username or parsed.password or parsed.fragment:
            raise SpeechFailure()
        request = Request(url, data=body, headers={**headers, "Accept-Encoding": "identity"})
        deadline = time.monotonic() + timeout
        with build_opener(ProxyHandler({}), NoRedirect()).open(request, timeout=timeout) as response:
            if response.status != 200 or response.headers.get_content_type() not in content_types:
                raise SpeechFailure()
            if response.headers.get("Content-Encoding", "identity") != "identity":
                raise SpeechFailure()
            chunks = []
            size = 0
            while True:
                if time.monotonic() > deadline:
                    raise SpeechFailure()
                chunk = response.read1(min(65536, limit + 1 - size))
                size += len(chunk)
                if size > limit:
                    raise SpeechFailure()
                if not chunk:
                    return b"".join(chunks), response.headers
                chunks.append(chunk)
    except HTTPError as error:
        retry = error.headers.get("Retry-After", "60")
        retry_after = max(1, min(86400, int(retry))) if retry.isascii() and retry.isdecimal() and len(retry) < 8 else 60
        error.close()
        raise SpeechFailure(error.code if error.code in {422, 429} else 503, retry_after) from None
    except (OSError, URLError, ValueError):
        raise SpeechFailure() from None


def json_object(data: bytes) -> dict:
    try:
        value = json.loads(data)
        if not isinstance(value, dict):
            raise ValueError()
        return value
    except (ValueError, UnicodeError, RecursionError):
        raise SpeechFailure() from None


def recognized_text(value) -> str:
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= 160 or any(ord(char) < 32 for char in value):
        raise SpeechFailure(422)
    return value.strip()
