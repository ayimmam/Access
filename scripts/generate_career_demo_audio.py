"""Generate clearly labeled synthetic job-summary recordings for the public fixture."""

from pathlib import Path
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "examples" / "assets" / "career-audio"
SUMMARIES = {
    "demo-copywriter": "Copywriter. Example Creative Studio. Write clear English and Amharic content for learning campaigns. This fictional role is remote and offers written interview questions and flexible hours.",
    "demo-data-assistant": "Learning data assistant. Example Learning Cooperative. Organize learning records and check spreadsheet quality. This fictional part-time role offers a step-free workplace, written interview questions and flexible hours.",
    "demo-machine-operator": "C N C bending operator. Example Manufacturing Workshop. Use a bending machine with supervised training and clear safety instructions. This fictional on-site role provides written instructions and a step-free workplace.",
    "demo-web-developer": "Junior web developer. Example Digital Workshop. Build accessible H T M L pages and test keyboard interactions. This fictional freelance role is remote, with written instructions and flexible hours.",
}


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        for job_id, text in SUMMARIES.items():
            source = Path(directory) / f"{job_id}.aiff"
            target = OUTPUT / f"{job_id}.mp3"
            subprocess.run(["say", "-v", "Samantha", "-r", "185", "-o", str(source), text], check=True)
            subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(source), "-ac", "1", "-b:a", "48k", str(target)], check=True)
            print(target)


if __name__ == "__main__":
    main()
