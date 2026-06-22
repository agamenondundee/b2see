#!/usr/bin/env python3
"""Cache-busting for the browser based ISMS (no build step).

GitHub Pages caches the ES module files in the browser for about ten minutes, so
after a deploy the old scripts and styles can linger and changes do not appear.
This tags every local module import and the entry <script>/<link> in index.html
with a `?v=<VERSION>` query, so a new release is fetched fresh.

Usage:  python3 scripts/bump-cache-version.py <VERSION>
e.g.    python3 scripts/bump-cache-version.py 3

Run it, with a new version, whenever you change app.js, store.js, the data files
or styles.css, then commit.
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: bump-cache-version.py <VERSION>")
    ver = sys.argv[1]

    # In .js files: version every relative specifier, including subfolders such as
    # "./data/controls.js" and "./documents-data.js".
    js_re = re.compile(r"""(['"])(\.{1,2}/[A-Za-z0-9_./-]+\.js)(\?v=[^'"]*)?\1""")
    js_files = [ROOT / "app.js", ROOT / "store.js"] + sorted((ROOT / "data").glob("*.js"))
    for path in js_files:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        new = js_re.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={ver}{m.group(1)}", text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            print(f"versioned imports in {path.relative_to(ROOT)}")

    # In index.html: version the entry script and the stylesheet.
    html_re = re.compile(r"""(src|href)=(['"])([A-Za-z0-9_./-]+\.(?:js|css))(\?v=[^'"]*)?\2""")
    html = ROOT / "index.html"
    text = html.read_text(encoding="utf-8")
    new = html_re.sub(lambda m: f"{m.group(1)}={m.group(2)}{m.group(3)}?v={ver}{m.group(2)}", text)
    if new != text:
        html.write_text(new, encoding="utf-8")
        print("versioned entry references in index.html")


if __name__ == "__main__":
    main()
