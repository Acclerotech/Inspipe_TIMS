// export type RiskCategory = 'High' | 'Medium' | 'Low';
// export type TankStatus = 'Action Needed' | 'Monitor' | 'Good' | 'Offline';
// export type DefectSeverity = 'High' | 'Medium' | 'Low';
// export type DefectStatus = 'Open' | 'Closed' | 'Monitoring';
// export type InspType = 'Visual' | 'External' | 'UT Survey' | 'MFL Scan' | 'Internal';
// export type EventStatus = 'Planned' | 'In Progress' | 'Complete' | 'Overdue';

// export interface Tank {
//   id: string; name: string; site: string;
//   service: string; diameter: number; height: number;
//   capacity: number; yearBuilt: number; material: string;
//   riskCategory: RiskCategory; status: TankStatus;
//   lastInspDate: string; lastInspType: string;
//   nextInspDate: string; remainingLife: number;
//   corrosionRateMax: number; minThickness: number;
//   complianceStatus: 'Compliant' | 'Action Required' | 'Monitor';
//   defectsOpen: number;
// }

// export interface Defect {
//   id: string; tankId: string;
//   location: string; component: string;
//   type: string; severity: DefectSeverity;
//   maxLoss: number; wallLoss: number;
//   firstDetected: string; lastObserved: string;
//   status: DefectStatus;
// }

// export interface PlannerEvent {
//   id: string; tankId: string; tankName: string; site: string;
//   type: InspType; week: number;
//   startDate: string; endDate: string;
//   status: EventStatus; risk: RiskCategory;
// }

// export interface ActivityItem {
//   id: string; action: string; tankId: string;
//   user: string; timeAgo: string; detail: string;
//   icon: 'upload' | 'check' | 'scan' | 'report' | 'camera';
// }

