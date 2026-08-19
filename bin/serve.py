#!/usr/bin/env python3
"""Static file server for local development, with caching turned off.

`python -m http.server` sends Last-Modified and no Cache-Control, so browsers
apply heuristic caching: roughly 10% of the file's age. The simulator's oldest
and largest files (views.js, data.js) are exactly the ones that get cached for
hours, while a newly added file is always fetched fresh. That mix is what breaks
a session — new code navigating to a route the cached views.js never registered,
which surfaces as "No view registered for #/...".

No-store on every response keeps local development honest. Nothing here reaches
the deployed site; the Pages workflow copies portal/ and ui/ only.
"""

import argparse
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    # One line per request is fine; the full common-log format is noise here.
    def log_message(self, fmt, *args):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('port', type=int)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--directory', required=True)
    args = parser.parse_args()

    handler = partial(NoCacheHandler, directory=args.directory)
    HTTPServer((args.bind, args.port), handler).serve_forever()


if __name__ == '__main__':
    main()
