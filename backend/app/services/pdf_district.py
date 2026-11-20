import io
from typing import Any
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable
)

def _format_band_label(band: str) -> str:
    if band == "higher_than_most":
        return "Higher than most districts"
    elif band == "lower_than_most":
        return "Lower than most districts"
    elif band == "about_typical":
        return "About typical"
    return band.replace("_", " ").capitalize() if band else "—"

def _band_color(band: str, is_overweight: bool = False) -> colors.Color:
    if band == "higher_than_most":
        return colors.HexColor("#b91c1c") if not is_overweight else colors.HexColor("#c2410c")
    elif band == "lower_than_most":
        return colors.HexColor("#15803d")
    return colors.HexColor("#4b5563")

def generate_district_pdf(
    district_data: dict[str, Any],
    peers: list[dict[str, Any]],
    state_summary: dict[str, Any] | None = None
) -> bytes:
    """Generates a clean, professional, single-page A4 PDF brief for an Indian district.
    Uses strictly plain language with zero statistical or ML jargon.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=32,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
        spaceAfter=8
    )
    group_box_style = ParagraphStyle(
        "GroupBox",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica"
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        spaceBefore=6,
        spaceAfter=3
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontSize=7.8,
        leading=10,
        textColor=colors.HexColor("#1e293b")
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=table_cell,
        fontName="Helvetica-Bold"
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=6.8,
        leading=9,
        textColor=colors.HexColor("#64748b")
    )

    story = []

    # 1. Header
    district_name = district_data.get("district", "District")
    state_name = district_data.get("state", "State")
    group_name = district_data.get("group_name", "Nutrition Group")
    group_desc = district_data.get("group_descriptor", "")

    story.append(Paragraph(f"District Nutrition Brief: {district_name}, {state_name}", title_style))
    story.append(Paragraph(
        "Source: National Family Health Survey (NFHS-5, 2019–2021) • Ministry of Health and Family Welfare, Government of India",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=6))

    # Pattern summary box
    summary_text = (
        f"<b>Pattern Summary:</b> Identified with <b>{group_name}</b> ("
        f"<em>{group_desc}</em>). "
        "This profile reflects patterns across child and maternal nutrition indicators relative to all districts in India."
    )
    summary_table = Table(
        [[Paragraph(summary_text, group_box_style)]],
        colWidths=[523]
    )
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 6))

    # Indicators helper
    indicators = district_data.get("indicators", {})

    # 2. Child Nutrition Table
    story.append(Paragraph("1. Child Nutrition (Children Under 5 Years)", section_heading))
    child_rows = [
        [
            Paragraph("<b>Indicator</b>", table_cell_bold),
            Paragraph("<b>District Rate</b>", table_cell_bold),
            Paragraph("<b>State Avg</b>", table_cell_bold),
            Paragraph("<b>Comparison (All India)</b>", table_cell_bold),
        ]
    ]
    child_indicators = [
        ("stunting", "Stunting (low height for age)"),
        ("wasting", "Wasting (low weight for height)"),
        ("underweight", "Underweight (low weight for age)"),
        ("anaemia_children", "Child Anaemia (6–59 months, Hb < 11 g/dl)"),
    ]
    for key, label in child_indicators:
        info = indicators.get(key, {})
        val = f"{info.get('value', '—')}%" if info.get('value') is not None else "—"
        st_avg = f"{info.get('state_average', '—')}%" if info.get('state_average') is not None else "—"
        band = _format_band_label(info.get("band", ""))
        child_rows.append([
            Paragraph(label, table_cell),
            Paragraph(val, table_cell_bold),
            Paragraph(st_avg, table_cell),
            Paragraph(band, table_cell),
        ])

    child_table = Table(child_rows, colWidths=[210, 85, 85, 143])
    child_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(child_table)
    story.append(Spacer(1, 6))

    # 3. Women's Nutrition Table
    story.append(Paragraph("2. Women's Nutrition (Women 15–49 Years)", section_heading))
    women_rows = [
        [
            Paragraph("<b>Indicator</b>", table_cell_bold),
            Paragraph("<b>District Rate</b>", table_cell_bold),
            Paragraph("<b>State Avg</b>", table_cell_bold),
            Paragraph("<b>Comparison (All India)</b>", table_cell_bold),
        ]
    ]
    women_indicators = [
        ("low_bmi_women", "Low BMI (below 18.5 kg/m²)"),
        ("overweight_women", "Overweight or Obese (BMI ≥ 25 kg/m²)"),
        ("anaemia_women", "Anaemia in all women (Hb < 12 g/dl)"),
    ]
    for key, label in women_indicators:
        info = indicators.get(key, {})
        val = f"{info.get('value', '—')}%" if info.get('value') is not None else "—"
        st_avg = f"{info.get('state_average', '—')}%" if info.get('state_average') is not None else "—"
        band = _format_band_label(info.get("band", ""))
        women_rows.append([
            Paragraph(label, table_cell),
            Paragraph(val, table_cell_bold),
            Paragraph(st_avg, table_cell),
            Paragraph(band, table_cell),
        ])

    women_table = Table(women_rows, colWidths=[210, 85, 85, 143])
    women_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(women_table)
    story.append(Spacer(1, 6))

    # 4. Context Indicators
    story.append(Paragraph("3. Living Conditions and Healthcare Context", section_heading))
    context_keys = [
        ("improved_drinking_water", "Improved Drinking Water"),
        ("improved_sanitation", "Improved Sanitation"),
        ("clean_cooking_fuel", "Clean Cooking Fuel"),
        ("women_literacy", "Women Literacy"),
        ("institutional_births", "Institutional Births"),
        ("immunization", "Full Immunization (12-23m)"),
    ]
    context_cells = []
    for c_key, c_label in context_keys:
        c_val = indicators.get(c_key, {}).get("value")
        val_str = f"{c_val}%" if c_val is not None else "Not reported"
        context_cells.append(Paragraph(f"<b>{c_label}:</b> {val_str}", table_cell))

    # Arrange in 2x3 grid
    c_table_data = [
        [context_cells[0], context_cells[1], context_cells[2]],
        [context_cells[3], context_cells[4], context_cells[5]]
    ]
    c_table = Table(c_table_data, colWidths=[174, 174, 175])
    c_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.append(c_table)
    story.append(Spacer(1, 6))

    # 5. Similar Districts Across India
    story.append(Paragraph("4. Districts with a Similar Nutrition Pattern Across India", section_heading))
    peer_rows = [
        [
            Paragraph("<b>District & State</b>", table_cell_bold),
            Paragraph("<b>Child Stunting</b>", table_cell_bold),
            Paragraph("<b>Child Anaemia</b>", table_cell_bold),
            Paragraph("<b>Key Shared Characteristics</b>", table_cell_bold),
        ]
    ]
    for p in (peers[:5] if peers else []):
        d_name = f"{p.get('district')}, {p.get('state')}"
        stunt = f"{p.get('stunting', '—')}%"
        anaem = f"{p.get('anaemia_children', '—')}%"
        comp = p.get("plain_comparison", "Similar overall profile.")
        peer_rows.append([
            Paragraph(d_name, table_cell_bold),
            Paragraph(stunt, table_cell),
            Paragraph(anaem, table_cell),
            Paragraph(comp, table_cell),
        ])

    if len(peer_rows) > 1:
        peer_table = Table(peer_rows, colWidths=[150, 75, 75, 223])
        peer_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        story.append(peer_table)
        story.append(Spacer(1, 8))

    # 6. Disclaimer & Where to Get Help
    disclaimer_text = (
        "<b>Important Notice:</b> This brief is generated from NFHS-5 survey estimates (2019–2021) for administrative, "
        "planning, and educational purposes. Relative bands ('higher than most', 'about typical', 'lower than most') divide "
        "all 707 surveyed Indian districts into three equal groups and are not clinical diagnoses. "
        "<b>Where to get help:</b> For individual nutrition, immunization, and antenatal support, please contact your "
        "local Anganwadi worker, accredited social health activist (ASHA), or nearest Primary Health Centre (PHC)."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
