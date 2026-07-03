#!/usr/bin/env python3
"""Generate a branded Latitude Equipment hire packing slip PDF.

Reads hire JSON on stdin, writes PDF bytes on stdout.
"""
import json
import os
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdf-assets")
FONTS = os.path.join(ASSETS, "fonts")
LOGO_FULL = os.path.join(ASSETS, "logo_white_full_on_black.png")

for name, fname in {
    "Metropolis": "Metropolis-Regular.ttf",
    "Metropolis-Bold": "Metropolis-Bold.ttf",
    "Metropolis-Medium": "Metropolis-Medium.ttf",
    "Metropolis-ExtraLight": "Metropolis-ExtraLight.ttf",
}.items():
    pdfmetrics.registerFont(TTFont(name, os.path.join(FONTS, fname)))

BRAND_RED = colors.HexColor("#ED2643")
BLACK = colors.HexColor("#000000")
WHITE = colors.white
LIGHT_GREY = colors.HexColor("#F2F2F2")
MID_GREY = colors.HexColor("#888888")
RULE_GREY = colors.HexColor("#DDDDDD")

PAGE_W, PAGE_H = A4
MARGIN_L = MARGIN_R = 45
MARGIN_B = 50
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R  # 505pt

HEADER_H = 80
LOGO_H = 60
LOGO_W = LOGO_H * (1600 / 570)
SLIM_BAR_H = 38
FIRST_TOP = HEADER_H + 24

STYLES = {
    "DocTitle": ParagraphStyle("DocTitle", fontName="Metropolis-Bold",
        fontSize=20, textColor=BLACK, spaceAfter=3, leading=24),
    "DocSubtitle": ParagraphStyle("DocSubtitle", fontName="Metropolis-ExtraLight",
        fontSize=12, textColor=MID_GREY, spaceAfter=14, leading=15),
    "H1": ParagraphStyle("H1", fontName="Metropolis-Bold", fontSize=8.5,
        textColor=WHITE, backColor=BLACK, spaceBefore=16, spaceAfter=6,
        leading=13, borderPadding=(5, 6, 5, 6)),
    "Body": ParagraphStyle("Body", fontName="Metropolis", fontSize=9.5,
        textColor=BLACK, spaceAfter=6, leading=14),
    "InfoLabel": ParagraphStyle("InfoLabel", fontName="Metropolis-Bold",
        fontSize=8, textColor=MID_GREY, leading=11),
    "InfoValue": ParagraphStyle("InfoValue", fontName="Metropolis",
        fontSize=8.5, textColor=BLACK, leading=11),
    "Cell": ParagraphStyle("Cell", fontName="Metropolis", fontSize=8.5,
        textColor=BLACK, leading=11),
    "CellHead": ParagraphStyle("CellHead", fontName="Metropolis-Bold",
        fontSize=8.5, textColor=WHITE, leading=11),
    "SigLabel": ParagraphStyle("SigLabel", fontName="Metropolis-Bold",
        fontSize=8, textColor=MID_GREY, leading=14),
}


def draw_footer(canvas, doc):
    canvas.saveState()
    y = MARGIN_B - 22
    canvas.setStrokeColor(BRAND_RED)
    canvas.setLineWidth(1)
    canvas.line(MARGIN_L, y + 14, PAGE_W - MARGIN_R, y + 14)
    canvas.setFont("Metropolis-ExtraLight", 7.5)
    canvas.setFillColor(MID_GREY)
    canvas.drawString(MARGIN_L, y, "Latitude Equipment  |  latitudeequipment.com")
    canvas.drawRightString(PAGE_W - MARGIN_R, y, f"Page {doc.page}")
    canvas.restoreState()


def first_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLACK)
    canvas.rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
    canvas.setFillColor(BRAND_RED)
    canvas.rect(0, PAGE_H - 3, PAGE_W, 3, fill=1, stroke=0)
    logo_y = PAGE_H - HEADER_H + (HEADER_H - LOGO_H) / 2
    canvas.drawImage(LOGO_FULL, MARGIN_L, logo_y, width=LOGO_W, height=LOGO_H,
                     preserveAspectRatio=True, mask="auto")
    draw_footer(canvas, doc)
    canvas.restoreState()


