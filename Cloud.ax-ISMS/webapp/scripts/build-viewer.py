#!/usr/bin/env python3
"""Pre-render the controlled documents to HTML so they can be read inside the app.

The browser cannot display Word or Excel files, so each .docx and .xlsx in the
bundle is converted once, at build time, into a clean HTML fragment under viewer/.
The application fetches viewer/<reference>.html and shows it in its reader. PDF
files are shown directly in an iframe and are not converted here.

No data URIs or images are embedded, so the fragments stay small; the original
file remains available to download in full fidelity.

Usage:  python3 scripts/build-viewer.py
"""
import html as htmlmod
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "documents-data.js"
OUT = ROOT / "viewer"


def records():
    text = DATA.read_text(encoding="utf-8")
    out = []
    for line in text.splitlines():
        ref = re.search(r"ref:\s*'([^']+)'", line)
        file = re.search(r"file:\s*'([^']+)'", line)
        if ref and file:
            out.append((ref.group(1), file.group(1)))
    return out


def sanitise(h):
    h = re.sub(r"(?is)<script.*?</script>", "", h)
    h = re.sub(r"(?is)<style.*?</style>", "", h)
    h = re.sub(r"(?i)\son\w+=\"[^\"]*\"", "", h)
    h = re.sub(r"(?i)\son\w+='[^']*'", "", h)
    h = re.sub(r"(?i)javascript:", "", h)
    h = re.sub(r"<img[^>]*>", "", h)
    return h.strip()


def from_docx(path):
    import mammoth
    no_img = mammoth.images.img_element(lambda image: {})
    with open(path, "rb") as f:
        return sanitise(mammoth.convert_to_html(f, convert_image=no_img).value)


def from_xlsx(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    parts = []
    for ws in wb.worksheets:
        rows = [r for r in ws.iter_rows(values_only=True) if any(c is not None for c in r)]
        if not rows:
            continue
        width = max(len(r) for r in rows)
        parts.append(f"<h3>{htmlmod.escape(ws.title)}</h3><table>")
        for i, row in enumerate(rows):
            cells = "".join(
                f"<{'th' if i == 0 else 'td'}>{htmlmod.escape('' if c is None else str(c))}</{'th' if i == 0 else 'td'}>"
                for c in list(row) + [None] * (width - len(row))
            )
            parts.append(f"<tr>{cells}</tr>")
        parts.append("</table>")
    return "".join(parts)


def plain_text(h):
    t = re.sub(r"(?s)<[^>]+>", " ", h)
    t = htmlmod.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def main():
    OUT.mkdir(exist_ok=True)
    recs = records()
    seen, built, skipped, index = set(), 0, 0, []
    for ref, file in recs:
        if ref in seen:
            print(f"warning: duplicate reference {ref}, skipping second", file=sys.stderr)
            continue
        seen.add(ref)
        src = ROOT / file
        if not src.exists():
            print(f"warning: missing {file}", file=sys.stderr)
            continue
        ext = src.suffix.lower()
        if ext == ".docx":
            body = from_docx(src)
        elif ext == ".xlsx":
            body = from_xlsx(src)
        elif ext == ".pdf":
            skipped += 1
            continue
        else:
            continue
        (OUT / f"{ref}.html").write_text(body or "<p>This document has no readable text content.</p>", encoding="utf-8")
        index.append({"ref": ref, "text": plain_text(body)})
        built += 1

    import json
    header = (
        "// Full text search index for the controlled documents, built from the rendered\n"
        "// content by scripts/build-viewer.py. Loaded on demand by the Search view.\n"
        "export const SEARCH_INDEX = "
    )
    (ROOT / "search-index.js").write_text(header + json.dumps(index, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"records: {len(recs)} | built: {built} | pdf shown live: {skipped} | viewer files: {len(list(OUT.glob('*.html')))} | index entries: {len(index)}")


if __name__ == "__main__":
    main()
