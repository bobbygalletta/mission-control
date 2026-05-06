#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8791
DIRECTORY = os.path.expanduser("~/agent-mission-control")

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Route Camera server running on port {PORT}")
    httpd.serve_forever()
