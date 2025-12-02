// app/api/patient-intel/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { 
  analyzePatientData, 
  generateHeroInsights,  // 🎯 ADDED THIS
  type PatientIntelResult 
} from "@/lib/patient-intelligence";

/* ===================== Types ===================== */

type Patient = {
  patient_id?: string;
  referral_source?: string | null;
  total_spent?: number | null;
  total_visits?: number | null;
  treatments_received?: string | null;
  vip_status?: "Yes" | "No" | string | null;
  zip_code?: string | null;
  age_group?: string | null;
  last_visit?: string | null;
};

type PatientRecord = {
  patient_id: string;
  patient_zip: string;
  procedure: string;
  revenue: number;
  appointment_date?: string | null;
  acquisition_channel: string;
};

type ChannelStats = {
  count: number;
  totalSpend: number;
  totalVisits: number;
  patients: Patient[];
  treatments: Record<string, number>;
  vipCount: number;
  multiTreatmentCount: number;
  zipCodes: Set<string>;
  ageGroups: Record<string, number>;
};

type ChannelMetrics = {
  name: string;
  percentage: number;
  avgSpend: number;
  avgVisits: number;
  vipRate: number;
  multiTreatmentRate: number;
  treatmentDiversity: number;
  geoSpread: "Dispersed" | "Concentrated";
  dominantAge: string;
  topTreatment: string;
  patientType: string;
  lifetimeValue: number;
  churnRisk: "Low" | "Medium" | "High";
};

type Psychographics = {
  acceptanceScore: number;
  acceptanceInsight: string;
  valueMultiplier: number;
  marketInsight: string;
  channels: ChannelMetrics[];
  clusters: { name: string; percentage: number; ltv: number; bestChannel: string }[];
  keyInsight: string;
};

type PsychographicDimensions = {
  digitalSavvy: number;
  socialInfluence: number;
  premiumOrientation: number;
  treatmentProgression: number;
  loyaltyTendency: number;
};

/* ===================== Helpers ===================== */

const safeToNumber = (n: unknown, fallback = 0): number =>
  typeof n === "number" && Number.isFinite(n) ? n : fallback;

