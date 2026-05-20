#!/usr/bin/env python3
"""Sync GitHub Actions secrets/variables for dgomez-lab/qa-pdf-editor (regression Step 2)."""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from nacl import encoding, public

OWNER = "dgomez-lab"
REPO = "qa-pdf-editor"
REPO_ROOT = Path(__file__).resolve().parent.parent

STAGING_DEFAULTS = {
    "QAI_TOKEN_PARAM": "x-token-qa=niGqCYH7McqERAB",
    "PLAYWRIGHT_CRM_USER": "dgomez@leadtech.com",
    "PLAYWRIGHT_CRM_PASSWORD": "leadtech123456",
    "PLAYWRIGHT_QA_API_KEY": "t0k3nS3vr3t",
}

VARIABLES = {
    "SEO_LOGIN_PATHNAME": "/login",
    "PLAYWRIGHT_APP": "mergedpdf",
}


def load_dotenv(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        out[key] = val
    return out


def token() -> str:
    t = (os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or "").strip()
    if not t:
        print("Missing GH_TOKEN or GITHUB_TOKEN (scopes: repo, read:org if needed).", file=sys.stderr)
        sys.exit(1)
    return t


def api(method: str, path: str, body: dict | None = None) -> dict | None:
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token()}",
            "X-GitHub-Api-Version": "2022-11-28",
            **({"Content-Type": "application/json"} if data else {}),
        },
    )
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        try:
            msg = json.loads(err).get("message", err)
        except json.JSONDecodeError:
            msg = err
        raise RuntimeError(f"{method} {path} → {e.code}: {msg}") from e


def encrypt_secret(public_key_b64: str, secret_value: str) -> str:
    pk = public.PublicKey(public_key_b64.encode("utf-8"), encoding.Base64Encoder())
    sealed = public.SealedBox(pk)
    encrypted = sealed.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")


def set_secret(name: str, value: str) -> None:
    key_info = api("GET", f"/repos/{OWNER}/{REPO}/actions/secrets/public-key")
    api(
        "PUT",
        f"/repos/{OWNER}/{REPO}/actions/secrets/{name}",
        {
            "encrypted_value": encrypt_secret(key_info["key"], value),
            "key_id": key_info["key_id"],
        },
    )
    print(f"secret    {name}  ✓")


def set_variable(name: str, value: str) -> None:
    try:
        api("PATCH", f"/repos/{OWNER}/{REPO}/actions/variables/{name}", {"value": value})
        print(f"variable  {name}  ✓ (updated)")
    except RuntimeError as e:
        if "404" not in str(e):
            raise
        api("POST", f"/repos/{OWNER}/{REPO}/actions/variables", {"name": name, "value": value})
        print(f"variable  {name}  ✓ (created)")


def main() -> None:
    dotenv = {
        **load_dotenv(REPO_ROOT / ".env"),
        **load_dotenv(REPO_ROOT / ".env.local"),
    }

    secrets = {
        "QAI_TOKEN_PARAM": dotenv.get("QAI_TOKEN_PARAM") or STAGING_DEFAULTS["QAI_TOKEN_PARAM"],
        "PLAYWRIGHT_CRM_USER": dotenv.get("PLAYWRIGHT_CRM_USER") or STAGING_DEFAULTS["PLAYWRIGHT_CRM_USER"],
        "PLAYWRIGHT_CRM_PASSWORD": dotenv.get("PLAYWRIGHT_CRM_PASSWORD")
        or STAGING_DEFAULTS["PLAYWRIGHT_CRM_PASSWORD"],
        "PLAYWRIGHT_MAILPIT_USER": dotenv.get("PLAYWRIGHT_MAILPIT_USER", ""),
        "PLAYWRIGHT_MAILPIT_PASSWORD": dotenv.get("PLAYWRIGHT_MAILPIT_PASSWORD", ""),
        "PLAYWRIGHT_QA_API_KEY": dotenv.get("PLAYWRIGHT_QA_API_KEY") or STAGING_DEFAULTS["PLAYWRIGHT_QA_API_KEY"],
    }

    if not secrets["PLAYWRIGHT_MAILPIT_USER"] or not secrets["PLAYWRIGHT_MAILPIT_PASSWORD"]:
        print("Add PLAYWRIGHT_MAILPIT_USER/PASSWORD to .env before running.", file=sys.stderr)
        sys.exit(1)

    print(f"Configuring {OWNER}/{REPO} Actions env…\n")
    for k, v in VARIABLES.items():
        set_variable(k, v)
    for k, v in secrets.items():
        set_secret(k, v)
    print("\nDone. Trigger: Actions → Playwright → profile `regression`")


if __name__ == "__main__":
    main()
