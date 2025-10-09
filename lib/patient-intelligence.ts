// lib/patient-intelligence.ts
// Complete system for analyzing patient data and finding growth opportunities

/* =========================
   Types
========================= */

export interface PatientRecord {
  patient_id: string;
  patient_zip: string;
  procedure: string;
  revenue: number;
  appointment_date?: string;
  acquisition_channel?: string;
  completed?: boolean;
  provider?: string;
}

export interface BestPatient {
  id: string;
  totalRevenue: number;
  visitCount: number;
  procedures: string[];
  firstVisit: Date | null;
  lastVisit: Date | null;
  zip: string;
  acquisitionChannel?: string;
  daysSinceLastVisit: number;
  avgTransactionValue: number;
}

export type PatternType = "concentration" | "geographic" | "behavioral" | "opportunity" | "channel";

export interface PatternInsight {
  type: PatternType;
  title: string;
  description: string;
  action: string;
  value: number;
  confidence: number; // 0..1
}

export interface TargetZip {
  zip: string;
  matchScore: number;
  cohort: "Budget Conscious" | "Comfort Spenders" | "Luxury Clients";
  patientCount: number;
  revenue: number;
  avgValue: number;
  competition: string; // placeholder until you wire external data
  distance: number; // placeholder until you know practice location
}

export interface ExpansionBlock {
  targetZips: TargetZip[];
  untappedZips: string[];
  targetChannels: { name: string; count: number; revenue: number; avgValue: number }[];
  targetProcedures: { name: string; count: number; revenue: number; avgValue: number }[];
  totalOpportunity: number;
}

export interface Playbook {
  targetAudience: {
    profile: {
      avgLifetimeValue: number;
      avgVisitsPerYear: number;
      preferredTreatments: string[];
    };
    segments: { name: string; count: number; value: number; characteristics: string }[];
  };
  channels: { name: string; allocation: number; rationale: string }[];
  messaging: { theme: string; message: string; target?: string }[];
  timing: { bestBookingWindow: string; optimalFollowUp: string; seasonalPeaks: string[] };
  budget: { suggestedIncrease: number; reallocation: { from: string; to: string; amount: number }[] };
}

export interface PatientIntelSummary {
  totalPatients: number;
  bestPatientCount: number;
  revenueConcentration: number; // %
  avgBestPatientValue: number;
  avgOverallValue: number;
  multiplier: number;
}

export interface PatientIntelResult {
  summary: PatientIntelSummary;
  insights: {
    patterns: PatternInsight[];
    opportunities: PatternInsight[];
    expansion: ExpansionBlock;
  };
  playbook: Playbook;
}

/* =========================
   Core Analysis Engine
========================= */

export class PatientIntelligenceEngine {
  private data: PatientRecord[];
  private procedureFilter?: string;

  constructor(data: PatientRecord[], procedureFilter?: string) {
    this.data = data;
    this.procedureFilter = procedureFilter;
  }

  public analyze(): PatientIntelResult {
    const filteredData =
      this.procedureFilter && this.procedureFilter !== "all"
        ? this.data.filter((r) => r.procedure === this.procedureFilter)
        : this.data;

    const bestPatients = this.findBestPatients(filteredData);
    const patterns = this.discoverPatterns(bestPatients, filteredData);
    const opportunities = this.findOptimizations(bestPatients, filteredData);
    const expansion = this.findExpansion(bestPatients, filteredData);
    const playbook = this.generatePlaybook(bestPatients, patterns);
    const summary = this.generateSummary(bestPatients, filteredData);

    return {
      summary,
      insights: {
        patterns,
        opportunities,
        expansion,
      },
      playbook,
    };
  }

  /* ---------- Step 1: Best patients ---------- */