const safeSplitCSV = (s?: string | null): string[] =>
  (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const pct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

/* ============= PSYCHOGRAPHIC ANALYSIS FUNCTIONS ============= */

const analyzePsychographics = (patientData: Patient[] | undefined | null): Psychographics | null => {
  if (!patientData?.length) return null;

  const allUniqueTreatments = new Set<string>();
  patientData.forEach((p) =>
    safeSplitCSV(p.treatments_received).forEach((t) => allUniqueTreatments.add(t))
  );
  const maxTreatmentTypes = Math.max(allUniqueTreatments.size, 1);

  const channelStats = patientData.reduce<Record<string, ChannelStats>>((acc, patient) => {
    const source = (patient.referral_source || "Walk-in").trim() || "Walk-in";
    acc[source] ??= {
      count: 0,
      totalSpend: 0,
      totalVisits: 0,
      patients: [],
      treatments: {},
      vipCount: 0,
      multiTreatmentCount: 0,
      zipCodes: new Set<string>(),
      ageGroups: {},
    };

    const bucket = acc[source];
    const spend = safeToNumber(patient.total_spent);
    const visits = safeToNumber(patient.total_visits);

    bucket.count += 1;
    bucket.totalSpend += spend;
    bucket.totalVisits += visits;
    bucket.patients.push(patient);

    const treatments = safeSplitCSV(patient.treatments_received);
    for (const t of treatments) bucket.treatments[t] = (bucket.treatments[t] ?? 0) + 1;

    if (treatments.length > 1) bucket.multiTreatmentCount += 1;
    if ((patient.vip_status || "").toLowerCase() === "yes") bucket.vipCount += 1;
    if (patient.zip_code) bucket.zipCodes.add(patient.zip_code);
    if (patient.age_group) bucket.ageGroups[patient.age_group] =
      (bucket.ageGroups[patient.age_group] ?? 0) + 1;

    return acc;
  }, {});

  const allSpends = patientData.map((p) => safeToNumber(p.total_spent)).sort((a, b) => a - b);
  const spendingThresholds = {
    high: allSpends[Math.floor(allSpends.length * 0.8)] || 10000,
    medium: allSpends[Math.floor(allSpends.length * 0.5)] || 3000,
  };

  const channels: ChannelMetrics[] = Object.entries(channelStats)
    .map(([name, stats]) => {
      const avgSpend = stats.count ? stats.totalSpend / stats.count : 0;
      const avgVisits = stats.count ? stats.totalVisits / stats.count : 0;
      const uniqueTreatments = Object.keys(stats.treatments).length;
      const treatmentDiversity = pct((uniqueTreatments / maxTreatmentTypes) * 100);
      const geoConcentrationRatio = stats.count ? stats.zipCodes.size / stats.count : 0;
      const geoSpread: ChannelMetrics["geoSpread"] =
        geoConcentrationRatio > 0.5 ? "Dispersed" : "Concentrated";
      const dominantAge =
        Object.entries(stats.ageGroups).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
      const progressionRate = stats.count ? stats.multiTreatmentCount / stats.count : 0;

      return {
        name,
        percentage: pct((stats.count / patientData.length) * 100),
        avgSpend: Math.round(avgSpend),
        avgVisits: Math.round(avgVisits * 10) / 10,
        vipRate: pct((stats.vipCount / Math.max(stats.count, 1)) * 100),
        multiTreatmentRate: pct(progressionRate * 100),
        treatmentDiversity,
        geoSpread,
        dominantAge,
        topTreatment: Object.entries(stats.treatments).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None",
        patientType: categorizePatientType(avgSpend, avgVisits, progressionRate, spendingThresholds),
        lifetimeValue: Math.round(avgSpend * (1 + progressionRate)),
        churnRisk: calculateChurnRisk(stats.patients),
      };
    })
    .sort((a, b) => b.avgSpend - a.avgSpend);

  const psychographicProfile = calculatePsychographicProfile(channels);
  const clusters = generateAdvancedClusters(patientData, spendingThresholds);

  const topChannel = channels[0];
  const bottomChannel = channels[channels.length - 1];
  const valueMultiplier =
    bottomChannel && bottomChannel.avgSpend > 0
      ? Math.round((topChannel?.avgSpend ?? 0) / bottomChannel.avgSpend)
      : 1;

  return {
    acceptanceScore: psychographicProfile.score,
    acceptanceInsight: psychographicProfile.insight,
    valueMultiplier,
    marketInsight: `${topChannel?.name ?? "Top"} patients worth ${valueMultiplier}x more than ${
      bottomChannel?.name ?? "Bottom"
    }`,
    channels: channels.slice(0, 10),
    clusters,
    keyInsight: `${topChannel?.name ?? "Top"} drives ${topChannel?.percentage ?? 0}% of patients at $${
      topChannel?.avgSpend ?? 0
    } average spend. ${psychographicProfile.insight}`,
  };
};

const categorizePatientType = (
  avgSpend: number,
  avgVisits: number,
  progressionRate: number,
  thresholds: { high: number; medium: number }
): string => {
  const visitBand = avgVisits > 10 ? "Frequent" : avgVisits > 5 ? "Regular" : "Occasional";
  const spendBand = avgSpend > thresholds.high ? "Premium" : avgSpend > thresholds.medium ? "Mid" : "Entry";
  const progressionBand =
    progressionRate > 0.6 ? "Progressive" : progressionRate > 0.3 ? "Developing" : "Single";

  if (spendBand === "Premium" && visitBand === "Frequent") return "VIP Ambassador";
  if (spendBand === "Premium" && progressionBand === "Progressive") return "Premium Progressive";
  if (spendBand === "Mid" && visitBand === "Regular") return "Loyal Regular";
  if (progressionBand === "Developing") return "Growth Potential";
  if (visitBand === "Occasional") return "New Explorer";
  return "Price Conscious";
};

const calculateChurnRisk = (patients: Patient[]): "Low" | "Medium" | "High" => {
  const now = new Date();
  const recentPatients = patients.filter((p) => {
    const lv = p.last_visit ? new Date(p.last_visit) : null;
    if (!lv || Number.isNaN(lv.getTime())) return false;
    return daysBetween(lv, now) < 90;
  });

  const retentionRate = patients.length ? recentPatients.length / patients.length : 0;
  if (retentionRate > 0.8) return "Low";
  if (retentionRate > 0.5) return "Medium";
  return "High";
};

const calculatePsychographicProfile = (channels: ChannelMetrics[]) => {
  const dims: PsychographicDimensions = {
    digitalSavvy: 0,
    socialInfluence: 0,
    premiumOrientation: 0,
    treatmentProgression: 0,
    loyaltyTendency: 0,
  };

  const maxSpend = Math.max(...channels.map((c) => c.avgSpend), 1);
  const maxVisits = Math.max(...channels.map((c) => c.avgVisits), 1);

  const isDigital = (n: string) => /instagram|facebook|google|website|online|digital/i.test(n);
  const isSocial = (n: string) => /instagram|facebook|tiktok|twitter|social/i.test(n);

  channels.forEach((c) => {
    const w = c.percentage / 100;
    if (isDigital(c.name)) dims.digitalSavvy += w * (c.avgSpend / maxSpend) * 100;
    if (isSocial(c.name)) dims.socialInfluence += w * c.vipRate;
    dims.premiumOrientation += w * (c.avgSpend / maxSpend) * 100;
    dims.treatmentProgression += w * c.multiTreatmentRate;
    dims.loyaltyTendency += w * (c.avgVisits / maxVisits) * 100;
  });

  const score = Math.round(
    dims.digitalSavvy * 0.25 +
      dims.socialInfluence * 0.25 +
      dims.premiumOrientation * 0.2 +
      dims.treatmentProgression * 0.15 +
      dims.loyaltyTendency * 0.15
  );

  const marketType = classifyMarketType(dims);

  return {
    score,
    dimensions: dims,
    marketType,
    insight: generateProfileInsight(score, marketType),
  };
};

const classifyMarketType = (d: PsychographicDimensions): string => {
  const profiles = [
    { type: "Digital Native Premium", check: () => d.digitalSavvy > 60 && d.premiumOrientation > 50 },
    { type: "Social Influenced", check: () => d.socialInfluence > 60 && d.treatmentProgression > 40 },
    { type: "Traditional Luxury", check: () => d.premiumOrientation > 70 && d.digitalSavvy < 40 },
    { type: "Value Progressive", check: () => d.treatmentProgression > 50 },
    { type: "Loyal Maintenance", check: () => d.loyaltyTendency > 70 },
  ];
  return profiles.find((p) => p.check())?.type ?? "Mixed Market";
};

const generateProfileInsight = (score: number, marketType: string): string => {
  const tactic =
    score > 70
      ? "premium experiences and social proof"
      : score > 40
      ? "education and gradual upselling"
      : "trust-building and entry offerings";
  return `${marketType} market with ${score}/100 acceptance. Optimize for ${tactic}.`;
};

const generateAdvancedClusters = (
  patientData: Patient[],
  thresholds: { high: number; medium: number }
) => {
  const segments = [
    { name: "High Value", filter: (p: Patient) => safeToNumber(p.total_spent) > thresholds.high },
    {
      name: "Core Patients",
      filter: (p: Patient) => {
        const s = safeToNumber(p.total_spent);
        return s >= thresholds.medium && s <= thresholds.high;
      },
    },
    { name: "Entry Level", filter: (p: Patient) => safeToNumber(p.total_spent) < thresholds.medium },
  ];

  return segments
    .map((segment) => {
      const patients = patientData.filter(segment.filter);
      const total = patientData.length || 1;
      if (!patients.length) return null;

      const channelCounts = patients.reduce<Record<string, number>>((acc, p) => {
        const source = (p.referral_source || "Walk-in").trim() || "Walk-in";
        acc[source] = (acc[source] ?? 0) + 1;
        return acc;
      }, {});
      const bestChannel =
        Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Direct";

      const avgSpend =
        patients.reduce((sum, p) => sum + safeToNumber(p.total_spent), 0) /
        Math.max(patients.length, 1);

      return {
        name: segment.name,
        percentage: pct((patients.length / total) * 100),
        ltv: Math.round(avgSpend),
        bestChannel,
      };
    })
    .filter(Boolean) as Psychographics["clusters"];
};

const generateDummyData = (): Patient[] => {
  return Array.from({ length: 50 }, (_, i) => ({
    patient_id: `P${i}`,
    referral_source: ['Instagram', 'Facebook', 'Google', 'Referral'][i % 4],
    total_spent: Math.floor(Math.random() * 10000),
    total_visits: Math.floor(Math.random() * 20) + 1,
    treatments_received: ['Botox', 'Filler', 'Laser'][i % 3],
    vip_status: i % 3 === 0 ? "Yes" : "No",
    zip_code: ['90210', '10021', '33139'][i % 3],
    age_group: ['25-34', '35-44', '45-54'][i % 3],
    last_visit: new Date().toISOString().split('T')[0]
  }));
};

/* ===================== MAIN API HANDLERS ===================== */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { procedure, patientData, useTestData } = body as { 
      procedure?: string;
      patientData?: Patient[];
      useTestData?: boolean;
    };

    const patients = patientData || (useTestData ? generateDummyData() : []);
    
    if (!patients || patients.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No patient data provided"
      }, { status: 400 });
    }

    const patientRecords: PatientRecord[] = patients.map((p) => ({
      patient_id: p.patient_id ?? `patient_${Math.random().toString(36).slice(2)}`,
      patient_zip: p.zip_code ?? "00000",
      procedure: safeSplitCSV(p.treatments_received)[0] || "Unknown",
      revenue: safeToNumber(p.total_spent, 0),
      appointment_date: p.last_visit ?? null,
      acquisition_channel: (p.referral_source ?? "Unknown").trim() || "Unknown",
    }));

    const analysis = analyzePatientData(patientRecords, procedure);
    const psychographics = analyzePsychographics(patients);
    const heroInsights = generateHeroInsights(patientRecords); // 🎯 ADDED THIS

    return NextResponse.json({
      success: true,
      summary: analysis.summary,
      insights: {
        heroInsights,  // 🎯 ADDED THIS
        patterns: (analysis.insights.patterns ?? []).slice(0, 5),
        opportunities: (analysis.insights.opportunities ?? []).slice(0, 3),
        expansion: {
          ...(analysis.insights.expansion ?? {}),
          targetZips: (analysis.insights.expansion?.targetZips ?? []).slice(0, 3),
          untappedZips: (analysis.insights.expansion?.untappedZips ?? []).slice(0, 5),
        },
        psychographics,
      },
      playbook: {
        ...analysis.playbook,
        messaging: (analysis.playbook.messaging ?? []).slice(0, 3),
      },
    });
  } catch (error) {
    console.error("Patient intelligence analysis error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze patient data" },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  const testData = generateDummyData();
  const records: PatientRecord[] = testData.map((p) => ({
    patient_id: p.patient_id ?? `patient_${Math.random().toString(36).slice(2)}`,
    patient_zip: p.zip_code ?? "00000",
    procedure: safeSplitCSV(p.treatments_received)[0] || "Unknown",
    revenue: safeToNumber(p.total_spent, 0),
    appointment_date: p.last_visit ?? null,
    acquisition_channel: (p.referral_source ?? "Unknown").trim() || "Unknown",
  }));

  const quick = analyzePatientData(records);
  const heroInsights = generateHeroInsights(records); // 🎯 ADDED THIS

  return NextResponse.json({
    success: true,
    message: "Patient Intelligence API is working",
    heroInsights,  // 🎯 ADDED THIS
    sampleInsight: quick.insights?.patterns?.[0] ?? null,
    summary: quick.summary,
  });
}