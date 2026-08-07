#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


def load_setup_module():
    path = Path(__file__).resolve().parent / "setup-github-actions-env.py"
    spec = importlib.util.spec_from_file_location("setup_github_actions_env", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class LoadDotenvTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mod = load_setup_module()

    def test_missing_file_returns_empty_mapping(self) -> None:
        missing = Path(tempfile.gettempdir()) / "qa-pdf-editor-missing.env"
        if missing.exists():
            missing.unlink()
        self.assertEqual(self.mod.load_dotenv(missing), {})

    def test_parses_quotes_comments_and_skips_invalid_lines(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text(
                "\n".join(
                    [
                        "# comment",
                        "",
                        "PLAIN=value",
                        'DOUBLE="quoted value"',
                        "SINGLE='another value'",
                        "SPACED = spaced-value ",
                        "NO_EQUALS",
                        "EMPTY=",
                        "PLAYWRIGHT_MAILPIT_USER=mail-user",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            parsed = self.mod.load_dotenv(env_path)

        self.assertEqual(
            parsed,
            {
                "PLAIN": "value",
                "DOUBLE": "quoted value",
                "SINGLE": "another value",
                "SPACED": "spaced-value",
                "EMPTY": "",
                "PLAYWRIGHT_MAILPIT_USER": "mail-user",
            },
        )
        self.assertNotIn("NO_EQUALS", parsed)
        self.assertNotIn("QAI_TOKEN_PARAM", parsed)


if __name__ == "__main__":
    unittest.main()
