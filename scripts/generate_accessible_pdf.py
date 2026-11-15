"""Generate the deterministic, tagged PDF prototype used by the public fixture."""

from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, BooleanObject, DictionaryObject, NameObject, NumberObject, TextStringObject
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "example lessons" / "w3c-contrast" / "accessibility-prototype.pdf"
TEMP = ROOT / "tmp" / "pdfs" / "w3c-contrast-untagged.pdf"

BLOCKS = [
    ("H1", "Colors with Good Contrast"),
    ("P", "Accessible PDF export prototype - version 1"),
    ("P", "This prototype provides document language, title metadata, a logical structure tree, headings, paragraphs, and page numbering. PDF/UA and screen-reader verification remain pending."),
    ("H2", "Transcript"),
    ("P", "Colors with good contrast make information easier to read for everyone."),
    ("P", "Choosing colors with poor contrast makes navigating, reading and interacting a real pain."),
    ("P", "Good design means sufficient contrast between foreground and background colors. That includes text on images, background gradients, buttons and other elements."),
    ("P", "WCAG defines specific contrast ratios depending on text size and weight."),
    ("P", "Contrast is also important for non-text content such as icons and graphs."),
    ("P", "Tools are available to help you check contrast combinations."),
    ("P", "Good contrast benefits people with low contrast sensitivity, which becomes more common as we age. It also helps everyone in glare and low-light conditions."),
    ("H2", "Source and review status"),
    ("P", "Source video: W3C Web Accessibility Initiative, Web Accessibility Perspectives - Colors with Good Contrast."),
    ("P", "English transcript wording is based on the W3C source. Amharic and Tigrigna caption translations are separate downloads produced with Hasab AI and await human review."),
]


def wrap(text: str, font: str, size: int, width: float) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if current and stringWidth(trial, font, size) > width:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    return lines


def draw_source() -> None:
    TEMP.parent.mkdir(parents=True, exist_ok=True)
    output = canvas.Canvas(str(TEMP), pagesize=(612, 792), pageCompression=1)
    output.setTitle("Colors with Good Contrast - accessible export prototype")
    output.setAuthor("Access public fixture")
    output.setSubject("Tagged learning transcript prototype; human PDF/UA verification pending")
    y = 738
    for mcid, (tag, text) in enumerate(BLOCKS):
        font, size, leading = ("Helvetica-Bold", 20, 25) if tag == "H1" else (("Helvetica-Bold", 14, 19) if tag == "H2" else ("Helvetica", 10, 15))
        lines = wrap(text, font, size, 500)
        needed = len(lines) * leading + 9
        if y - needed < 55:
            output.setFont("Helvetica", 8)
            output.drawRightString(558, 32, str(output.getPageNumber()))
            output.showPage()
            y = 738
        output.setFont(font, size)
        output._code.append(f"/{tag} <</MCID {mcid}>> BDC")
        for line in lines:
            output.drawString(54, y, line)
            y -= leading
        output._code.append("EMC")
        y -= 9
    output.setFont("Helvetica", 8)
    output.drawRightString(558, 32, str(output.getPageNumber()))
    output.save()


def add_structure() -> None:
    reader = PdfReader(TEMP)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    root = writer.root_object
    root[NameObject("/Lang")] = TextStringObject("en")
    root[NameObject("/MarkInfo")] = DictionaryObject({NameObject("/Marked"): BooleanObject(True)})
    structure = DictionaryObject({NameObject("/Type"): NameObject("/StructTreeRoot")})
    structure_ref = writer._add_object(structure)
    root[NameObject("/StructTreeRoot")] = structure_ref
    document = DictionaryObject({NameObject("/Type"): NameObject("/StructElem"), NameObject("/S"): NameObject("/Document"), NameObject("/P"): structure_ref})
    document_ref = writer._add_object(document)
    structure[NameObject("/K")] = ArrayObject([document_ref])
    children = ArrayObject()
    parent_arrays: dict[int, ArrayObject] = {}
    for mcid, (tag, _text) in enumerate(BLOCKS):
        page_index = 0
        # Current fixture fits on one page; keep this explicit so a later edit fails visibly.
        page = writer.pages[page_index]
        page[NameObject("/StructParents")] = NumberObject(page_index)
        child = DictionaryObject({
            NameObject("/Type"): NameObject("/StructElem"), NameObject("/S"): NameObject(f"/{tag}"),
            NameObject("/P"): document_ref, NameObject("/Pg"): page.indirect_reference, NameObject("/K"): NumberObject(mcid),
        })
        child_ref = writer._add_object(child)
        children.append(child_ref)
        parent_arrays.setdefault(page_index, ArrayObject()).append(child_ref)
    document[NameObject("/K")] = children
    nums = ArrayObject()
    for index, parents in sorted(parent_arrays.items()):
        nums.extend([NumberObject(index), parents])
    structure[NameObject("/ParentTree")] = writer._add_object(DictionaryObject({NameObject("/Nums"): nums}))
    structure[NameObject("/ParentTreeNextKey")] = NumberObject(len(parent_arrays))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("wb") as stream:
        writer.write(stream)


if __name__ == "__main__":
    draw_source()
    add_structure()
    print(OUTPUT)
