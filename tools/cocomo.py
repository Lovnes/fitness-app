"""Basic COCOMO (Boehm, 1981) estimator.

    Effort   E = a * KLOC^b          (person-months)
    Duration D = c * E^d             (months)
    Staff    P = E / D               (people)

Usage:
    python3 tools/cocomo.py                 # measure this project's LOC
    python3 tools/cocomo.py --kloc 2.5      # estimate for a planned size
    python3 tools/cocomo.py --cost 3000     # add cost at <amount> per person-month
"""
import argparse
import io
import os
import tokenize

MODES = {
    #               a     b     c     d
    "organic":       (2.4, 1.05, 2.5, 0.38),
    "semi-detached": (3.0, 1.12, 2.5, 0.35),
    "embedded":      (3.6, 1.20, 2.5, 0.32),
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCT = ["main.py", "fitness"]
TEST = ["tests"]


def estimate(kloc, mode="organic"):
    a, b, c, d = MODES[mode]
    effort = a * kloc ** b
    duration = c * effort ** d
    return effort, duration, effort / duration


def sloc(path):
    """Physical source lines excluding blanks, comments and docstrings."""
    with open(path, "rb") as fh:
        src = fh.read().decode("utf-8")
    code_lines = set()
    prev = tokenize.INDENT
    for tok in tokenize.generate_tokens(io.StringIO(src).readline):
        if tok.type in (tokenize.COMMENT, tokenize.NL, tokenize.NEWLINE,
                        tokenize.INDENT, tokenize.DEDENT, tokenize.ENDMARKER):
            prev = tok.type if tok.type != tokenize.COMMENT else prev
            continue
        is_docstring = tok.type == tokenize.STRING and prev in (
            tokenize.INDENT, tokenize.NEWLINE, tokenize.DEDENT)
        if not is_docstring:
            code_lines.update(range(tok.start[0], tok.end[0] + 1))
        prev = tok.type
    return len(code_lines)


def count(targets):
    rows = []
    for target in targets:
        full = os.path.join(ROOT, target)
        files = [full] if os.path.isfile(full) else [
            os.path.join(dp, f) for dp, _, fs in os.walk(full) for f in fs if f.endswith(".py")]
        for f in sorted(files):
            rows.append((os.path.relpath(f, ROOT), sloc(f)))
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--kloc", type=float, help="planned size in KLOC (skip measuring)")
    ap.add_argument("--cost", type=float, help="cost per person-month")
    args = ap.parse_args()

    if args.kloc is None:
        product, tests = count(PRODUCT), count(TEST)
        print("Measured size (non-blank, non-comment, non-docstring lines)")
        for name, n in product:
            print(f"  {name:<28}{n:>6}")
        p_total, t_total = sum(n for _, n in product), sum(n for _, n in tests)
        print(f"  {'PRODUCT TOTAL':<28}{p_total:>6}")
        print(f"  {'(test code, not estimated)':<28}{t_total:>6}\n")
        kloc = p_total / 1000
    else:
        kloc = args.kloc

    print(f"Basic COCOMO for {kloc:.3f} KLOC")
    header = f"  {'Mode':<15}{'Effort PM':>10}{'Months':>9}{'Staff':>7}{'LOC/PM':>8}"
    if args.cost:
        header += f"{'Cost':>12}"
    print(header)
    for mode in MODES:
        e, d, p = estimate(kloc, mode)
        line = f"  {mode:<15}{e:>10.2f}{d:>9.2f}{p:>7.2f}{kloc * 1000 / e:>8.0f}"
        if args.cost:
            line += f"{e * args.cost:>12,.0f}"
        print(line)


if __name__ == "__main__":
    main()