// export const tanks: Tank[] = [
//   { id:'T-101', name:'T-101', site:'Rotterdam Terminal A', service:'Water', diameter:30, height:10, capacity:7069, yearBuilt:2010, material:'Carbon Steel', riskCategory:'Low', status:'Good', lastInspDate:'22 Dec 2024', lastInspType:'External', nextInspDate:'22 Dec 2029', remainingLife:7.6, corrosionRateMax:0.08, minThickness:10.2, complianceStatus:'Compliant', defectsOpen:0 },
//   { id:'T-102', name:'T-102', site:'Rotterdam Terminal A', service:'Diesel', diameter:35, height:11, capacity:10589, yearBuilt:2008, material:'Carbon Steel', riskCategory:'Medium', status:'Monitor', lastInspDate:'18 Feb 2025', lastInspType:'External', nextInspDate:'18 Feb 2028', remainingLife:2.8, corrosionRateMax:0.14, minThickness:9.1, complianceStatus:'Monitor', defectsOpen:2 },
//   { id:'T-103', name:'T-103', site:'Rotterdam Terminal A', service:'Jet Fuel', diameter:38, height:11, capacity:12449, yearBuilt:2005, material:'Carbon Steel', riskCategory:'Medium', status:'Monitor', lastInspDate:'05 Jan 2025', lastInspType:'Internal', nextInspDate:'05 Jan 2027', remainingLife:1.7, corrosionRateMax:0.18, minThickness:8.4, complianceStatus:'Monitor', defectsOpen:3 },
//   { id:'T-104', name:'T-104', site:'Rotterdam Terminal A', service:'Crude Oil', diameter:40, height:12, capacity:15080, yearBuilt:2003, material:'Carbon Steel', riskCategory:'Medium', status:'Monitor', lastInspDate:'10 Nov 2024', lastInspType:'Visual', nextInspDate:'10 Nov 2027', remainingLife:3.1, corrosionRateMax:0.16, minThickness:8.8, complianceStatus:'Monitor', defectsOpen:1 },
//   { id:'T-105', name:'T-105', site:'Rotterdam Terminal A', service:'Crude Oil', diameter:42, height:12, capacity:16620, yearBuilt:1998, material:'Carbon Steel', riskCategory:'High', status:'Action Needed', lastInspDate:'12 Mar 2025', lastInspType:'Internal', nextInspDate:'14 Feb 2027', remainingLife:1.2, corrosionRateMax:0.22, minThickness:6.2, complianceStatus:'Action Required', defectsOpen:3 },
//   { id:'T-106', name:'T-106', site:'Rotterdam Terminal A', service:'Diesel', diameter:36, height:10, capacity:10179, yearBuilt:2009, material:'Carbon Steel', riskCategory:'Medium', status:'Monitor', lastInspDate:'22 Mar 2024', lastInspType:'Visual', nextInspDate:'22 Mar 2027', remainingLife:3.4, corrosionRateMax:0.12, minThickness:9.5, complianceStatus:'Compliant', defectsOpen:1 },
//   { id:'T-107', name:'T-107', site:'Rotterdam Terminal A', service:'Naphtha', diameter:32, height:10, capacity:8042, yearBuilt:2012, material:'Carbon Steel', riskCategory:'Low', status:'Good', lastInspDate:'14 Jun 2024', lastInspType:'External', nextInspDate:'14 Jun 2029', remainingLife:5.1, corrosionRateMax:0.09, minThickness:10.8, complianceStatus:'Compliant', defectsOpen:0 },
//   { id:'T-108', name:'T-108', site:'Rotterdam Terminal A', service:'Diesel', diameter:34, height:11, capacity:9998, yearBuilt:2007, material:'Carbon Steel', riskCategory:'Medium', status:'Monitor', lastInspDate:'05 Mar 2025', lastInspType:'Visual', nextInspDate:'05 Mar 2028', remainingLife:2.9, corrosionRateMax:0.15, minThickness:9.0, complianceStatus:'Monitor', defectsOpen:2 },
//   { id:'T-109', name:'T-109', site:'Rotterdam Terminal A', service:'Crude Oil', diameter:42, height:12, capacity:16620, yearBuilt:2001, material:'Carbon Steel', riskCategory:'High', status:'Action Needed', lastInspDate:'20 Jan 2025', lastInspType:'MFL Scan', nextInspDate:'20 Jan 2027', remainingLife:1.5, corrosionRateMax:0.20, minThickness:6.8, complianceStatus:'Action Required', defectsOpen:5 },
//   { id:'T-110', name:'T-110', site:'Rotterdam Terminal A', service:'Jet Fuel', diameter:38, height:11, capacity:12449, yearBuilt:2004, material:'Carbon Steel', riskCategory:'Medium', status:'Monitor', lastInspDate:'12 Feb 2025', lastInspType:'UT Survey', nextInspDate:'12 Feb 2027', remainingLife:2.1, corrosionRateMax:0.17, minThickness:8.1, complianceStatus:'Monitor', defectsOpen:2 },
//   { id:'T-111', name:'T-111', site:'Rotterdam Terminal A', service:'Water', diameter:28, height:9, capacity:5541, yearBuilt:2015, material:'Carbon Steel', riskCategory:'Low', status:'Good', lastInspDate:'01 Apr 2024', lastInspType:'External', nextInspDate:'01 Apr 2029', remainingLife:6.8, corrosionRateMax:0.06, minThickness:11.4, complianceStatus:'Compliant', defectsOpen:0 },
//   { id:'T-112', name:'T-112', site:'Rotterdam Terminal A', service:'Diesel', diameter:36, height:10, capacity:10179, yearBuilt:2006, material:'Carbon Steel', riskCategory:'Medium', status:'Monitor', lastInspDate:'18 Feb 2025', lastInspType:'External', nextInspDate:'18 Feb 2028', remainingLife:2.8, corrosionRateMax:0.14, minThickness:9.2, complianceStatus:'Monitor', defectsOpen:1 },
// ];

