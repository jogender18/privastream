"""WSGI entrypoint for the Pixora Shield MVP API."""

from src.web.backend.pixora_api import app

application = app
