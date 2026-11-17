"""System Usability Scale (SUS) scorer for the usability test sessions.

Input CSV: participant,q1,...,q10 with answers 1 (strongly disagree) .. 5 (strongly agree).
    python3 tools/sus_score.py docs/usability/sus_responses.csv

Scoring (Brooke, 1996): odd items contribute (answer - 1), even items
contribute (5 - answer); the sum (0-40) is multiplied by 2.5 -> 0..100.
A score of 68 is the commonly cited average; >= 80.3 is "excellent" (grade A).
"""
import csv
import sys
from statistics import mean


def sus_score(answers):
    if len(answers) != 10:
        raise ValueError("SUS needs exactly 10 answers")
    for a in answers:
        if isinstance(a, bool) or not isinstance(a, int) or not 1 <= a <= 5:
            raise ValueError(f"SUS answers must be integers 1-5, got {a!r}")
    total = sum((a - 1) if i % 2 == 0 else (5 - a) for i, a in enumerate(answers))
    return total * 2.5


def grade(score):
    for cutoff, letter in ((80.3, "A"), (68, "B/C"), (51, "D")):
        if score >= cutoff:
            return letter
    return "F"


def main(path):
    with open(path, newline="") as fh:
        rows = [r for r in csv.reader(fh) if r and not r[0].startswith("#")]
    if rows and rows[0][0].lower() == "participant":
        rows = rows[1:]
    scores = []
    for row in rows:
        s = sus_score([int(x) for x in row[1:11]])
        scores.append(s)
        print(f"{row[0]:<6} {s:6.1f}  {grade(s)}")
    if scores:
        m = mean(scores)
        print(f"{'MEAN':<6} {m:6.1f}  {grade(m)}  (n={len(scores)})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "docs/usability/sus_responses.csv")
