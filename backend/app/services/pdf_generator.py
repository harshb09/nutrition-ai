import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether
)

def create_trend_chart_image(country_trends: list[dict], country_name: str) -> io.BytesIO:
    """Generates a clean, compact dark-themed trend line chart for stunting and overweight."""
    years = [p["year"] for p in country_trends if p.get("stunting") is not None or p.get("child_overweight") is not None]
    stunt_vals = [p.get("stunting") for p in country_trends if p.get("stunting") is not None or p.get("child_overweight") is not None]
    over_vals = [p.get("child_overweight") for p in country_trends if p.get("stunting") is not None or p.get("child_overweight") is not None]
    
    fig, ax = plt.subplots(figsize=(6.2, 1.8), dpi=200)
    fig.patch.set_facecolor("#121821")
    ax.set_facecolor("#18202B")
    
    if years:
        # Filter valid pairs
        y_stunt = [(y, v) for y, v in zip(years, stunt_vals) if v is not None]
        y_over = [(y, v) for y, v in zip(years, over_vals) if v is not None]
        
        has_labels = False
        if y_stunt:
            ax.plot([x[0] for x in y_stunt], [x[1] for x in y_stunt],
                    color="#2DD4BF", marker="o", markersize=3, linewidth=2, label="Child Stunting (%)")
            has_labels = True
        if y_over:
            ax.plot([x[0] for x in y_over], [x[1] for x in y_over],
                    color="#F59E0B", marker="s", markersize=3, linewidth=2, label="Child Overweight (%)")
            has_labels = True
        if has_labels:
            ax.legend(facecolor="#121821", edgecolor="#243042", labelcolor="#E6EDF3", fontsize=7, loc="upper right")
    else:
        ax.text(0.5, 0.5, "No historical time series available", color="#8B98A9",
                ha="center", va="center", transform=ax.transAxes)
                
    ax.set_title(f"Historical Trends 2000–2024: {country_name}", color="#E6EDF3", fontsize=9, pad=4, fontweight="bold")
    ax.tick_params(colors="#8B98A9", labelsize=7)
    ax.grid(True, linestyle="--", alpha=0.2, color="#8B98A9")
    for spine in ax.spines.values():
        spine.set_color("#243042")
    
    plt.tight_layout(pad=0.5)
    
    img_buf = io.BytesIO()
    plt.savefig(img_buf, format="png", facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close(fig)
    img_buf.seek(0)
    return img_buf

def generate_country_pdf_brief(
    country_data: dict,
    peers: list[dict],
    trends_series: list[dict]
) -> bytes:
    """Renders a production-quality, exactly 1-page A4 PDF brief."""
    buffer = io.BytesIO()
    
    # 595.27 x 841.89 points
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=24,
        rightMargin=24,
        topMargin=20,
        bottomMargin=20
    )
    
    styles = getSampleStyleSheet()
    
    # Custom text styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#0B0F14")
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#4B5563")
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#0F172A")
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1F2937")
    )
    footer_style = ParagraphStyle(
        "FooterDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor("#64748B")
    )
    badge_style = ParagraphStyle(
        "Badge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0D9488")
    )
    
    story = []
    
    # Header block
    country_name = country_data.get("country_name", "Unknown Country")
    iso3 = country_data.get("iso3", "---")
    income_grp = country_data.get("income_group", "Not Classified")
    region = country_data.get("region", "Global")
    group_name = country_data.get("group_name") or "No Group"
    prov_desc = country_data.get("group_descriptor") or (country_data.get("notice") or "Insufficient data for grouping")
    is_db = country_data.get("double_burden", False)
    
    header_html = f"<b>NUTRITION ATLAS</b> &nbsp;|&nbsp; COUNTRY MALNUTRITION PROFILE"
    header_p = Paragraph(header_html, subtitle_style)
    country_title = Paragraph(f"<b>{country_name} ({iso3})</b>", title_style)
    
    meta_line = (
        f"<b>Region:</b> {region} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>Income Classification:</b> {income_grp} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>Provisional Cluster:</b> <b>{group_name}</b>"
    )
    meta_p = Paragraph(meta_line, body_style)
    
    story.append(header_p)
    story.append(Spacer(1, 3))
    story.append(country_title)
    story.append(Spacer(1, 4))
    story.append(meta_p)
    story.append(Spacer(1, 6))
    
    # Banner Box: Provisional Descriptor & Double Burden
    db_text = "<font color='#B91C1C'><b>[DOUBLE-BURDEN FLAGGED]</b></font>" if is_db else "<font color='#0D9488'>[No Double-Burden Flag]</font>"
    banner_text = (
        f"<b>Cluster Profile:</b> {prov_desc} (Exploratory / Provisional) &nbsp;&nbsp; {db_text}<br/>"
        f"<i><font color='#6B7280'>Relative flags denote indicator values exceeding the 75th percentile of countries in this dataset.</font></i>"
    )
    banner_table = Table([[Paragraph(banner_text, body_style)]], colWidths=[547])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 8))
    
    # Section 1: Indicators Table
    story.append(Paragraph("<b>1. Malnutrition Indicator Benchmark</b>", section_heading))
    story.append(Spacer(1, 4))
    
    feat_display = [
        ("stunting", "Child Stunting (% under 5)"),
        ("child_overweight", "Child Overweight (% under 5)"),
        ("wasting", "Child Wasting (% under 5)"),
        ("adult_obesity", "Adult Obesity (%)"),
        ("adult_diabetes", "Adult Diabetes (%)"),
        ("anaemia_women", "Anaemia in Women 15-49 (%)"),
        ("low_birth_weight", "Low Birth Weight (% births)")
    ]
    
    table_data = [
        ["Indicator", "Country Value", "Data Year", "Group Mean", "Dataset Median", "Relative Status"]
    ]
    
    indicators = country_data.get("indicators", {})
    is_imputed = country_data.get("is_imputed", {})
    years = country_data.get("data_years", {})
    grp_means = country_data.get("group_means") or {}
    dataset_medians = country_data.get("dataset_medians") or {}
    rel_flags = country_data.get("relative_flags", {})
    
    for f_key, f_name in feat_display:
        val = indicators.get(f_key)
        val_str = f"{val:.1f}%" if val is not None else "N/A"
        if is_imputed.get(f_key, False):
            val_str += " *"
            
        yr = years.get(f_key)
        yr_str = str(yr) if yr is not None else "---"
        
        gm = grp_means.get(f_key)
        gm_str = f"{gm:.1f}%" if gm is not None else "---"
        
        dm = dataset_medians.get(f_key)
        dm_str = f"{dm:.1f}%" if dm is not None else "---"
        
        flag = rel_flags.get(f_key, False)
        status_str = "Higher (> P75)" if flag else "Normal / Lower"
        
        table_data.append([f_name, val_str, yr_str, gm_str, dm_str, status_str])
        
    t1 = Table(table_data, colWidths=[175, 75, 62, 75, 80, 80])
    t1.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("LEADING", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t1)
    story.append(Paragraph("<font size='6' color='#64748B'>* Value imputed via 5-Nearest Neighbours for clustering. Not for clinical diagnosis.</font>", body_style))
    story.append(Spacer(1, 6))
    
    # Section 2: Peers Comparison
    story.append(Paragraph("<b>2. Top 5 Nearest Peer Countries</b> (by multidimensional Euclidean distance)", section_heading))
    story.append(Spacer(1, 3))
    
    peer_headers = ["Peer Country", "Distance", "Stunting", "Overweight", "Wasting", "Adult Obesity", "Anaemia Women"]
    peer_table_data = [peer_headers]
    
    if peers:
        for p in peers[:5]:
            p_vals = p.get("values", {})
            peer_table_data.append([
                f"{p.get('country_name')} ({p.get('iso3')})",
                f"{p.get('distance', 0):.2f}",
                f"{p_vals.get('stunting', 0):.1f}%" if p_vals.get('stunting') is not None else "---",
                f"{p_vals.get('child_overweight', 0):.1f}%" if p_vals.get('child_overweight') is not None else "---",
                f"{p_vals.get('wasting', 0):.1f}%" if p_vals.get('wasting') is not None else "---",
                f"{p_vals.get('adult_obesity', 0):.1f}%" if p_vals.get('adult_obesity') is not None else "---",
                f"{p_vals.get('anaemia_women', 0):.1f}%" if p_vals.get('anaemia_women') is not None else "---",
            ])
    else:
        peer_table_data.append(["No peer comparison available for this country", "---", "---", "---", "---", "---", "---"])
        
    t2 = Table(peer_table_data, colWidths=[165, 55, 65, 65, 65, 66, 66])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 6.5),
        ("LEADING", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]))
    story.append(t2)
    story.append(Spacer(1, 6))
    
    # Section 3: Trend Line Mini-Chart
    story.append(Paragraph("<b>3. Longitudinal Trend Trajectory (2000–2024)</b>", section_heading))
    story.append(Spacer(1, 3))
    
    chart_buf = create_trend_chart_image(trends_series, country_name)
    chart_img = Image(chart_buf, width=547, height=115)
    story.append(chart_img)
    story.append(Spacer(1, 6))
    
    # Mandatory Caveat & Footer
    disclaimer_text = (
        "<b>Important Caveat & Responsible Use:</b> Groups are exploratory similarity groupings, not official categories or rankings. "
        "Data years differ between indicators. Not for clinical use. Peer comparisons reflect mathematical proximity in 7-dimensional "
        "indicator space to support health systems dialogue.<br/>"
        "<b>Data Sources:</b> UNICEF / WHO / World Bank Joint Child Malnutrition Estimates (March 2026); "
        "Global Nutrition Report Country Nutrition Profiles (Feb 2023); UNICEF-WHO Low Birthweight Estimates (2023); "
        "World Bank World Development Indicators (SH.ANM.CHLD.ZS)."
    )
    story.append(Paragraph(disclaimer_text, footer_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