// export const defects: Defect[] = [
//   { id:'D1', tankId:'T-105', location:'Floor, F-04, r=14.2m', component:'Floor', type:'Pitting Cluster', severity:'High', maxLoss:56, wallLoss:3.4, firstDetected:'10 Mar 2015', lastObserved:'Apr 2026', status:'Open' },
//   { id:'D2', tankId:'T-105', location:'Floor, F-01, r=8.6m', component:'Floor', type:'Pitting Cluster', severity:'High', maxLoss:54, wallLoss:3.2, firstDetected:'10 Mar 2015', lastObserved:'Apr 2026', status:'Open' },
//   { id:'D3', tankId:'T-105', location:'Floor, F-07, r=15.8m', component:'Floor', type:'Pitting Cluster', severity:'High', maxLoss:51, wallLoss:3.1, firstDetected:'10 Mar 2015', lastObserved:'Apr 2026', status:'Open' },
//   { id:'D4', tankId:'T-105', location:'Floor, F-11, r=6.2m', component:'Floor', type:'General Corrosion', severity:'Medium', maxLoss:28, wallLoss:1.7, firstDetected:'10 Mar 2015', lastObserved:'Apr 2026', status:'Open' },
//   { id:'D5', tankId:'T-105', location:'Shell 120° / 2.5mH', component:'Shell', type:'Pitting Corrosion', severity:'High', maxLoss:40, wallLoss:2.4, firstDetected:'12 Mar 2025', lastObserved:'12 Mar 2025', status:'Open' },
// ];

// export const plannerEvents: PlannerEvent[] = [
//   { id:'E1', tankId:'T-101', tankName:'T-101', site:'Rotterdam A', type:'Visual', week:19, startDate:'2026-05-04', endDate:'2026-05-07', status:'Planned', risk:'Low' },
//   { id:'E2', tankId:'T-101', tankName:'T-101', site:'Rotterdam A', type:'External', week:23, startDate:'2026-06-01', endDate:'2026-06-04', status:'Planned', risk:'Low' },
//   { id:'E3', tankId:'T-102', tankName:'T-102', site:'Rotterdam A', type:'Visual', week:21, startDate:'2026-05-18', endDate:'2026-05-21', status:'Planned', risk:'Medium' },
//   { id:'E4', tankId:'T-102', tankName:'T-102', site:'Rotterdam A', type:'UT Survey', week:25, startDate:'2026-06-15', endDate:'2026-06-18', status:'Planned', risk:'Medium' },
//   { id:'E5', tankId:'T-103', tankName:'T-103', site:'Rotterdam A', type:'MFL Scan', week:17, startDate:'2026-04-20', endDate:'2026-04-24', status:'In Progress', risk:'Medium' },
//   { id:'E6', tankId:'T-103', tankName:'T-103', site:'Rotterdam A', type:'Visual', week:20, startDate:'2026-05-11', endDate:'2026-05-14', status:'Planned', risk:'Medium' },
//   { id:'E7', tankId:'T-103', tankName:'T-103', site:'Rotterdam A', type:'Visual', week:31, startDate:'2026-07-27', endDate:'2026-07-30', status:'Planned', risk:'Medium' },
//   { id:'E8', tankId:'T-104', tankName:'T-104', site:'Rotterdam A', type:'Visual', week:18, startDate:'2026-04-27', endDate:'2026-04-30', status:'Planned', risk:'Medium' },
//   { id:'E9', tankId:'T-104', tankName:'T-104', site:'Rotterdam A', type:'Visual', week:24, startDate:'2026-06-08', endDate:'2026-06-11', status:'Planned', risk:'Medium' },
//   { id:'E10', tankId:'T-105', tankName:'T-105', site:'Rotterdam A', type:'Internal', week:17, startDate:'2026-04-20', endDate:'2026-04-26', status:'Overdue', risk:'High' },
//   { id:'E11', tankId:'T-105', tankName:'T-105', site:'Rotterdam A', type:'UT Survey', week:27, startDate:'2026-06-29', endDate:'2026-07-02', status:'Planned', risk:'High' },
//   { id:'E12', tankId:'T-106', tankName:'T-106', site:'Rotterdam A', type:'Visual', week:22, startDate:'2026-05-25', endDate:'2026-05-28', status:'Planned', risk:'Medium' },
//   { id:'E13', tankId:'T-106', tankName:'T-106', site:'Rotterdam A', type:'Visual', week:30, startDate:'2026-07-20', endDate:'2026-07-23', status:'Planned', risk:'Medium' },
//   { id:'E14', tankId:'T-107', tankName:'T-107', site:'Rotterdam A', type:'Visual', week:18, startDate:'2026-04-27', endDate:'2026-04-30', status:'Planned', risk:'Low' },
//   { id:'E15', tankId:'T-107', tankName:'T-107', site:'Rotterdam A', type:'UT Survey', week:23, startDate:'2026-06-01', endDate:'2026-06-04', status:'Planned', risk:'Low' },
//   { id:'E16', tankId:'T-107', tankName:'T-107', site:'Rotterdam A', type:'Visual', week:31, startDate:'2026-07-27', endDate:'2026-07-30', status:'Planned', risk:'Low' },
//   { id:'E17', tankId:'T-108', tankName:'T-108', site:'Rotterdam A', type:'Visual', week:25, startDate:'2026-06-15', endDate:'2026-06-18', status:'Planned', risk:'Medium' },
//   { id:'E18', tankId:'T-108', tankName:'T-108', site:'Rotterdam A', type:'MFL Scan', week:32, startDate:'2026-08-03', endDate:'2026-08-06', status:'Planned', risk:'Medium' },
// ];