  private findBestPatients(data: PatientRecord[]): BestPatient[] {
    const patientMap = new Map<string, BestPatient>();

    data.forEach((record) => {
      const id = record.patient_id;
      if (!patientMap.has(id)) {
        patientMap.set(id, {
          id,
          totalRevenue: 0,
          visitCount: 0,
          procedures: [],
          firstVisit: null,
          lastVisit: null,
          zip: record.patient_zip,
          acquisitionChannel: record.acquisition_channel,
          daysSinceLastVisit: 0,
          avgTransactionValue: 0,
        });
      }

      const patient = patientMap.get(id)!;
      patient.totalRevenue += record.revenue;
      patient.visitCount += 1;

      if (record.procedure && !patient.procedures.includes(record.procedure)) {
        patient.procedures.push(record.procedure);
      }

      const visitDate = record.appointment_date ? new Date(record.appointment_date) : null;
      if (visitDate && !isNaN(visitDate.getTime())) {
        if (!patient.firstVisit || visitDate < patient.firstVisit) patient.firstVisit = visitDate;
        if (!patient.lastVisit || visitDate > patient.lastVisit) patient.lastVisit = visitDate;
      }
    });

    const today = new Date();
    patientMap.forEach((p) => {
      p.avgTransactionValue = p.visitCount > 0 ? p.totalRevenue / p.visitCount : 0;
      p.daysSinceLastVisit =
        p.lastVisit && !isNaN(p.lastVisit.getTime())
          ? Math.floor((today.getTime() - p.lastVisit.getTime()) / (1000 * 60 * 60 * 24))
          : Number.MAX_SAFE_INTEGER;
    });

    const all = Array.from(patientMap.values());
    if (all.length === 0) return [];

    const sorted = all.sort((a, b) => b.totalRevenue - a.totalRevenue);
    const top20 = Math.max(1, Math.ceil(sorted.length * 0.2));
    return sorted.slice(0, top20);
  }

  /* ---------- Step 2: Patterns ---------- */

  private discoverPatterns(best: BestPatient[], all: PatientRecord[]): PatternInsight[] {
    const patterns: PatternInsight[] = [];

    const totalRevenue = this.calculateTotalRevenue(all);
    const bestRevenue = best.reduce((s, p) => s + p.totalRevenue, 0);
    const conc = totalRevenue > 0 ? (bestRevenue / totalRevenue) * 100 : 0;

    patterns.push({
      type: "concentration",
      title: `Top ${best.length} patients = ${conc.toFixed(0)}% of revenue`,
      description: `Your best patients (${best.length}) generated $${bestRevenue.toLocaleString()} out of $${totalRevenue.toLocaleString()} total`,
      action: "Focus retention efforts on these high-value patients",
      value: Math.round(bestRevenue * 0.1),
      confidence: 0.95,
    });

    const zipAnalysis = this.analyzeZipPatterns(best);
    if (zipAnalysis.topZips.length > 0) {
      const topZip = zipAnalysis.topZips[0];
      patterns.push({
        type: "geographic",
        title: `ZIP ${topZip.zip} produces highest-value patients`,
        description: `${topZip.patientCount} patients from ${topZip.zip} generated $${topZip.revenue.toLocaleString()}`,
        action: `Increase marketing spend in ${topZip.zip} and similar demographics`,
        value: Math.round(topZip.revenue * 0.3),
        confidence: 0.88,
      });
    }

    const combo = best.filter((p) => p.procedures.length > 1);
    const single = best.filter((p) => p.procedures.length === 1);
    if (combo.length > 0 && single.length > 0) {
      const avgCombo = combo.reduce((s, p) => s + p.totalRevenue, 0) / combo.length;
      const avgSingle = single.reduce((s, p) => s + p.totalRevenue, 0) / single.length || 1;
      const multiplier = avgCombo / avgSingle;

      patterns.push({
        type: "behavioral",
        title: `Combination treatments worth ${multiplier.toFixed(1)}x singles`,
        description: `Patients getting multiple procedures average $${avgCombo.toLocaleString()} vs $${avgSingle.toLocaleString()}`,
        action: "Promote treatment packages and combinations",
        value: Math.max(0, Math.round(single.length * (avgCombo - avgSingle) * 0.2)),
        confidence: 0.85,
      });
    }

    const channelAnalysis = this.analyzeChannels(best);
    if (channelAnalysis.bestChannel) {
      patterns.push({
        type: "channel",
        title: `${channelAnalysis.bestChannel.name} produces best patients`,
        description: `${channelAnalysis.bestChannel.count} top patients came from ${channelAnalysis.bestChannel.name}`,
        action: `Shift 30% more budget to ${channelAnalysis.bestChannel.name}`,
        value: Math.round(channelAnalysis.bestChannel.revenue * 0.3),
        confidence: 0.82,
      });
    }

    return patterns;
  }

