#!/usr/bin/env python3
"""Servidor estático local sin Node, con cabeceras de seguridad y sin caché obsoleta."""

from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


CSP = (
    "default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self'; "
    "frame-ancestors 'none'; frame-src 'none'; child-src 'none'; manifest-src 'none'; "
    "script-src 'self' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; script-src-attr 'none'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
    "img-src 'self' data: blob:; connect-src 'self'; media-src 'self'; worker-src 'none'"
)


class SecureStaticHandler(SimpleHTTPRequestHandler):
    server_version = "BuyniverseDev"
    sys_version = ""
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".vue": "text/plain; charset=utf-8"}

    def _trusted_host(self) -> bool:
        authority = self.headers.get("Host", "").lower()
        host = "[::1]" if authority.startswith("[::1]") else authority.split(":", 1)[0]
        return host in {"127.0.0.1", "localhost", "[::1]"}

    def _allowed(self) -> bool:
        raw_path = unquote(urlsplit(self.path).path)
        parts = PurePosixPath(raw_path).parts
        if "\\" in raw_path or ".." in parts or any(part.startswith(".") for part in parts if part not in {"/", "."}):
            return False
        if raw_path in {
            "/",
            "/buyniverse_vue",
            "/buyniverse_vue/",
            "/buyniverse_vue/index.html",
            "/robots.txt",
            "/sitemap.xml",
            "/manifest.json",
            "/buyniverse_vue/robots.txt",
            "/buyniverse_vue/sitemap.xml",
            "/buyniverse_vue/manifest.json",
        }:
            return True
        spa_prefixes = (
            "/buyniverse_vue/dashboard",
            "/buyniverse_vue/procurement",
            "/buyniverse_vue/clients",
            "/buyniverse_vue/suppliers",
            "/buyniverse_vue/leads",
            "/buyniverse_vue/projects",
            "/buyniverse_vue/project",
            "/buyniverse_vue/invoices",
            "/buyniverse_vue/estimates",
            "/buyniverse_vue/payments",
            "/buyniverse_vue/products",
            "/buyniverse_vue/expenses",
            "/buyniverse_vue/messages",
            "/buyniverse_vue/post-job",
            "/buyniverse_vue/job",
            "/buyniverse_vue/client",
            "/buyniverse_vue/profile",
            "/buyniverse_vue/agency",
            "/buyniverse_vue/contract",
            "/buyniverse_vue/find-talent",
            "/buyniverse_vue/saved-jobs",
            "/buyniverse_vue/browse-services",
            "/buyniverse_vue/gig",
            "/buyniverse_vue/admin",
        )
        if any(raw_path.startswith(prefix) for prefix in spa_prefixes) and not PurePosixPath(raw_path).suffix:
            return True
        if raw_path.startswith("/buyniverse_vue/app/"):
            return PurePosixPath(raw_path).suffix.lower() in {".js", ".vue"}
        if raw_path.startswith("/buyniverse_vue/assets/"):
            return PurePosixPath(raw_path).suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".svg", ".json"}
        return raw_path in {"/lib/web-common/browser.js", "/lib/procurement-common/browser.js"}

    def _reject_untrusted(self) -> bool:
        if self._trusted_host():
            return False
        self.send_error(421)
        return True

    def do_GET(self) -> None:
        if self._reject_untrusted():
            return
        if not self._allowed():
            self.send_error(404)
            return
        raw_path = unquote(urlsplit(self.path).path)
        spa_prefixes = (
            "/buyniverse_vue/dashboard",
            "/buyniverse_vue/procurement",
            "/buyniverse_vue/clients",
            "/buyniverse_vue/suppliers",
            "/buyniverse_vue/leads",
            "/buyniverse_vue/projects",
            "/buyniverse_vue/project",
            "/buyniverse_vue/invoices",
            "/buyniverse_vue/estimates",
            "/buyniverse_vue/payments",
            "/buyniverse_vue/products",
            "/buyniverse_vue/expenses",
            "/buyniverse_vue/messages",
            "/buyniverse_vue/post-job",
            "/buyniverse_vue/job",
            "/buyniverse_vue/client",
            "/buyniverse_vue/profile",
            "/buyniverse_vue/agency",
            "/buyniverse_vue/contract",
            "/buyniverse_vue/find-talent",
            "/buyniverse_vue/saved-jobs",
            "/buyniverse_vue/browse-services",
            "/buyniverse_vue/gig",
            "/buyniverse_vue/admin",
        )
        if any(raw_path.startswith(prefix) for prefix in spa_prefixes) and not PurePosixPath(raw_path).suffix:
            self.path = "/buyniverse_vue/index.html"
            return super().do_GET()
        if urlsplit(self.path).path == "/":
            self.send_response(302)
            self.send_header("Location", "/buyniverse_vue/")
            self.end_headers()
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        if self._reject_untrusted():
            return
        if not self._allowed():
            self.send_error(404)
            return
        super().do_HEAD()

    def _method_not_allowed(self) -> None:
        self.send_response(405)
        self.send_header("Allow", "GET, HEAD")
        self.end_headers()

    do_POST = do_PUT = do_PATCH = do_DELETE = do_OPTIONS = do_TRACE = _method_not_allowed

    def list_directory(self, path: str):
        self.send_error(404)
        return None

    def end_headers(self) -> None:
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Origin-Agent-Cluster", "?1")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Buyniverse Vue securely without Node.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4178)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    root = args.root.resolve()
    handler = functools.partial(SecureStaticHandler, directory=str(root))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {root} at http://{args.host}:{args.port}/buyniverse_vue/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
