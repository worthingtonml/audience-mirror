// app/api/campaign-intel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzePatientData } from "../../../lib/patient-intelligence";

/* ---------- Types ---------- */
type Prediction = {
  platform: "facebook" | "instagram" | "google" | "tiktok" | (string & {});
  score: number;           // 0–100
  cpl?: number;            // cost per lead (USD)
  ltv?: number;            // lifetime value (USD)
  roas?: number;           // return on ad spend (x)
};

/* ---------- ML predictions from Python server ---------- */
async function getMLPredictions(
  zip: string,
  procedure: string,
  cohort: string
): Promise<Prediction[]> {
  try {
    const res = await fetch("http://localhost:5001/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zip, procedure, cohort }),
    });

    if (!res.ok) throw new Error(`Prediction server error: ${res.status}`);
    const data = (await res.json()) as Prediction[] | { predictions: Prediction[] };

    // Accept either a raw array or { predictions: [...] }
    const list = Array.isArray(data) ? data : data?.predictions ?? [];
    return normalizePredictions(list);
  } catch (err) {
    console.error("ML prediction failed:", err);
    return normalizePredictions(getFallbackPredictions());
  }
}

function normalizePredictions(items: unknown[]): Prediction[] {
  return (items ?? []).map((p: any) => ({
    platform: String(p?.platform ?? "facebook"),
    score: Number.isFinite(p?.score) ? Number(p.score) : 60,
    cpl: Number.isFinite(p?.cpl) ? Number(p.cpl) : undefined,
    ltv: Number.isFinite(p?.ltv) ? Number(p.ltv) : undefined,
    roas: Number.isFinite(p?.roas) ? Number(p.roas) : 2.0,
  }));
}

/* ---------- Fallback if ML server is down ---------- */
function getFallbackPredictions(): Prediction[] {
  return [
    { platform: "facebook",  score: 75, cpl: 15, ltv: 450, roas: 3.0 },
    { platform: "instagram", score: 70, cpl: 18, ltv: 400, roas: 2.5 },
    { platform: "google",    score: 65, cpl: 25, ltv: 500, roas: 2.0 },
    { platform: "tiktok",    score: 55, cpl: 12, ltv: 250, roas: 2.1 },
  ];
}

/* ---------- Ad copy generator ---------- */
function generateAdCopy(
  procedure: string,
  cohort: string,
  _platform: string,
  prediction: Prediction,
  patientInsights?: {
    bestPatientCount?: number;
    avgBestPatientValue?: number;
    topZip?: string;
  }
): string[] {
  const score = Number(prediction?.score ?? 0);

  if (score > 80) {
    const patientCount = Number(patientInsights?.bestPatientCount ?? 100);
    const avgValue = Math.round(Number(patientInsights?.avgBestPatientValue ?? 500));
    return [
      `Top-rated ${procedure} in your area`,
      `Join ${patientCount}+ satisfied ${procedure} clients`,
      `Proven ${procedure} results — Avg client value $${avgValue}`,
    ];
  }

  const ltv = Number(prediction?.ltv ?? 400);
  const priceFrom = Math.max(99, Math.round(ltv * 0.3));
  const area = patientInsights?.topZip || "your area";

  const templates: Record<string, string[]> = {
    "Luxury Clients": [
      `Elite ${procedure} artistry for discerning clients`,
      `Where excellence meets ${procedure} innovation`,
      `Refined ${procedure} treatments, exceptional results`,
    ],
    "Budget Conscious": [
      `${procedure} starting at $${priceFrom}`,
      `Smart savings on professional ${procedure}`,
      `Quality ${procedure} within your budget`,
    ],
    "Comfort Spenders": [
      `Premium ${procedure} at a fair price`,
      `Trusted ${procedure} experts in ${area}`,
      `Join our ${procedure} success stories`,
    ],
    premium_aesthetics: [
      `Elite ${procedure} artistry for discerning clients`,
      `Where excellence meets ${procedure} innovation`,
      `Refined ${procedure} treatments, exceptional results`,
    ],
    value_shoppers: [
      `${procedure} starting at $${priceFrom}`,
      `Smart savings on professional ${procedure}`,
      `Quality ${procedure} within your budget`,
    ],
    first_timers: [
      `New to ${procedure}? Start with confidence`,
      `Gentle ${procedure} introduction — free consultation`,
      `Your first ${procedure}, made comfortable`,
    ],
    loyal_clients: [
      `Welcome back for your ${procedure} refresh`,
      `Member pricing on ${procedure} treatments`,
      `Your loyalty rewarded — ${procedure} specials`,
    ],
  };

  return templates[cohort] ?? [
    `Professional ${procedure} treatments available`,
    `Transform with expert ${procedure} care`,
    `Book your ${procedure} consultation today`,
  ];
}

