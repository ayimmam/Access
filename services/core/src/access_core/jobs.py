"""Fictional career fixtures. No live employers, applicants or credentials."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict


class Job(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    id: str
    title: str
    organization: str
    location: str = "Addis Ababa, Ethiopia"
    sector: str
    employment_type: Literal["Full-time", "Part-time", "Freelance"]
    workplace: Literal["On-site", "Remote", "Hybrid"]
    experience: Literal["Entry", "Junior", "Intermediate"]
    salary: str = "Pay discussed before interview"
    deadline: date = date(2026, 12, 15)
    summary: str
    responsibilities: tuple[str, ...]
    skills: tuple[str, ...]
    support: tuple[str, ...]
    demo: Literal[True] = True


JOBS = (
    Job(id="demo-copywriter", title="Copywriter", organization="Example Creative Studio",
        sector="Marketing", employment_type="Full-time", workplace="Remote", experience="Junior",
        summary="Write clear English and Amharic content for learning campaigns. This fictional role is remote and offers written interview questions and flexible hours.",
        responsibilities=("Draft short campaign messages.", "Review language with an editor.", "Use feedback to improve clarity."),
        skills=("Writing", "Communication", "Editing"), support=("Written interview", "Flexible hours")),
    Job(id="demo-data-assistant", title="Learning data assistant", organization="Example Learning Cooperative",
        sector="Technology", employment_type="Part-time", workplace="Hybrid", experience="Entry",
        salary="12,000 ETB per month · fictional example",
        summary="Organize learning records and check spreadsheet quality. This fictional part-time role offers a step-free workplace, written interview questions and flexible hours.",
        responsibilities=("Check sample data for missing values.", "Prepare simple spreadsheet summaries.", "Document corrections without exposing learner information."),
        skills=("Spreadsheets", "Data quality", "Documentation"), support=("Step-free workplace", "Written interview", "Flexible hours")),
    Job(id="demo-machine-operator", title="CNC bending operator", organization="Example Manufacturing Workshop",
        sector="Manufacturing", employment_type="Full-time", workplace="On-site", experience="Junior",
        summary="Use a bending machine with supervised training and clear safety instructions. This fictional on-site role provides written instructions and a step-free workplace.",
        responsibilities=("Read the approved design and safety checklist.", "Operate equipment after supervised training.", "Check finished parts with the production team."),
        skills=("Machine operation", "Safety", "Quality checks"), support=("Written instructions", "Step-free workplace")),
    Job(id="demo-web-developer", title="Junior web developer", organization="Example Digital Workshop",
        sector="Technology", employment_type="Freelance", workplace="Remote", experience="Junior",
        summary="Build accessible HTML pages and test keyboard interactions. This fictional freelance role is remote, with written instructions and flexible hours.",
        responsibilities=("Build semantic HTML and responsive CSS.", "Test forms and navigation with a keyboard.", "Document changes for another contributor."),
        skills=("HTML", "CSS", "Accessibility"), support=("Written instructions", "Flexible hours")),
)


class DemoVerification(BaseModel):
    status: Literal["demo-valid", "demo-revoked", "unknown"]
    course_name: str | None = None
    issue_date: date | None = None


def verify_demo(identifier: str) -> DemoVerification:
    records = {
        "DEMO-LEARNING-001": DemoVerification(status="demo-valid", course_name="Learning foundations — fictional", issue_date=date(2026, 11, 14)),
        "DEMO-REVOKED-001": DemoVerification(status="demo-revoked", course_name="Learning foundations — fictional", issue_date=date(2026, 11, 14)),
    }
    return records.get(identifier, DemoVerification(status="unknown"))