  /* ---------- Step 3: Optimizations ---------- */

  private findOptimizations(best: BestPatient[], _all: PatientRecord[]): PatternInsight[] {
    const opportunities: PatternInsight[] = [];

    // Dormant
    const dormantDays = 90;
    const dormant = best.filter((p) => p.daysSinceLastVisit > dormantDays);
    if (dormant.length > 0) {
      const rev = dormant.reduce((s, p) => s + p.totalRevenue, 0);
      opportunities.push({
        type: "opportunity",
        title: `Reactivate ${dormant.length} dormant high-value patients`,
        description: `Haven't visited in ${dormantDays}+ days, previously worth $${rev.toLocaleString()} total`,
        action: "Launch personalized win-back campaign with special offers",
        value: Math.round(rev * 0.3),
        confidence: 0.75,
      });
    }

    // Single → multi upsell
    const single = best.filter((p) => p.procedures.length === 1);
    const multi = best.filter((p) => p.procedures.length > 1);
    if (single.length > 0 && multi.length > 0) {
      const avgMulti = multi.reduce((s, p) => s + p.totalRevenue, 0) / multi.length;
      const avgSingle = single.reduce((s, p) => s + p.totalRevenue, 0) / single.length || 1;
      const upsell = Math.max(0, (avgMulti - avgSingle) * single.length * 0.25);

      opportunities.push({
        type: "opportunity",
        title: `Upsell ${single.length} single-treatment patients`,
        description: `Multi-treatment patients worth ${(avgMulti / avgSingle).toFixed(1)}x more on average`,
        action: "Offer complementary treatment discounts at checkout",
        value: Math.round(upsell),
        confidence: 0.8,
      });
    }

    // Frequency lift
    if (best.length > 0) {
      const avgVisits = best.reduce((s, p) => s + p.visitCount, 0) / best.length;
      const lowFreq = best.filter((p) => p.visitCount < avgVisits);
      if (lowFreq.length > 0) {
        const addRev = lowFreq.reduce((s, p) => s + p.avgTransactionValue * (avgVisits - p.visitCount), 0);
        opportunities.push({
          type: "opportunity",
          title: `Increase visit frequency for ${lowFreq.length} patients`,
          description: "Below-average visit frequency despite high value",
          action: "Create membership program with visit incentives",
          value: Math.round(addRev * 0.4),
          confidence: 0.7,
        });
      }
    }

    return opportunities;
    }

  /* ---------- Step 4: Expansion ---------- */

  private findExpansion(best: BestPatient[], all: PatientRecord[]): ExpansionBlock {
    const zipAgg = this.analyzeZipPatterns(best);
    const targetZipStats = zipAgg.topZips.slice(0, 3);

    const targetZips: TargetZip[] = targetZipStats.map((z) => {
      const avgValue = z.patientCount > 0 ? z.revenue / z.patientCount : 0;
      let cohort: TargetZip["cohort"] = "Budget Conscious";
      if (avgValue > 2000) cohort = "Luxury Clients";
      else if (avgValue > 1000) cohort = "Comfort Spenders";

      return {
        zip: z.zip,
        matchScore: Math.min(95, Math.round(70 + z.patientCount * 2)),
        cohort,
        patientCount: z.patientCount,
        revenue: z.revenue,
        avgValue,
        competition: "None",
        distance: 0.0,
      };
    });

    const currentZips = new Set(all.map((r) => r.patient_zip));
    const neighbors = this.findAdjacentZips(targetZips.map((t) => t.zip));
    const untappedZips = neighbors.filter((z) => !currentZips.has(z));

    const channelAnalysis = this.analyzeChannels(best);
    const targetChannels = channelAnalysis.channels.slice(0, 3);

    const targetProcedures = this.analyzeProcedures(best).slice(0, 3);

    const avgBestValue = best.length > 0 ? best.reduce((s, p) => s + p.totalRevenue, 0) / best.length : 0;
    const potentialNewPatients = untappedZips.length * 10; // crude placeholder
    const totalOpportunity = Math.round(potentialNewPatients * avgBestValue);

    return {
      targetZips,
      untappedZips,
      targetChannels,
      targetProcedures,
      totalOpportunity,
    };
  }

