from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
import tempfile
import os

router = APIRouter(prefix="/api", tags=["patient-intel"])


# -----------------------------
# Schemas
# -----------------------------
class PatientData(BaseModel):
    patient_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    zip_code: int
    city: Optional[str] = None
    total_spent: float
    total_visits: int
    treatments_received: str
    referral_source: Optional[str] = None
    last_visit: Optional[str] = None
    age_group: Optional[str] = None
    gender: Optional[str] = None


class PatientIntelRequest(BaseModel):
    procedure: Optional[str] = None
    patientData: Optional[List[PatientData]] = None
    useTestData: Optional[bool] = False


# -----------------------------
# API Route
# -----------------------------
@router.post("/patient-intel")
async def analyze_patient_intelligence(request: PatientIntelRequest) -> Dict[str, Any]:
    """Analyze patient data using the sophisticated main algorithm."""

    if not request.patientData or len(request.patientData) == 0:
        raise HTTPException(status_code=400, detail="No patient data provided")

    # Import your main analysis engine
    from main import execute_advanced_analysis
    from schemas import RunCreateRequest

    try:
        # Convert patient data to DataFrame
        patients_data = [p.dict() for p in request.patientData]
        df = pd.DataFrame(patients_data)

        # Normalize column names to match your main algorithm
        df["revenue"] = df["total_spent"]
        df["zip_code"] = df["zip_code"].astype(str).str.zfill(5)

        # Save to temp CSV (your main algorithm expects file paths)
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp:
            df.to_csv(tmp.name, index=False)
            temp_path = tmp.name

        # Get practice ZIP (use most common patient ZIP as proxy)
        practice_zip = df["zip_code"].mode()[0] if len(df) > 0 else "00000"

        # Create dataset dict for main algorithm
        dataset = {
            "patients_path": temp_path,
            "competitors_path": None,
            "practice_zip": practice_zip,
            "vertical": "medspa",
        }

        # Create request object
        analysis_request = RunCreateRequest(
            dataset_id="temp",
            focus="non_inv",  # ← Use valid focus value
        )

        # Run your sophisticated algorithm
        result = execute_advanced_analysis(dataset, analysis_request, df_grouped=df)

        # Clean up temp file
        os.unlink(temp_path)

        # Transform to Patient Intelligence format
        return transform_to_patient_intel_format(result, df)

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# -----------------------------
# Transform to Patient Intelligence schema
# -----------------------------
def transform_to_patient_intel_format(
    analysis_result: Dict[str, Any], patients_df: pd.DataFrame
) -> Dict[str, Any]:
    """
    Transform sophisticated analysis into Patient Intelligence dashboard format.

    PROFILE-FIRST (not ZIP-first).
    Shows WHO your best customers are, then WHERE they live.
    """

    from data.lifestyle_profiles import get_segment_details

    # Revenue column (handle both 'revenue' and 'total_spent')
    revenue_col = "revenue" if "revenue" in patients_df.columns else "total_spent"

    # New profile analysis (if available)
    profile_analysis: Dict[str, Any] = analysis_result.get("dominant_profile", {}) or {}
    has_profile_data = bool(profile_analysis)

    if has_profile_data:
        profile_info = profile_analysis.get("dominant_profile", {}) or {}
        profile_chars = profile_analysis.get("profile_characteristics", {}) or {}
        behavior_patterns = profile_analysis.get("behavior_patterns", {}) or {}
        geo_concentration = profile_analysis.get("geographic_concentration", []) or []
        geo_summary = profile_analysis.get("geographic_summary", {}) or {}

    # Basic metrics
    total_patients = int(len(patients_df))
    total_revenue = float(patients_df[revenue_col].sum())

    # Top 20% analysis
    sorted_patients = patients_df.sort_values(revenue_col, ascending=False)
    top_20_count = max(1, int(total_patients * 0.2))
    top_patients = sorted_patients.head(top_20_count)
    top_revenue = float(top_patients[revenue_col].sum())

    avg_best_value = float(top_revenue / top_20_count) if top_20_count > 0 else 0.0
    avg_overall_value = float(total_revenue / total_patients) if total_patients > 0 else 0.0
    multiplier = float(avg_best_value / avg_overall_value) if avg_overall_value > 0 else 1.0
    concentration = int((top_revenue / total_revenue * 100) if total_revenue > 0 else 0)

    # ---------------------------------------------
    # Build hero insights (profile-first when available)
    # ---------------------------------------------
    hero_insights: List[Dict[str, Any]] = []

    if has_profile_data:
        # 1) Dominant profile (psychographic + behavioral)
        psychographic_name = profile_info.get("psychographic", "Premium Market")
        behavioral_name = profile_info.get("behavioral", "Regular Customer")
        combined_name = profile_info.get("combined", f"{psychographic_name} - {behavioral_name}")
        _behavioral_pct = profile_info.get("behavioral_match_pct", 0)

        _segment_details = get_segment_details(psychographic_name)

        # Pull behavioral metrics (used later for behavior insight)
        avg_ltv = float(behavior_patterns.get("avg_lifetime_value", 0))
        avg_freq = float(behavior_patterns.get("avg_visits_per_year", 0.0))
        avg_treatments = float(behavior_patterns.get("avg_treatments_per_patient", 0.0))
        top_treatments = behavior_patterns.get("top_treatments", ["Primary Service"])

        # Geographic summary (for geography insight)
        geo_summary = profile_analysis.get("geographic", {}) or geo_summary
        geo_concentration = profile_analysis.get("geo_concentration", []) or geo_concentration
        total_households = int(geo_summary.get("total_addressable_households", 0))
        total_zips = int(geo_summary.get("total_zips", 0))
        existing_zips = int(geo_summary.get("existing_patient_zips", 0))
        expansion_zips = int(geo_summary.get("expansion_opportunity_zips", 0))

        # 2) Geography insight
        hero_insights.append(
            {
                "id": "geography",
                "icon": "MapPin",
                "title": "Geographic Opportunity",
                "stat": f"{total_households:,} households · {total_zips} ZIPs",
                "sub": (
                    f"{psychographic_name} profile concentrated across {total_zips} high-match ZIPs. "
                    f"{existing_zips} proven markets, {expansion_zips} expansion opportunities"
                ),
                "metrics": {
                    "currentMarket": {
                        "households": int(
                            sum(
                                g.get("estimated_households", 0)
                                for g in geo_concentration
                                if g.get("has_existing_patients")
                            )
                        ),
                        "zips": [
                            {
                                "zip": g.get("zip"),
                                "city": g.get("location_name", g.get("zip")),
                            }
                            for g in geo_concentration
                            if g.get("has_existing_patients")
                        ],
                        "revenue": int(
                            sum(
                                float(
                                    patients_df[patients_df["zip_code"] == str(g.get("zip"))][
                                        revenue_col
                                    ].sum()
                                )
                                for g in geo_concentration
                                if g.get("has_existing_patients")
                            )
                        ),
                    },
                    "expansionOpportunity": {
                        "households": int(
                            sum(
                                g.get("estimated_households", 0)
                                for g in geo_concentration
                                if not g.get("has_existing_patients")
                            )
                        ),
                        "zips": [
                            {
                                "zip": g.get("zip"),
                                "city": g.get("location_name", g.get("zip")),
                            }
                            for g in geo_concentration
                            if not g.get("has_existing_patients")
                        ],
                        "potentialRevenue": int(
                            sum(
                                g.get("estimated_households", 0)
                                for g in geo_concentration
                                if not g.get("has_existing_patients")
                            )
                            * 0.005
                            * avg_best_value
                        ),
                    },
                    "growth": {
                        "householdsPercent": int(
                            (
                                total_households
                                / max(
                                    sum(
                                        g.get("estimated_households", 0)
                                        for g in geo_concentration
                                        if g.get("has_existing_patients")
                                    ),
                                    1,
                                )
                                - 1
                            )
                            * 100
                        ),
                        "reachMultiplier": round(
                            total_households
                            / max(
                                sum(
                                    g.get("estimated_households", 0)
                                    for g in geo_concentration
                                    if g.get("has_existing_patients")
                                ),
                                1,
                            ),
                            1,
                        ),
                    },
                },
            }
        )

        # 3) Behavioral Pattern (NEW - inserted right after Geography)
        hero_insights.append(
            {
                "id": "behavior",
                "icon": "TrendingUp",
                "title": "Behavioral Pattern",
                "stat": f"${avg_ltv:,.0f} LTV · {avg_freq:.1f}× yearly",
                "sub": (
                    f"Top treatments: {', '.join(top_treatments[:2])}. "
                    f"Average {avg_treatments:.1f} treatments per patient"
                ),
            }
        )

        # 4) Revenue concentration
        hero_insights.append(
            {
                "id": "concentration",
                "icon": "DollarSign",
                "title": "Revenue Concentration",
                "stat": f"{int(concentration)}% from top 20%",
                "sub": (
                    f"Top {top_20_count} {psychographic_name} customers drive ${int(top_revenue):,} revenue. "
                    f"{multiplier:.1f}× more valuable than average"
                ),
            }
        )

    else:
        # Fallback: old format if no profile data
        top_segments = analysis_result.get("top_segments", [])[:4]

        # 1) Geographic insight
        if len(top_segments) > 0:
            top_seg = top_segments[0]
            hero_insights.append(
                {
                    "id": "geo",
                    "icon": "MapPin",
                    "title": "Geographic Focus",
                    "stat": f"{top_seg.get('zip')} · {int(top_seg.get('match_score', 0)*100)}% match",
                    "sub": f"{top_seg.get('location_name', top_seg.get('zip'))}. "
                    f"{top_seg.get('demographic_description', 'High-value market')[:100]}...",
                }
            )

        # 2) Cohort insight
        cohort_counts: Dict[str, int] = {}
        for seg in top_segments:
            cohort = seg.get("cohort", "Unknown")
            cohort_counts[cohort] = cohort_counts.get(cohort, 0) + 1

        if cohort_counts:
            cohort_name, cohort_count = max(cohort_counts.items(), key=lambda x: x[1])
            cohort_pct = int((cohort_count / max(len(top_segments), 1)) * 100)
            details = get_segment_details(cohort_name)

            hero_insights.append(
                {
                    "id": "cohort",
                    "icon": "Users",
                    "title": "Dominant Demographic",
                    "stat": f"{cohort_name} · {cohort_pct}%",
                    "sub": f"{details.get('tagline', '')}. Income: {details.get('income_range', '—')}",
                }
            )

        # 3) Revenue concentration (fallback keeps numbering here)
        hero_insights.append(
            {
                "id": "concentration",
                "icon": "DollarSign",
                "title": "Revenue Concentration",
                "stat": f"{int(concentration)}% from top 20%",
                "sub": f"Top {top_20_count} customers drive ${int(top_revenue):,} revenue",
            }
        )

    # ---------------------------------------------
    # Patterns
    # ---------------------------------------------
    patterns: List[Dict[str, Any]] = []

    if has_profile_data:
        psychographic_name = profile_info.get("psychographic", "Premium Market")
        avg_freq = float(behavior_patterns.get("avg_visits_per_year", 0.0))
        avg_treatments = float(behavior_patterns.get("avg_treatments_per_patient", 0.0))
        avg_ltv = float(behavior_patterns.get("avg_lifetime_value", 0.0))

        # Pattern 1: Profile drives revenue
        patterns.append(
            {
                "type": "profile",
                "title": f"{psychographic_name} profile drives {int(concentration)}% of revenue",
                "description": (
                    f"Your best customers match the {combined_name} profile. "
                    f"Demographics: {profile_chars.get('college_educated_pct', 40)}% college-educated, "
                    f"median income {profile_chars.get('income_range', '$100K+')}, "
                    f"{profile_chars.get('homeowner_pct', 65)}% homeowners. "
                    f"Behavioral: ${avg_ltv:,.0f} LTV, {avg_freq:.1f} visits/year, "
                    f"{avg_treatments:.1f} treatments per patient"
                ),
                "action": f"Target {psychographic_name} profile across {geo_summary.get('total_zips', 0)} high-concentration ZIPs",
                "value": int(top_revenue * 0.3),
            }
        )

        # Pattern 2: Geographic expansion
        if expansion_zips > 0:
            expansion_households = sum(
                g.get("estimated_households", 0)
                for g in geo_concentration
                if not g.get("has_existing_patients")
            )
            expansion_zip_list = [
                g.get("zip")
                for g in geo_concentration
                if not g.get("has_existing_patients")
            ][:3]

            patterns.append(
                {
                    "type": "expansion",
                    "title": f"Expand {psychographic_name} targeting to {expansion_zips} untapped ZIPs",
                    "description": (
                        f"{expansion_households:,} households matching your best customer profile in "
                        f"{expansion_zips} ZIPs with no current penetration. "
                        f"Target ZIPs: {', '.join([z for z in expansion_zip_list if z])}"
                        f"{' and more' if expansion_zips > 3 else ''}"
                    ),
                    "action": "Launch profile-targeted campaign across all high-match ZIPs",
                    "value": int(avg_best_value * expansion_zips * 0.15),
                }
            )
    else:
        top_segments = analysis_result.get("top_segments", [])[:3]
        for i, seg in enumerate(top_segments):
            if seg.get("strategic_insights"):
                insight_text = seg["strategic_insights"][0]
                patterns.append(
                    {
                        "type": "geographic" if i == 0 else "behavioral",
                        "title": f"ZIP {seg.get('zip')}: {seg.get('cohort', 'Market')}",
                        "description": insight_text,
                        "action": f"Launch ${int(seg.get('monthly_ad_cap', 1000))} campaign in {seg.get('location_name', seg.get('zip'))}",
                        "value": int(seg.get("expected_monthly_revenue_p50", 0)),
                    }
                )

    # ---------------------------------------------
    # Opportunities
    # ---------------------------------------------
    opportunities: List[Dict[str, Any]] = []

    if has_profile_data and expansion_zips > 0:
        expansion_geo = [g for g in geo_concentration if not g.get("has_existing_patients")]
        if expansion_geo:
            expansion_households = sum(g.get("estimated_households", 0) for g in expansion_geo)
            estimated_new_patients = int(expansion_households * 0.005)  # 0.5% penetration
            expansion_value = int(estimated_new_patients * avg_best_value)

            first_three = ", ".join([g.get("zip", "") for g in expansion_geo[:3] if g.get("zip")])

            opportunities.append(
                {
                    "title": f"Expand to {len(expansion_geo)} profile-matched untapped markets",
                    "description": (
                        "ZIPs with high profile concentration but zero current penetration. "
                        f"{expansion_households:,} matching households across {first_three}"
                        f"{' and more' if len(expansion_geo) > 3 else ''}"
                    ),
                    "action": f"Test ${int(estimated_new_patients * 150):,}/month profile-targeted campaign",
                    "value": expansion_value,
                }
            )
    else:
        top_segments = analysis_result.get("top_segments", [])
        high_score_untapped = [s for s in top_segments if s.get("historical_patients", 0) == 0]
        if high_score_untapped:
            total_potential = int(sum(s.get("expected_monthly_revenue_p50", 0) for s in high_score_untapped[:3]))
            opportunities.append(
                {
                    "title": f"Expand to {len(high_score_untapped)} high-potential untapped ZIPs",
                    "description": (
                        "ZIPs with strong demographic fit but zero current patients. "
                        f"Combined market score {sum(s.get('match_score', 0) for s in high_score_untapped[:3])/3:.0%}"
                    ),
                    "action": f"Test ${sum(s.get('monthly_ad_cap', 1000) for s in high_score_untapped[:3]):,.0f}/month geo-targeted campaign",
                    "value": total_potential,
                }
            )

    # Frequency opportunity (works with or without profile data)
    if "visits_per_year" in patients_df.columns:
        avg_visits = float(patients_df["visits_per_year"].mean())
        low_freq = patients_df[patients_df["visits_per_year"] < avg_visits]
        if len(low_freq) > 0:
            freq_value = int(len(low_freq) * avg_overall_value * 0.4)
            if has_profile_data:
                opp_title = f"Increase visit frequency for {len(low_freq)} {psychographic_name} patients"
                opp_desc = "Below-average visit frequency for profile. Opportunity to lift to standard"
                opp_action = f"Launch membership program tailored to {psychographic_name} preferences"
            else:
                opp_title = f"Increase visit frequency for {len(low_freq)} patients"
                opp_desc = "Below-average visit frequency. Strong retention candidates"
                opp_action = "Launch membership program with monthly touchpoints"

            opportunities.append(
                {
                    "title": opp_title,
                    "description": opp_desc,
                    "action": opp_action,
                    "value": freq_value,
                }
            )

    # Final response
    response: Dict[str, Any] = {
        "success": True,
        "summary": {
            "totalPatients": total_patients,
            "bestPatientCount": top_20_count,
            "revenueConcentration": int(concentration),
            "avgBestPatientValue": int(avg_best_value),
            "avgOverallValue": int(avg_overall_value),
            "multiplier": round(multiplier, 1),
        },
        "insights": {
            "heroInsights": hero_insights,
            "patterns": patterns,
            "opportunities": opportunities,
        },
    }

    # Add profile data to response if available
    if has_profile_data:
        response["summary"]["dominantProfile"] = profile_info.get("combined", "Premium Market")
        response["insights"]["dominantProfile"] = profile_analysis

    return response

