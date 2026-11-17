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
import os

MODES = {
    #               a     b     c     d
    "organic":       (2.4, 1.05, 2.5, 0.38),
    "semi-detached": (3.0, 1.12, 2.5, 0.35),
    "embedded":      (3.6, 1.20, 2.5, 0.32),
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join("mobile", "src")
EXTS = (".ts", ".tsx")


def estimate(kloc, mode="organic"):
    a, b, c, d = MODES[mode]
    effort = a * kloc ** b
    duration = c * effort ** d
    return effort, duration, effort / duration


def sloc(path):
    """Physical source lines excluding blanks and comments (// and /* */)."""
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    count, in_block = 0, False
    for line in text.splitlines():
        code = ""
        i = 0
        while i < len(line):
            if in_block:
                j = line.find("*/", i)
                if j < 0:
                    i = len(line)
                else:
                    in_block, i = False, j + 2
            elif line.startswith("/*", i):
                in_block, i = True, i + 2
            elif line.startswith("//", i):
                break
            else:
                code += line[i]
                i += 1
        if code.strip():
            count += 1
    return count


def count(tests):
    """Rows of (relative path, SLOC) for product code (tests=False) or test code (tests=True)."""
    rows = []
    for dp, _, fs in os.walk(os.path.join(ROOT, SRC)):
        is_test = "__tests__" in dp.split(os.sep)
        if is_test != tests:
            continue
        for f in sorted(fs):
            if f.endswith(EXTS):
                full = os.path.join(dp, f)
                rows.append((os.path.relpath(full, os.path.join(ROOT, SRC)), sloc(full)))
    return sorted(rows)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--kloc", type=float, help="planned size in KLOC (skip measuring)")
    ap.add_argument("--cost", type=float, help="cost per person-month")
    args = ap.parse_args()

    if args.kloc is None:
        product, tests = count(False), count(True)
        print("Measured size of mobile/src (non-blank, non-comment lines)")
        for name, n in product:
            print(f"  {name:<34}{n:>6}")
        p_total, t_total = sum(n for _, n in product), sum(n for _, n in tests)
        print(f"  {'PRODUCT TOTAL':<34}{p_total:>6}")
        print(f"  {'(test code, not estimated)':<34}{t_total:>6}\n")
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