  /* ---------- Step 5: Playbook ---------- */

  private generatePlaybook(best: BestPatient[], patterns: PatternInsight[]): Playbook {
    return {
      targetAudience: this.defineTargetAudience(best),
      channels: this.recommendChannels(best),
      messaging: this.generateMessaging(best, patterns),
      timing: this.analyzeTiming(best),
      budget: this.recommendBudget(patterns),
    };
  }

  /* ---------- Helpers ---------- */

  private calculateTotalRevenue(data: PatientRecord[]): number {
    return data.reduce((s, r) => s + (r.revenue || 0), 0);
  }

  private analyzeZipPatterns(best: BestPatient[]) {
    const map = new Map<string, { revenue: number; patientCount: number }>();
    best.forEach((p) => {
      const cur = map.get(p.zip) || { revenue: 0, patientCount: 0 };
      map.set(p.zip, { revenue: cur.revenue + p.totalRevenue, patientCount: cur.patientCount + 1 });
    });

    const topZips = Array.from(map.entries())
      .map(([zip, v]) => ({
        zip,
        revenue: v.revenue,
        patientCount: v.patientCount,
        avgPerPatient: v.patientCount > 0 ? v.revenue / v.patientCount : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { topZips };
  }

  private analyzeChannels(best: BestPatient[]) {
    const map = new Map<string, { count: number; revenue: number }>();
    best.forEach((p) => {
      const ch = p.acquisitionChannel?.trim();
      if (!ch) return;
      const cur = map.get(ch) || { count: 0, revenue: 0 };
      map.set(ch, { count: cur.count + 1, revenue: cur.revenue + p.totalRevenue });
    });

    const channels = Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        count: v.count,
        revenue: v.revenue,
        avgValue: v.count > 0 ? v.revenue / v.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { bestChannel: channels[0], channels };
  }

  private analyzeProcedures(best: BestPatient[]) {
    const map = new Map<string, { count: number; revenue: number }>();
    best.forEach((p) => {
      p.procedures.forEach((proc) => {
        const cur = map.get(proc) || { count: 0, revenue: 0 };
        // split revenue across procedures to avoid double-counting
        map.set(proc, { count: cur.count + 1, revenue: cur.revenue + p.totalRevenue / p.procedures.length });
      });
    });

    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        count: v.count,
        revenue: v.revenue,
        avgValue: v.count > 0 ? v.revenue / v.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private findAdjacentZips(zips: string[]): string[] {
    const out: string[] = [];
    zips.forEach((z) => {
      const base = parseInt(z, 10);
      if (!isNaN(base)) {
        out.push(String(base - 1).padStart(5, "0"), String(base + 1).padStart(5, "0"));
      }
    });
    return [...new Set(out)];
  }

  private defineTargetAudience(best: BestPatient[]) {
    const avgRevenue = best.length ? best.reduce((s, p) => s + p.totalRevenue, 0) / best.length : 0;
    const avgVisits = best.length ? best.reduce((s, p) => s + p.visitCount, 0) / best.length : 0;
    const commonProcedures = this.analyzeProcedures(best).slice(0, 3).map((p) => p.name);

    return {
      profile: {
        avgLifetimeValue: Math.round(avgRevenue),
        avgVisitsPerYear: Number(avgVisits.toFixed(1)),
        preferredTreatments: commonProcedures,
      },
      segments: this.identifySegments(best),
    };
  }

  private identifySegments(best: BestPatient[]) {
    const segments: { name: string; count: number; value: number; characteristics: string }[] = [];

    const frequentVisitors = best.filter((p) => p.visitCount > 4);
    if (frequentVisitors.length > 0) {
      segments.push({
        name: "VIP Regulars",
        count: frequentVisitors.length,
        value: frequentVisitors.reduce((s, p) => s + p.totalRevenue, 0),
        characteristics: "Visit 4+ times per year, high lifetime value",
      });
    }

    const comboBuyers = best.filter((p) => p.procedures.length > 1);
    if (comboBuyers.length > 0) {
      segments.push({
        name: "Package Buyers",
        count: comboBuyers.length,
        value: comboBuyers.reduce((s, p) => s + p.totalRevenue, 0),
        characteristics: "Purchase multiple treatments together",
      });
    }

    return segments;
  }

  private recommendChannels(best: BestPatient[]) {
    const { channels } = this.analyzeChannels(best);
    const total = channels.reduce((s, c) => s + c.revenue, 0) || 1;
    return channels.map((c) => ({
      name: c.name,
      allocation: Math.round((c.revenue / total) * 100),
      rationale: `Generates ${c.count} high-value patients`,
    }));
  }

  private generateMessaging(best: BestPatient[], patterns: PatternInsight[]) {
    const messages: { theme: string; message: string; target?: string }[] = [];

    patterns.forEach((p) => {
      if (p.type === "behavioral") {
        messages.push({ theme: "Value Proposition", message: p.title, target: "New patients" });
      }
    });

    const topProcedures = this.analyzeProcedures(best).slice(0, 2);
    topProcedures.forEach((proc) => {
      messages.push({
        theme: "Treatment Focus",
        message: `Expert ${proc.name} treatments with proven results`,
        target: "Procedure-specific audience",
      });
    });

    return messages;
  }

  private analyzeTiming(_best: BestPatient[]) {
    return {
      bestBookingWindow: "2-3 weeks advance",
      optimalFollowUp: "90 days",
      seasonalPeaks: ["Q1", "Q4"],
    };
  }

  private recommendBudget(patterns: PatternInsight[]) {
    const totalOpp = patterns.reduce((s, p) => s + (p.value || 0), 0);
    const reallocFrom = "Low-performing channels";

    return {
      suggestedIncrease: Math.round(totalOpp * 0.1),
      reallocation: patterns
        .filter((p) => p.type === "channel" || p.type === "geographic")
        .map((p) => ({
          from: reallocFrom,
          to: p.title,
          amount: Math.round((p.value || 0) * 0.1),
        })),
    };
  }

  private generateSummary(best: BestPatient[], all: PatientRecord[]): PatientIntelSummary {
    const totalRevenue = this.calculateTotalRevenue(all);
    const bestRevenue = best.reduce((s, p) => s + p.totalRevenue, 0);
    const uniquePatients = new Set(all.map((r) => r.patient_id)).size || 1;
    const bestCount = best.length || 1;

    const avgBest = Math.round(bestRevenue / bestCount);
    const avgOverall = Math.round(totalRevenue / uniquePatients);
    const multiplier = avgOverall > 0 ? (bestRevenue / bestCount) / avgOverall : 0;

    return {
      totalPatients: uniquePatients,
      bestPatientCount: best.length,
      revenueConcentration: Math.round(totalRevenue > 0 ? (bestRevenue / totalRevenue) * 100 : 0),
      avgBestPatientValue: avgBest,
      avgOverallValue: avgOverall,
      multiplier,
    };
  }
}

/* =========================
   Exported convenience fn
========================= */

export function analyzePatientData(data: PatientRecord[], procedureFilter?: string): PatientIntelResult {
  const engine = new PatientIntelligenceEngine(data, procedureFilter);
  return engine.analyze();
}
