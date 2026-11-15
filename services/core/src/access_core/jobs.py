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
    Job(id="demo-library-assistant", title="Library assistant", organization="Example Reading Room",
        sector="Education", employment_type="Part-time", workplace="On-site", experience="Entry",
        summary="Help visitors find books and organize reading sessions. This fictional role offers written instructions and a step-free workplace.",
        responsibilities=("Arrange books by topic.", "Help visitors locate reading materials.", "Prepare a quiet reading space."),
        skills=("Organization", "Reading", "Customer support"), support=("Written instructions", "Step-free workplace")),
    Job(id="demo-customer-support", title="Customer support assistant", organization="Example Help Desk",
        sector="Services", employment_type="Full-time", workplace="Remote", experience="Entry",
        summary="Answer practice customer questions by email and chat. This fictional remote role provides written instructions and flexible hours.",
        responsibilities=("Read sample customer questions.", "Write clear replies using a guide.", "Flag questions that need a supervisor."),
        skills=("Communication", "Email", "Problem solving"), support=("Written instructions", "Flexible hours")),
    Job(id="demo-bookkeeper", title="Junior bookkeeper", organization="Example Community Accounts",
        sector="Finance", employment_type="Part-time", workplace="Hybrid", experience="Junior",
        summary="Check sample receipts and prepare monthly totals. This fictional role offers flexible hours and a step-free workplace.",
        responsibilities=("Match sample receipts to entries.", "Calculate practice monthly totals.", "Review discrepancies with a mentor."),
        skills=("Arithmetic", "Bookkeeping", "Attention to detail"), support=("Flexible hours", "Step-free workplace")),
    Job(id="demo-garden-assistant", title="Garden assistant", organization="Example City Garden",
        sector="Agriculture", employment_type="Full-time", workplace="On-site", experience="Entry",
        summary="Care for demonstration plants with supervised training. This fictional role provides written instructions and flexible hours.",
        responsibilities=("Follow the watering schedule.", "Label seedlings clearly.", "Check tools with a supervisor."),
        skills=("Plant care", "Organization", "Safety"), support=("Written instructions", "Flexible hours")),
    Job(id="demo-graphic-designer", title="Graphic designer", organization="Example Visual Studio",
        sector="Marketing", employment_type="Freelance", workplace="Remote", experience="Junior",
        summary="Create clear posters for practice learning events. This fictional remote role offers flexible hours and written instructions.",
        responsibilities=("Sketch poster layouts.", "Check text contrast and readability.", "Revise designs after feedback."),
        skills=("Design", "Typography", "Accessibility"), support=("Flexible hours", "Written instructions")),
    Job(id="demo-logistics-assistant", title="Logistics assistant", organization="Example Supply Cooperative",
        sector="Services", employment_type="Full-time", workplace="Hybrid", experience="Entry",
        summary="Plan sample deliveries and check fictional inventory lists. This fictional role has written instructions and a step-free workplace.",
        responsibilities=("Check practice inventory lists.", "Plan a sample delivery route.", "Share schedule changes with the team."),
        skills=("Planning", "Organization", "Communication"), support=("Written instructions", "Step-free workplace")),
    Job(id="demo-learning-facilitator", title="Learning facilitator", organization="Example Skills Circle",
        sector="Education", employment_type="Part-time", workplace="Hybrid", experience="Intermediate",
        summary="Guide small practice study groups using accessible materials. This fictional role offers flexible hours and written instructions.",
        responsibilities=("Prepare a short study activity.", "Invite learners to choose how they participate.", "Summarize questions for the next session."),
        skills=("Teaching", "Communication", "Accessibility"), support=("Flexible hours", "Written instructions")),
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
