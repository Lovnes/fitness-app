"""Turn a failed build log into readable GitHub error annotations.

Build tools (Gradle, xcodebuild) end a failed build with long noise, which pushes the
real error out of view (and annotations are capped at ~4 KB each). This
script strips ANSI colours, drops the environment dump, finds the context
just before "FAILURE: Build failed" / "** BUILD FAILED **" / "error:", and emits it as a
few annotations that fit the size limit.

Usage: python3 report_build_error.py <log file> [label]
"""
import re
import sys

ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
ANCHORS = ("Command failed", "** BUILD FAILED **", "FAILURE: Build failed", "* What went wrong:")
MARKERS = ("BUILD FAILED", "[ERROR]", "Error:", "error:", "e: ")
CONTEXT_LINES = 120
CHUNK = 3800
MAX_ANNOTATIONS = 8


def clean(lines):
    out, in_env = [], False
    for line in lines:
        line = ANSI.sub("", line).rstrip()
        if "# ENVIRONMENT:" in line:
            in_env = True
            continue
        if in_env:
            if line.startswith("#     ") or not line.strip():
                continue
            in_env = False
        if line.strip():
            out.append(line)
    return out


def context(lines):
    anchor = None
    for i in range(len(lines) - 1, -1, -1):
        if any(a in lines[i] for a in ANCHORS):
            anchor = i
            break
    if anchor is None:
        for i in range(len(lines) - 1, -1, -1):
            if any(m in lines[i] for m in MARKERS):
                anchor = i
                break
    if anchor is None:
        anchor = len(lines) - 1
    return lines[max(0, anchor - CONTEXT_LINES): anchor + 3]


def escape(text):
    return text.replace("%", "%25").replace("\r", "").replace("\n", "%0A")


def main(path, label="Build"):
    with open(path, encoding="utf-8", errors="replace") as fh:
        lines = clean(fh.readlines())
    ctx = context(lines)

    chunks, current = [], ""
    for line in reversed(ctx):                       # most relevant (latest) first
        line = line[:600]
        if len(current) + len(line) + 1 > CHUNK:
            chunks.append(current)
            current = ""
        current = line + "\n" + current
    if current:
        chunks.append(current)
    chunks = chunks[:MAX_ANNOTATIONS]

    for n, chunk in enumerate(reversed(chunks), 1):  # print in log order
        print(f"::error title={label} failed - log excerpt {n}/{len(chunks)}::{escape(chunk)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "Build")
