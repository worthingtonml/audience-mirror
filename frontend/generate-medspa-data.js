// generate-medspa-data.js
// Creates realistic medspa patient and campaign data
// Run: node generate-medspa-data.js

const fs = require('fs');
const { faker } = require('@faker-js/faker');

// Real ZIP codes with demographic profiles
const ZIP_PROFILES = {
  // Wealthy areas
  '11030': { wealth: 'high', avgAge: 42, femaleRatio: 0.65, botoxRate: 0.35 },
  '10021': { wealth: 'high', avgAge: 45, femaleRatio: 0.62, botoxRate: 0.40 },
  '90210': { wealth: 'high', avgAge: 40, femaleRatio: 0.68, botoxRate: 0.42 },
  
  // Middle income
  '11101': { wealth: 'medium', avgAge: 35, femaleRatio: 0.58, botoxRate: 0.20 },
  '07302': { wealth: 'medium', avgAge: 33, femaleRatio: 0.55, botoxRate: 0.18 },
  
  // Budget conscious
  '11211': { wealth: 'low', avgAge: 28, femaleRatio: 0.52, botoxRate: 0.10 },
  '10453': { wealth: 'low', avgAge: 30, femaleRatio: 0.54, botoxRate: 0.08 },
};

const PROCEDURES = [
  { name: 'botox', avgPrice: 400, popularity: 0.35, repeatRate: 0.8 },
  { name: 'dysport', avgPrice: 350, popularity: 0.15, repeatRate: 0.75 },
  { name: 'filler', avgPrice: 650, popularity: 0.20, repeatRate: 0.6 },
  { name: 'coolsculpting', avgPrice: 2000, popularity: 0.10, repeatRate: 0.3 },
  { name: 'hydrafacial', avgPrice: 200, popularity: 0.15, repeatRate: 0.7 },
  { name: 'laser_hair', avgPrice: 300, popularity: 0.05, repeatRate: 0.9 },
];

const PLATFORMS = {
  'facebook': { cpl: 15, convRate: 0.18, quality: 0.85 },
  'instagram': { cpl: 18, convRate: 0.15, quality: 0.80 },
  'google': { cpl: 25, convRate: 0.22, quality: 0.90 },
  'tiktok': { cpl: 12, convRate: 0.10, quality: 0.60 },
  'email': { cpl: 2, convRate: 0.35, quality: 0.95 },
  'referral': { cpl: 0, convRate: 0.45, quality: 1.0 },
  'organic': { cpl: 0, convRate: 0.30, quality: 0.88 },
};