// export const activityFeed: ActivityItem[] = [
//   { id:'A1', action:'UT survey uploaded', tankId:'T-105', user:'R. Patel', timeAgo:'2 hr ago', detail:'842 readings', icon:'upload' },
//   { id:'A2', action:'Assessment completed', tankId:'T-112', user:'System', timeAgo:'5 hr ago', detail:'Remaining life: 1.4 yr', icon:'check' },
//   { id:'A3', action:'MFL scan imported', tankId:'T-109', user:'System', timeAgo:'Yesterday', detail:'Flooring dataset', icon:'scan' },
//   { id:'A4', action:'WSE generated', tankId:'T-103', user:'R. Khan', timeAgo:'2 days ago', detail:'Signed by R. Khan', icon:'report' },
//   { id:'A5', action:'Visual inspection logged', tankId:'T-116', user:'J. Lilley', timeAgo:'3 days ago', detail:'12 photos · 3 findings', icon:'camera' },
// ];

// export const thicknessTrend = [
//   { year: 2008, thickness: 12.0 },
//   { year: 2011, thickness: 11.2 },
//   { year: 2014, thickness: 10.3 },
//   { year: 2017, thickness: 9.4 },
//   { year: 2020, thickness: 8.2 },
//   { year: 2023, thickness: 7.1 },
//   { year: 2026, thickness: 6.2 },
// ];

// export const heatmapSeverity = [
//   // [r_pct, angle_deg, severity, label]
//   [0.34, 0,   'High',   'D2'],
//   [0.80, 260, 'High',   'D1'],
//   [0.75, 160, 'High',   'D3'],
//   [0.38, 240, 'Medium', ''],
//   [0.60, 50,  'Medium', ''],
//   [0.50, 320, 'Medium', ''],
//   [0.85, 70,  'Medium', ''],
//   [0.25, 130, 'Low',    ''],
//   [0.70, 200, 'Low',    ''],
//   [0.90, 300, 'Low',    ''],
//   [0.45, 100, 'Low',    ''],
//   [0.60, 180, 'Low',    ''],
// ];
