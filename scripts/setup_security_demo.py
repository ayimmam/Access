"""Create a pseudonymous local demonstration account without printing credentials."""

import getpass
import os
from pathlib import Path

from cryptography.fernet import Fernet

from access_api.security_store import SecurityStore


def main():
    root = Path(__file__).resolve().parents[1]
    folder = root / "artifacts/security"
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    key_path = Path(os.environ.get("ACCESS_SECURITY_KEY_FILE", str(folder / "demo.key")))
    if os.environ.get("ACCESS_SECURITY_KEY"):
        key = os.environ["ACCESS_SECURITY_KEY"].encode()
    elif key_path.exists():
        key = key_path.read_bytes().strip()
    else:
        key = Fernet.generate_key()
        descriptor = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(key)
    print("Use a fictional alias for co-design testing. Choose a passphrase of at least 15 characters.")
    alias = input("Demo alias: ")
    password = getpass.getpass("Passphrase (input hidden): ")
    if password != getpass.getpass("Confirm passphrase: "):
        raise SystemExit("Passphrases did not match. Run setup again.")
    store = SecurityStore(Path(os.environ.get("ACCESS_SECURITY_DB", str(folder / "demo.sqlite"))), key)
    store.create_account(alias, password)
    print("Demo account created. Restart the API and open http://127.0.0.1:8000/demo/privacy.")


if __name__ == "__main__":
    main()