// Generate patient records
function generatePatientData(numRecords = 10000) {
  console.log(`Generating ${numRecords} patient records...`);
  const patients = [];
  
  for (let i = 0; i < numRecords; i++) {
    const zip = faker.helpers.objectKey(ZIP_PROFILES);
    const profile = ZIP_PROFILES[zip];
    const platform = faker.helpers.objectKey(PLATFORMS);
    const platformData = PLATFORMS[platform];
    
    // Select procedure based on popularity
    const procedureRand = Math.random();
    let cumulativeProb = 0;
    let selectedProcedure = PROCEDURES[0];
    for (const proc of PROCEDURES) {
      cumulativeProb += proc.popularity;
      if (procedureRand <= cumulativeProb) {
        selectedProcedure = proc;
        break;
      }
    }
    
    // Simulate realistic patterns
    const age = Math.round(faker.number.int({ min: 21, max: 65 }));
    const isFemale = Math.random() < profile.femaleRatio;
    const isNewPatient = Math.random() < 0.3;
    
    // Wealth affects show rate and LTV
    const showRate = profile.wealth === 'high' ? 0.92 : 
                    profile.wealth === 'medium' ? 0.85 : 0.75;
    
    const showed = Math.random() < showRate * platformData.quality;
    const completed = showed && Math.random() < 0.95;
    
    // Calculate realistic costs and revenue
    const baseCost = selectedProcedure.avgPrice;
    const wealthMultiplier = profile.wealth === 'high' ? 1.3 : 
                            profile.wealth === 'medium' ? 1.0 : 0.8;
    const treatmentCost = Math.round(baseCost * wealthMultiplier * (0.9 + Math.random() * 0.2));
    
    const campaignCost = platformData.cpl * (1 + (Math.random() - 0.5) * 0.4);
    
    // High-value patients return more
    const willReturn = completed && Math.random() < selectedProcedure.repeatRate;
    const lifetimeValue = completed ? 
      treatmentCost * (willReturn ? (2 + Math.floor(Math.random() * 4)) : 1) : 0;
    
    patients.push({
      patient_id: `PAT${String(i).padStart(6, '0')}`,
      patient_zip: zip,
      patient_age: age,
      patient_gender: isFemale ? 'F' : 'M',
      first_visit_date: faker.date.past({ years: 2 }).toISOString().split('T')[0],
      
      treatment_date: faker.date.recent({ days: 90 }).toISOString().split('T')[0],
      procedure: selectedProcedure.name,
      provider: faker.helpers.arrayElement(['Dr. Smith', 'Dr. Johnson', 'Dr. Lee', 'NP Williams']),
      treatment_cost: treatmentCost,
      
      acquisition_channel: platform,
      campaign_id: `CAMP${faker.number.int({ min: 1000, max: 9999 })}`,
      ad_spend: Math.round(campaignCost * 100) / 100,
      
      showed_for_appointment: showed ? 1 : 0,
      completed_treatment: completed ? 1 : 0,
      revenue: completed ? treatmentCost : 0,
      returned_within_90_days: willReturn ? 1 : 0,
      lifetime_value: lifetimeValue,
      
      // Additional features for better ML
      days_since_first_visit: faker.number.int({ min: 0, max: 730 }),
      total_appointments: willReturn ? faker.number.int({ min: 2, max: 10 }) : 1,
      referrals_made: willReturn ? faker.number.int({ min: 0, max: 3 }) : 0,
    });
    
    if ((i + 1) % 1000 === 0) {
      console.log(`  Generated ${i + 1} records...`);
    }
  }
  
  return patients;
}

// Generate campaign performance data
function generateCampaignData(numCampaigns = 500) {
  console.log(`Generating ${numCampaigns} campaign records...`);
  const campaigns = [];
  
  for (let i = 0; i < numCampaigns; i++) {
    const platform = faker.helpers.objectKey(PLATFORMS);
    const zip = faker.helpers.objectKey(ZIP_PROFILES);
    const profile = ZIP_PROFILES[zip];
    const platformData = PLATFORMS[platform];
    
    const impressions = faker.number.int({ min: 1000, max: 50000 });
    const ctr = (0.01 + Math.random() * 0.04) * 
                (platform === 'google' ? 1.5 : 1.0); // Google higher CTR
    const clicks = Math.round(impressions * ctr);
    const convRate = platformData.convRate * (0.8 + Math.random() * 0.4);
    const leads = Math.round(clicks * convRate);
    const bookingRate = profile.wealth === 'high' ? 0.7 : 0.5;
    const appointments = Math.round(leads * bookingRate);
    const showRate = profile.wealth === 'high' ? 0.9 : 0.75;
    const completed = Math.round(appointments * showRate);
    
    const spend = clicks * platformData.cpl * (0.9 + Math.random() * 0.2);
    const avgTicket = profile.wealth === 'high' ? 650 : 400;
    const revenue = completed * avgTicket;
    
    campaigns.push({
      campaign_id: `CAMP${String(1000 + i).padStart(4, '0')}`,
      platform: platform,
      start_date: faker.date.recent({ days: 90 }).toISOString().split('T')[0],
      end_date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
      target_zip: zip,
      target_demographic: faker.helpers.arrayElement(['25-34', '35-44', '45-54', '55+']),
      ad_creative_id: `CREATIVE${faker.number.int({ min: 100, max: 999 })}`,
      
      impressions: impressions,
      clicks: clicks,
      leads: leads,
      appointments_booked: appointments,
      appointments_completed: completed,
      total_spend: Math.round(spend),
      total_revenue: Math.round(revenue),
      
      // Calculated metrics
      cpl: leads > 0 ? Math.round(spend / leads) : 0,
      cpa: completed > 0 ? Math.round(spend / completed) : 0,
      roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
      profit: Math.round(revenue - spend),
    });
  }
  
  return campaigns;
}

