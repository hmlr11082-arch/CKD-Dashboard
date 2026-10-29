export type ClaimScheme = 'UC' | 'COCD' | 'SOCD';

export enum FetcherTierMode {
  AUTO = 'AUTO',
  TIER_1_GVIZ = 'TIER_1_GVIZ',
  TIER_2_PUBLISHED_CSV = 'TIER_2_PUBLISHED_CSV',
  TIER_3_APPS_SCRIPT = 'TIER_3_APPS_SCRIPT',
  MOCK = 'MOCK',
}

export enum ActiveFetcherTier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
  MOCK = 4,
  CACHE = 5,
}

export enum ViewLayoutMode {
  AUTO = 'AUTO',
  MOBILE = 'MOBILE',
  DESKTOP = 'DESKTOP',
}

export enum MobileNavTab {
  OVERVIEW = 'OVERVIEW',
  BILL = 'BILL',
  CHARTS = 'CHARTS',
  TABLE = 'TABLE',
  SETTINGS = 'SETTINGS',
}

export interface SheetTabInfo {
  name: string; // e.g. "ฟอกไต 2570", "ฟอกไต 2569", "Bill ฟอกไต 2569"
  gid?: string; // e.g. "904899055"
  kind: 'CLAIMS' | 'BILL';
  fiscalYearBE: number; // e.g. 2570, 2569, 2568, 2567
  shortLabel: string; // e.g. "ปีงบ 2570" or "Bill 2569"
}

export interface PeriodRecord {
  id: string; // e.g., "20251001"
  rowNumber: number;
  fiscalOrderIndex: number; // 0..23 sorted by Oct -> Sep, period 01 -> 02
  yearAD: number; // e.g. 2025
  yearBE: number; // e.g. 2568
  monthNum: number; // 1..12
  monthNameThai: string; // e.g. "ตุลาคม"
  monthShortThai: string; // e.g. "ต.ค."
  periodNo: number; // 1 or 2
  periodLabelThai: string; // e.g. "ต.ค. 68 (งวด 1)"
  cocdCode: string; // e.g. "COCD20251001"
  cocdPatients: number | null;
  cocdAmount: number | null;
  cocdAvgPerPatient: number | null;
  socdCode: string; // e.g. "SOCD20251001"
  socdPatients: number | null;
  socdAmount: number | null;
  socdAvgPerPatient: number | null;
  sheetTotalAmount: number | null; // Col G
  calculatedTotalAmount: number; // cocdAmount + socdAmount
  totalPatients: number; // (cocdPatients || 0) + (socdPatients || 0)
  combinedAvgPerPatient: number | null;
  isDuplicateSchemeValues: boolean; // True when SOCD patients == COCD patients AND SOCD amount == COCD amount (e.g., 20260201)
  isCocdOutlier: boolean; // True if cocdAvgPerPatient deviates > ±25% from mean
  isSocdOutlier: boolean; // True if socdAvgPerPatient deviates > ±25% from mean
  cocdDeviationPct: number | null;
  socdDeviationPct: number | null;
  hasRowSumMismatch: boolean; // True if Col G != Col C + Col F
}

export interface MonthlyRecord {
  id: string; // e.g. "month-10"
  rowNumber: number;
  fiscalMonthIndex: number; // 0 (ตุลาคม) .. 11 (กันยายน)
  monthNum: number; // 10, 11, 12, 1..9
  monthNameThai: string; // "ตุลาคม"
  monthShortThai: string; // "ต.ค."
  socdAmount: number | null; // Col J
  cocdAmount: number | null; // Col K
  ucAmount: number | null; // Col L (null when empty in sheet, e.g., ส.ค., ก.ย.)
  sheetTotalAmount: number | null; // Col M
  calculatedTotalAmount: number; // sum of non-null schemes
  isUcMissing: boolean; // True if UC cell was blank
  isIncomplete: boolean; // True if any scheme (like UC) is null while others have data
  hasMonthlySumMismatch: boolean; // True if sheetTotalAmount != calculatedTotalAmount
  period1And2CocdSum: number; // Sum from Table 1 for this month
  period1And2SocdSum: number; // Sum from Table 1 for this month
  cocdCrossTableDiff: number; // Difference between Table 1 sum and Table 2 Col K
  socdCrossTableDiff: number; // Difference between Table 1 sum and Table 2 Col J
}

export interface SheetSummaryRow {
  socdTotal: number | null;
  cocdTotal: number | null;
  ucTotal: number | null;
  grandTotal: number | null;
}

export interface DataQualityIssue {
  id: string;
  category: 'CROSS_TABLE' | 'GRAND_TOTAL' | 'ANOMALY_DUPLICATE' | 'ANOMALY_OUTLIER' | 'INCOMPLETE_DATA';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  periodOrMonth: string;
  expectedValue?: string;
  actualValue?: string;
}