def later_pages(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLACK)
    canvas.rect(0, PAGE_H - SLIM_BAR_H, PAGE_W, SLIM_BAR_H, fill=1, stroke=0)
    canvas.setFillColor(BRAND_RED)
    canvas.rect(0, PAGE_H - 3, PAGE_W, 3, fill=1, stroke=0)
    draw_footer(canvas, doc)
    canvas.restoreState()


def fmt_date(iso):
    if not iso:
        return ""
    from datetime import date, datetime
    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        d = datetime.strptime(iso[:10], "%Y-%m-%d")
    return d.strftime("%d %B %Y")


def build_story(hire):
    story = []
    is_draft = hire["status"] == "draft"

    subtitle = "EQUIPMENT HIRE — DRAFT" if is_draft else "EQUIPMENT HIRE"
    story.append(Paragraph(hire["title"], STYLES["DocTitle"]))
    story.append(Paragraph(subtitle, STYLES["DocSubtitle"]))

    client = hire.get("client") or {}
    dates = " – ".join(filter(None, [fmt_date(hire.get("start_date")), fmt_date(hire.get("end_date"))]))
    info_rows = [
        ("Hire Ref", hire["ref"]),
        ("Client", client.get("name", "")),
    ]
    if client.get("contact_name"):
        info_rows.append(("Contact", client["contact_name"]))
    if client.get("email"):
        info_rows.append(("Email", client["email"]))
    if client.get("phone"):
        info_rows.append(("Phone", client["phone"]))
    if dates:
        info_rows.append(("Hire Dates", dates))
    if hire.get("checked_out_at"):
        info_rows.append(("Checked Out", fmt_date(hire["checked_out_at"])))
    if client.get("address"):
        info_rows.append(("Address", client["address"].replace("\n", "<br/>")))

    info_data = [
        [Paragraph(label, STYLES["InfoLabel"]), Paragraph(value, STYLES["InfoValue"])]
        for label, value in info_rows
    ]
    info = Table(info_data, colWidths=[110, CONTENT_W - 110])
    info.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, LIGHT_GREY]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.25, RULE_GREY),
        ("LINEABOVE", (0, 0), (-1, 0), 1.5, BRAND_RED),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, RULE_GREY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(info)

    story.append(Paragraph("EQUIPMENT", STYLES["H1"]))
    head = [Paragraph(h, STYLES["CellHead"]) for h in
            ["Item", "Serial No.", "Category", "Out ✓", "In ✓"]]
    rows = [head]
    for it in hire["items"]:
        in_mark = "✓" if it.get("checked_in") else ""
        rows.append([
            Paragraph(it.get("name", ""), STYLES["Cell"]),
            Paragraph(it.get("serial_number") or "", STYLES["Cell"]),
            Paragraph(it.get("category") or "", STYLES["Cell"]),
            Paragraph("", STYLES["Cell"]),
            Paragraph(in_mark, STYLES["Cell"]),
        ])
    items_table = Table(rows, colWidths=[195, 110, 90, 55, 55], repeatRows=1)
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GREY]),
        ("GRID", (0, 0), (-1, -1), 0.25, RULE_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEABOVE", (0, 0), (-1, 0), 2, BRAND_RED),
        ("ALIGN", (3, 0), (4, -1), "CENTER"),
    ]))
    story.append(items_table)

    story.append(Spacer(1, 28))
    sig_cell = TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, RULE_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ])

    def sig_box(title):
        inner = Table(
            [[Paragraph(f"<b>{title}</b>", STYLES["SigLabel"])],
             [Paragraph("Name: ______________________________", STYLES["Body"])],
             [Paragraph("Signature: __________________________", STYLES["Body"])],
             [Paragraph("Date: ______________________________", STYLES["Body"])]],
            colWidths=[(CONTENT_W - 15) / 2 - 20],
        )
        inner.setStyle(TableStyle([
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        return inner

    sig = Table(
        [[sig_box("CHECKED OUT BY"), "", sig_box("RECEIVED BY (CLIENT)")]],
        colWidths=[(CONTENT_W - 15) / 2, 15, (CONTENT_W - 15) / 2],
    )
    sig.setStyle(sig_cell)
    story.append(sig)
    return story


def main():
    hire = json.load(sys.stdin)
    from io import BytesIO
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=FIRST_TOP, bottomMargin=MARGIN_B + 10)
    doc.build(build_story(hire), onFirstPage=first_page, onLaterPages=later_pages)
    sys.stdout.buffer.write(buf.getvalue())


if __name__ == "__main__":
    main()