// Generate and save data
console.log('🚀 Generating realistic MedSpa data...\n');

const patientData = generatePatientData(10000);
const campaignData = generateCampaignData(500);

// Save as CSV
console.log('\nSaving CSV files...');

const patientCsv = [
  Object.keys(patientData[0]).join(','),
  ...patientData.map(row => Object.values(row).join(','))
].join('\n');

const campaignCsv = [
  Object.keys(campaignData[0]).join(','),
  ...campaignData.map(row => Object.values(row).join(','))
].join('\n');

fs.writeFileSync('patient_data.csv', patientCsv);
fs.writeFileSync('campaign_data.csv', campaignCsv);

// Also save as JSON for easy debugging
fs.writeFileSync('patient_data.json', JSON.stringify(patientData, null, 2));
fs.writeFileSync('campaign_data.json', JSON.stringify(campaignData, null, 2));

// Generate summary statistics
const stats = {
  totalPatients: patientData.length,
  totalCampaigns: campaignData.length,
  avgShowRate: (patientData.filter(p => p.showed_for_appointment).length / patientData.length * 100).toFixed(1),
  avgLTV: Math.round(patientData.reduce((sum, p) => sum + p.lifetime_value, 0) / patientData.length),
  platformPerformance: {},
  procedurePopularity: {},
  zipPerformance: {}
};

// Calculate platform performance
Object.keys(PLATFORMS).forEach(platform => {
  const platformPatients = patientData.filter(p => p.acquisition_channel === platform);
  if (platformPatients.length > 0) {
    stats.platformPerformance[platform] = {
      patients: platformPatients.length,
      avgRevenue: Math.round(platformPatients.reduce((sum, p) => sum + p.revenue, 0) / platformPatients.length),
      showRate: (platformPatients.filter(p => p.showed_for_appointment).length / platformPatients.length * 100).toFixed(1) + '%'
    };
  }
});

// Calculate procedure popularity
PROCEDURES.forEach(proc => {
  const procPatients = patientData.filter(p => p.procedure === proc.name);
  if (procPatients.length > 0) {
    stats.procedurePopularity[proc.name] = {
      count: procPatients.length,
      avgRevenue: Math.round(procPatients.reduce((sum, p) => sum + p.revenue, 0) / procPatients.length)
    };
  }
});

// Best performing combination
const bestPlatform = Object.entries(stats.platformPerformance)
  .sort((a, b) => b[1].avgRevenue - a[1].avgRevenue)[0];

console.log('\n✅ Success! Generated:');
console.log(`  • patient_data.csv (${patientData.length.toLocaleString()} records)`);
console.log(`  • campaign_data.csv (${campaignData.length} campaigns)`);
console.log(`  • JSON versions for debugging`);

console.log('\n📊 Data Summary:');
console.log(`  • Average show rate: ${stats.avgShowRate}%`);
console.log(`  • Average patient LTV: $${stats.avgLTV}`);
console.log(`  • Best platform: ${bestPlatform[0]} ($${bestPlatform[1].avgRevenue} avg revenue)`);

console.log('\n📈 Platform Performance:');
Object.entries(stats.platformPerformance).forEach(([platform, data]) => {
  console.log(`  • ${platform}: ${data.patients} patients, $${data.avgRevenue} avg, ${data.showRate} show rate`);
});

console.log('\n💉 Procedure Popularity:');
Object.entries(stats.procedurePopularity)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 3)
  .forEach(([procedure, data]) => {
    console.log(`  • ${procedure}: ${data.count} patients, $${data.avgRevenue} avg revenue`);
  });

console.log('\n🎯 Next Step: Run "python train_production_model.py" to train ML models on this data');
console.log('              (Make sure you have: pip install pandas scikit-learn xgboost joblib)\n');