export interface DataQualityReport {
  isStructureValid: boolean;
  structureErrorMessage: string | null;
  crossTablePassed: boolean;
  grandTotalPassed: boolean;
  calculatedGrandTotal: number;
  sheetGrandTotal: number | null;
  grandTotalDiff: number;
  meanCocdPerPatient: number;
  meanSocdPerPatient: number;
  incompleteMonths: string[];
  issues: DataQualityIssue[];
}

export interface ParsedSheetData {
  spreadsheetId: string;
  sheetName: string;
  fiscalYearLabel: string; // e.g. "ปีงบประมาณ 2569 (ต.ค. 68 – ก.ย. 69)"
  hasUcColumn: boolean;
  periods: PeriodRecord[];
  months: MonthlyRecord[];
  sheetSummaryRow: SheetSummaryRow | null;
  calculatedTotals: {
    socd: number;
    cocd: number;
    uc: number;
    grandTotal: number;
    totalCocdPatients: number;
    totalSocdPatients: number;
    totalPatients: number;
  };
  qualityReport: DataQualityReport;
  dataHash: string;
  fetchedAt: string; // ISO string
  activeTier: ActiveFetcherTier;
}

/**
 * Bill ฟอกไต (CORTBIL / EDC) Record & Parsed Sheet Data
 */
export interface BillRecord {
  id: string;
  rowNumber: number;
  seqNo: number | null; // ลำดับ (Col A)
  dateRaw: string; // ว/ด/ป (Col B, e.g. "01/10/2568")
  monthKey: string; // e.g. "2568-10" or "ไม่ระบุเดือน"
  monthLabelThai: string; // e.g. "ต.ค. 68"
  billCode: string; // งวด (Col C, e.g. "11085_CORTBIL_2641")
  ofcSent: number | null; // OFC ส่ง (Col D)
  ofcPassed: number | null; // OFC ผ่าน (Col E)
  ofcFailed: number | null; // OFC ไม่ผ่าน (Col F)
  sssSent: number | null; // SSS ส่ง (Col G)
  sssPassed: number | null; // SSS ผ่าน (Col H)
  sssFailed: number | null; // SSS ไม่ผ่าน (Col I)
  sheetTotal: number | null; // รวม (Col J)
  calculatedSentTotal: number; // (ofcSent || 0) + (sssSent || 0)
  calculatedPassedTotal: number; // (ofcPassed || 0) + (sssPassed || 0)
  calculatedFailedTotal: number; // (ofcFailed || 0) + (sssFailed || 0)
  remark: string; // หมายเหตุ (Col K, e.g. "A0 : approval code ว่าง")
  isSubmitted: boolean; // True if ofcSent !== null || sssSent !== null || dateRaw !== ''
  hasFailedItems: boolean; // True if calculatedFailedTotal > 0 || remark !== ''
}

export interface BillMonthlySummary {
  monthKey: string;
  monthLabelThai: string;
  batchesCount: number;
  ofcSent: number;
  ofcPassed: number;
  ofcFailed: number;
  sssSent: number;
  sssPassed: number;
  sssFailed: number;
  totalSent: number;
  totalPassed: number;
  totalFailed: number;
}

export interface BillRemarkSummary {
  code: string; // e.g. "A0", "A4", "A1", "A3", "34", "C"
  fullText: string;
  count: number;
}

export interface ParsedBillSheetData {
  spreadsheetId: string;
  sheetName: string; // e.g. "Bill ฟอกไต 2569"
  fiscalYearLabel: string;
  isStructureValid: boolean;
  structureErrorMessage: string | null;
  records: BillRecord[];
  submittedRecords: BillRecord[];
  monthlySummaries: BillMonthlySummary[];
  remarkSummaries: BillRemarkSummary[];
  totals: {
    submittedBatchesCount: number;
    pendingBatchesCount: number;
    ofcSent: number;
    ofcPassed: number;
    ofcFailed: number;
    sssSent: number;
    sssPassed: number;
    sssFailed: number;
    totalSent: number;
    totalPassed: number;
    totalFailed: number;
    overallPassRatePct: number;
    ofcPassRatePct: number;
    sssPassRatePct: number;
  };
  dataHash: string;
  fetchedAt: string;
  activeTier: ActiveFetcherTier;
}

export interface AppSettings {
  spreadsheetId: string;
  sheetName: string; // Active Claims tab e.g. "ฟอกไต 2569"
  billSheetName: string; // Active Bill tab e.g. "Bill ฟอกไต 2569"
  pollingIntervalSec: 10 | 15 | 30 | 60;
  fetcherMode: FetcherTierMode;
  publishedCsvUrl2569: string;
  publishedCsvUrl2568: string;
  appsScriptUrl: string;
  viewLayoutMode: ViewLayoutMode;
  darkMode: boolean;
}

export interface FilterState {
  schemes: ClaimScheme[]; // Selected schemes: ['UC', 'COCD', 'SOCD']
  startFiscalMonthIndex: number; // 0 (ต.ค.) .. 11 (ก.ย.)
  endFiscalMonthIndex: number; // 0 (ต.ค.) .. 11 (ก.ย.)
  onlyShowAnomaliesOrIncomplete: boolean;
}