/* ---------- Route handler ---------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const zip = String(body?.zip ?? "");
    const procedure = String(body?.procedure ?? "botox");
    const cohort = String(body?.cohort ?? "Comfort Spenders");

    // Patient intelligence
    const patientData = getPatientData();
    const analysis: any = analyzePatientData(patientData, procedure);

    // tolerate both shapes (nested vs flat)
    const patterns: any[] =
      (analysis?.insights?.patterns as any[]) ??
      (analysis?.patterns as any[]) ??
      [];

    const expansion: any =
      (analysis?.insights?.expansion as any) ??
      (analysis?.expansion as any) ??
      {};

    const targetZips: any[] =
      (expansion?.targetZips as any[]) ??
      (analysis?.targetZips as any[]) ??
      [];

    const playbook: any = analysis?.playbook ?? {};
    const channels: { name: string; allocation?: number }[] = Array.isArray(playbook?.channels)
      ? playbook.channels
      : [];

    const topZip = targetZips?.[0];
    const bestChannelName = channels?.[0]?.name ?? "facebook";
    const bestPattern = patterns?.[0];

    // Data-informed metrics
    const avgValue = Number(topZip?.avgValue ?? 450);
    const dataInformedCPL = Math.max(8, Math.round(avgValue * 0.02));
    const dataInformedMaxCPA = Math.round(avgValue * 0.1);
    const dataInformedLTV = Math.round(avgValue);
    const actualCohort = String(topZip?.cohort ?? cohort);

    const summary = analysis?.summary ?? {};
    const patientInsightsSummary = {
      bestPatientCount: Number(summary?.bestPatientCount ?? 0),
      avgBestPatientValue: Number(summary?.avgBestPatientValue ?? 0),
      revenueConcentration: Number(summary?.revenueConcentration ?? 0),
      topZip: String(topZip?.zip ?? zip),
      topPattern: String(bestPattern?.title ?? "Focus on high-value patient retention"),
      bestChannel: bestChannelName,
    };

    // ML predictions
    const mlPredictions = await getMLPredictions(zip, procedure, actualCohort);

    // Enhance with patient intel
    const enhanced = mlPredictions.map((pred) => ({
      ...pred,
      cpl: dataInformedCPL,
      ltv: dataInformedLTV,
      score:
        pred.platform === patientInsightsSummary.bestChannel
          ? Math.min(100, Number(pred.score ?? 0) + 10)
          : Number(pred.score ?? 0),
      roas: Number(pred.roas ?? 2.0),
    }));

    // Rank by score
    const sorted = [...enhanced].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const top = sorted[0] ?? enhanced[0] ?? {
      platform: "facebook" as const,
      score: 70,
      cpl: dataInformedCPL,
      ltv: dataInformedLTV,
      roas: 2.0,
    };

    const response = {
      id: `campaign-${Date.now()}`,
      zip,
      procedure,
      cohort: actualCohort,

      insights: [
        {
          type: Number(top.roas) >= 3 ? "success" : Number(top.roas) >= 1.5 ? "info" : "warning",
          text: `${Number(top.roas).toFixed(1)}x predicted return on ad spend`,
        },
        {
          type: dataInformedCPL > 25 ? "warning" : "success",
          text:
            dataInformedCPL > 25
              ? `Higher costs in ${zip} — focus on quality and retention`
              : `Cost-efficient market at $${dataInformedCPL} CPL`,
        },
        {
          type: "info",
          text: `${capitalize(top.platform)} performing best at ${Math.round(top.score)}% confidence`,
        },
        { type: "success", text: patientInsightsSummary.topPattern },
      ],

      platforms: sorted.map((pred) => ({
        name: pred.platform,
        score: Math.round(Number(pred.score ?? 0)),
        metrics: {
          ctr: `${(2 + Number(pred.score ?? 0) / 50).toFixed(1)}%`,
          cpl: `$${Math.max(1, dataInformedCPL - 2)}–$${dataInformedCPL + 2}`,
          bookingRate: `${Math.round(15 + Number(pred.score ?? 0) / 10)}%`,
          maxCpa: `$${dataInformedMaxCPA}`,
          ltv: `$${dataInformedLTV}`,
          roas: `${Number(pred.roas ?? 2.0).toFixed(1)}x`,
        },
        adCopy: generateAdCopy(procedure, actualCohort, pred.platform, pred, patientInsightsSummary),
        audiences: [
          `${actualCohort} in ${zip}`,
          `${procedure} interested`,
          `${Number(pred.score ?? 0) > 70 ? "High-intent" : "Awareness stage"} audience`,
          bestPattern?.type === "geographic" ? `Similar to ${patientInsightsSummary.topZip} residents` : null,
        ].filter(Boolean) as string[],
      })),

      creativeGuidance: {
        primaryMessage: `Patient data shows ${patientInsightsSummary.bestChannel} works best for ${actualCohort}`,
        visualStyle: dataInformedLTV > 500 ? "Premium, sophisticated" : "Approachable, friendly",
        cta: (sorted[0]?.score ?? 0) > 80 ? "Book Now" : "Learn More",
        notes: `Based on ${Number(summary?.totalPatients ?? 0)} analyzed patients — ${patientInsightsSummary.revenueConcentration}% revenue from top ${patientInsightsSummary.bestPatientCount} patients`,
      },

      modelConfidence: {
        high: (sorted[0]?.score ?? 0) > 80,
        score: sorted[0]?.score ?? 0,
        reasoning:
          (sorted[0]?.score ?? 0) > 80
            ? "Strong historical performance for this combination"
            : "Limited data — recommend testing carefully",
        patientDataSupport: (patterns?.length ?? 0) > 3 ? "Strong" : "Moderate",
      },

      patientIntelligence: {
        topPerformingZip: patientInsightsSummary.topZip,
        recommendedChannel: patientInsightsSummary.bestChannel,
        avgPatientValue: patientInsightsSummary.avgBestPatientValue,
        keyPattern: patientInsightsSummary.topPattern,
        dataPoints: Number(summary?.totalPatients ?? 0),
      },

      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate predictions",
        message: "Make sure the ML server is running on port 5001",
        fallback: true,
      },
      { status: 500 }
    );
  }
}

/* ---------- utils ---------- */
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
