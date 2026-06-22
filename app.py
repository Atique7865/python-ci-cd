from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class CalculatorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()


def run(host="127.0.0.1", port=8000):
    server = ThreadingHTTPServer((host, port), CalculatorHandler)
    print(f"Calculator running at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
