import {
  DEFAULT_SHEET_TABS,
  MOCK_BILL_CSV_2567,
  MOCK_BILL_CSV_2568,
  MOCK_BILL_CSV_2569,
  MOCK_CSV_2568,
  MOCK_CSV_2569,
  MOCK_CSV_2570,
} from '../data/mockSheetCsv';
import {
  ActiveFetcherTier,
  AppSettings,
  FetcherTierMode,
  ParsedBillSheetData,
  ParsedSheetData,
  SheetTabInfo,
  ViewLayoutMode,
} from '../types/claims';
import {
  parseBillSheetRows,
  parseCsvToRows,
  parseSheetRows,
} from '../utils/csvParser';

export const DEFAULT_SPREADSHEET_ID =
  '1shG_tr85INBLD_Vvc56SG6BSQte6z4U56uWVTdOogy4';
export const DEFAULT_GID_2569 = '1291235853';

const SETTINGS_STORAGE_KEY = 'dialysis_dashboard_settings_v2';
const CACHE_STORAGE_PREFIX = 'dialysis_dashboard_cache_v2_';
const CACHE_BILL_PREFIX = 'dialysis_dashboard_bill_cache_v1_';
const TABS_CACHE_KEY = 'dialysis_dashboard_tabs_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  spreadsheetId: DEFAULT_SPREADSHEET_ID,
  sheetName: 'ฟอกไต 2569',
  billSheetName: 'Bill ฟอกไต 2569',
  pollingIntervalSec: 15,
  fetcherMode: FetcherTierMode.AUTO,
  publishedCsvUrl2569: '',
  publishedCsvUrl2568: '',
  appsScriptUrl: '',
  viewLayoutMode: ViewLayoutMode.AUTO,
  darkMode: false,
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCachedTabs(): SheetTabInfo[] {
  try {
    const raw = localStorage.getItem(TABS_CACHE_KEY);
    if (!raw) return DEFAULT_SHEET_TABS;
    const parsed = JSON.parse(raw) as SheetTabInfo[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_SHEET_TABS;
  } catch {
    return DEFAULT_SHEET_TABS;
  }
}

export function saveCachedTabs(tabs: SheetTabInfo[]): void {
  try {
    localStorage.setItem(TABS_CACHE_KEY, JSON.stringify(tabs));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Convert raw sheet tab name + optional gid into structured SheetTabInfo
 */
export function buildSheetTabInfo(name: string, gid?: string): SheetTabInfo {
  const trimmed = name.trim();
  const isBill = /^bill/i.test(trimmed) || trimmed.toLowerCase().includes('bill');
  const yearMatch = trimmed.match(/(\d{4})/);
  const fiscalYearBE = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  const shortLabel = isBill
    ? fiscalYearBE > 0
      ? `Bill ${fiscalYearBE}`
      : trimmed
    : fiscalYearBE > 0
    ? `ปีงบ ${fiscalYearBE}`
    : trimmed;

  return {
    name: trimmed,
    gid,
    kind: isBill ? 'BILL' : 'CLAIMS',
    fiscalYearBE,
    shortLabel,
  };
}

/**
 * Auto-discover all worksheet tabs in the Google Spreadsheet in real-time
 * When a user adds a new worksheet (e.g., "ฟอกไต 2570", "ฟอกไต 2571", "Bill ฟอกไต 2570"),
 * it is automatically detected from /htmlview or Apps Script and added to the UI!
 */
export async function discoverSpreadsheetTabs(
  spreadsheetId: string,
  appsScriptUrl?: string
): Promise<SheetTabInfo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const htmlUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview?_cb=${Date.now()}`;
    const res = await fetch(htmlUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (res.ok) {
      const html = await res.text();
      const itemRegex =
        /items\.push\(\{name:\s*"([^"]+)",\s*pageUrl:\s*"[^"]*",\s*gid:\s*"([^"]+)"/g;
      const discovered: SheetTabInfo[] = [];
      const seenNames = new Set<string>();

      let match: RegExpExecArray | null;
      while ((match = itemRegex.exec(html)) !== null) {
        const rawName = match[1];
        const rawGid = match[2];
        if (rawName && !seenNames.has(rawName)) {
          seenNames.add(rawName);
          discovered.push(buildSheetTabInfo(rawName, rawGid));
        }
      }

      if (discovered.length > 0) {
        saveCachedTabs(discovered);
        return discovered;
      }
    }
  } catch {
    // Fallback to Apps Script or cached tabs below
  } finally {
    clearTimeout(timeout);
  }

  // Optional fallback via Apps Script availableSheets
  if (appsScriptUrl && appsScriptUrl.trim()) {
    try {
      const sep = appsScriptUrl.includes('?') ? '&' : '?';
      const res = await fetch(
        `${appsScriptUrl.trim()}${sep}id=${encodeURIComponent(
          spreadsheetId
        )}&_cb=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.availableSheets) && json.availableSheets.length > 0) {
          const tabs = json.availableSheets.map((n: string) =>
            buildSheetTabInfo(String(n))
          );
          saveCachedTabs(tabs);
          return tabs;
        }
      }
    } catch {
      // Ignore
    }
  }

  return loadCachedTabs();
}

export function saveCachedSheetData(
  sheetName: string,
  data: ParsedSheetData
): void {
  try {
    localStorage.setItem(
      `${CACHE_STORAGE_PREFIX}${sheetName}`,
      JSON.stringify(data)
    );
  } catch {
    // Ignore
  }
}

export function loadCachedSheetData(sheetName: string): ParsedSheetData | null {
  try {
    const raw = localStorage.getItem(`${CACHE_STORAGE_PREFIX}${sheetName}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParsedSheetData;
    return {
      ...parsed,
      activeTier: ActiveFetcherTier.CACHE,
    };
  } catch {
    return null;
  }
}

export function saveCachedBillData(
  sheetName: string,
  data: ParsedBillSheetData
): void {
  try {
    localStorage.setItem(
      `${CACHE_BILL_PREFIX}${sheetName}`,
      JSON.stringify(data)
    );
  } catch {
    // Ignore
  }
}

export function loadCachedBillData(
  sheetName: string
): ParsedBillSheetData | null {
  try {
    const raw = localStorage.getItem(`${CACHE_BILL_PREFIX}${sheetName}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParsedBillSheetData;
    return {
      ...parsed,
      activeTier: ActiveFetcherTier.CACHE,
    };
  } catch {
    return null;
  }
}

/**
 * Build Tier 1 (Google Visualization CSV endpoint) URL with headers=1 and cache-busting
 * Note: headers=1 is critical so newly added tabs with blank numeric cells (like ฟอกไต 2570)
 * do not have their first 12 rows collapsed into the header row!
 */
export function buildTier1GvizUrl(
  spreadsheetId: string,
  sheetName: string,
  gid?: string
): string {
  const encodedSheet = encodeURIComponent(sheetName.trim());
  const cb = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  if (gid !== undefined && gid !== '') {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&headers=1&gid=${encodeURIComponent(
      gid
    )}&sheet=${encodedSheet}&_cb=${cb}`;
  }
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodedSheet}&_cb=${cb}`;
}

/**
 * Fetch Raw CSV Rows from Tier 1 (gviz)
 */
async function fetchRowsFromTier1Gviz(
  spreadsheetId: string,
  sheetName: string,
  gid?: string
): Promise<string[][]> {
  const url = buildTier1GvizUrl(spreadsheetId, sheetName, gid);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} (${res.statusText})`);
    }

    const text = await res.text();
    if (
      !text ||
      text.trim().startsWith('<!DOCTYPE html') ||
      text.trim().startsWith('<html')
    ) {
      throw new Error(
        'ได้รับหน้า HTML แทนไฟล์ CSV (ไฟล์ Google Sheet อาจไม่ได้ตั้งค่าแชร์เป็น "ทุกคนที่มีลิงก์")'
      );
    }

    return parseCsvToRows(text);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch Tier 1: Google Visualization Endpoint (CSV) for Claims
 */
async function fetchFromTier1Gviz(
  spreadsheetId: string,
  sheetName: string,
  gid?: string
): Promise<ParsedSheetData> {
  const rows = await fetchRowsFromTier1Gviz(spreadsheetId, sheetName, gid);
  return parseSheetRows(rows, {
    spreadsheetId,
    sheetName,
    activeTier: ActiveFetcherTier.TIER_1,
  });
}

/**
 * Fetch Tier 2: Published to Web CSV URL
 */
async function fetchFromTier2PublishedCsv(
  publishedUrl: string,
  spreadsheetId: string,
  sheetName: string
): Promise<ParsedSheetData> {
  if (!publishedUrl || !publishedUrl.trim()) {
    throw new Error('ยังไม่ได้ตั้งค่าลิงก์ Published CSV (ระดับ 2) ในหน้าตั้งค่า');
  }

  const cleanUrl = publishedUrl.trim();
  const sep = cleanUrl.includes('?') ? '&' : '?';
  const urlWithCb = `${cleanUrl}${sep}_cb=${Date.now()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(urlWithCb, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} จากลิงก์ Published CSV`);
    }

    const text = await res.text();
    if (!text || text.trim().startsWith('<!DOCTYPE html')) {
      throw new Error('ลิงก์ Published CSV ไม่ถูกต้อง หรือไม่ได้เลือกเป็นรูปแบบ .csv');
    }

    const rows = parseCsvToRows(text);
    return parseSheetRows(rows, {
      spreadsheetId,
      sheetName,
      activeTier: ActiveFetcherTier.TIER_2,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch Raw 2D Rows from Tier 3: Google Apps Script Web App JSON
 */
async function fetchRowsFromTier3AppsScript(
  appsScriptUrl: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    throw new Error('ยังไม่ได้ตั้งค่า URL ของ Google Apps Script (ระดับ 3) ในหน้าตั้งค่า');
  }

  const cleanUrl = appsScriptUrl.trim();
  const sep = cleanUrl.includes('?') ? '&' : '?';
  const url = `${cleanUrl}${sep}id=${encodeURIComponent(
    spreadsheetId
  )}&sheet=${encodeURIComponent(sheetName)}&_cb=${Date.now()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} จาก Google Apps Script`);
    }

    const json = await res.json();
    if (json.status === 'error' || !Array.isArray(json.rows)) {
      throw new Error(json.message || 'ข้อมูล JSON จาก Apps Script ไม่ถูกต้อง');
    }

    return json.rows.map((r: unknown[]) =>
      Array.isArray(r)
        ? r.map((c) => (c === null || c === undefined ? '' : String(c)))
        : []
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromTier3AppsScript(
  appsScriptUrl: string,
  spreadsheetId: string,
  sheetName: string
): Promise<ParsedSheetData> {
  const rows = await fetchRowsFromTier3AppsScript(
    appsScriptUrl,
    spreadsheetId,
    sheetName
  );
  return parseSheetRows(rows, {
    spreadsheetId,
    sheetName,
    activeTier: ActiveFetcherTier.TIER_3,
  });
}

/**
 * Load Mock Data for Claims Sheet
 */
export function loadMockSheetData(
  spreadsheetId: string,
  sheetName: string
): ParsedSheetData {
  const csv = sheetName.includes('2570')
    ? MOCK_CSV_2570
    : sheetName.includes('2568')
    ? MOCK_CSV_2568
    : MOCK_CSV_2569;
  const rows = parseCsvToRows(csv);
  return parseSheetRows(rows, {
    spreadsheetId,
    sheetName,
    activeTier: ActiveFetcherTier.MOCK,
  });
}

/**
 * Load Mock Data for Bill Sheet
 */
export function loadMockBillData(
  spreadsheetId: string,
  sheetName: string
): ParsedBillSheetData {
  const csv = sheetName.includes('2567')
    ? MOCK_BILL_CSV_2567
    : sheetName.includes('2568')
    ? MOCK_BILL_CSV_2568
    : MOCK_BILL_CSV_2569;
  const rows = parseCsvToRows(csv);
  return parseBillSheetRows(rows, {
    spreadsheetId,
    sheetName,
    activeTier: ActiveFetcherTier.MOCK,
  });
}

export interface FetchOutcome {
  data: ParsedSheetData;
  tierUsed: ActiveFetcherTier;
  fallbackNotice: string | null;
  tierErrors: { tier: string; message: string }[];
  isOfflineFallback: boolean;
}

/**
 * Execute the 3-tier fallback chain for Dialysis Claims sheets (ฟอกไต 2570, 2569, 2568...)
 */
export async function fetchSheetWithFallback(
  settings: AppSettings,
  gid?: string
): Promise<FetchOutcome> {
  const { spreadsheetId, sheetName, fetcherMode } = settings;
  const publishedCsvUrl = sheetName.includes('2568')
    ? settings.publishedCsvUrl2568
    : settings.publishedCsvUrl2569;

  const tierErrors: { tier: string; message: string }[] = [];

  if (fetcherMode === FetcherTierMode.MOCK) {
    const mockData = loadMockSheetData(spreadsheetId, sheetName);
    return {
      data: mockData,
      tierUsed: ActiveFetcherTier.MOCK,
      fallbackNotice: 'กำลังแสดงผลในโหมดข้อมูลจำลอง (Mock Data) ตามการตั้งค่า',
      tierErrors: [],
      isOfflineFallback: false,
    };
  }

  if (fetcherMode === FetcherTierMode.TIER_1_GVIZ) {
    const data = await fetchFromTier1Gviz(spreadsheetId, sheetName, gid);
    saveCachedSheetData(sheetName, data);
    return {
      data,
      tierUsed: ActiveFetcherTier.TIER_1,
      fallbackNotice: null,
      tierErrors: [],
      isOfflineFallback: false,
    };
  }

  if (fetcherMode === FetcherTierMode.TIER_2_PUBLISHED_CSV) {
    const data = await fetchFromTier2PublishedCsv(
      publishedCsvUrl,
      spreadsheetId,
      sheetName
    );
    saveCachedSheetData(sheetName, data);
    return {
      data,
      tierUsed: ActiveFetcherTier.TIER_2,
      fallbackNotice:
        'กำลังใช้ลิงก์เผยแพร่ไปยังเว็บ (ระดับ 2) ข้อมูลอาจมีความล่าช้ากว่า Sheet จริงประมาณ 5 นาที',
      tierErrors: [],
      isOfflineFallback: false,
    };
  }

  if (fetcherMode === FetcherTierMode.TIER_3_APPS_SCRIPT) {
    const data = await fetchFromTier3AppsScript(
      settings.appsScriptUrl,
      spreadsheetId,
      sheetName
    );
    saveCachedSheetData(sheetName, data);
    return {
      data,
      tierUsed: ActiveFetcherTier.TIER_3,
      fallbackNotice: null,
      tierErrors: [],
      isOfflineFallback: false,
    };
  }

  // AUTO Mode: Try Tier 1 -> Tier 2 -> Tier 3 -> Cache -> Mock
  try {
    const data = await fetchFromTier1Gviz(spreadsheetId, sheetName, gid);
    saveCachedSheetData(sheetName, data);
    return {
      data,
      tierUsed: ActiveFetcherTier.TIER_1,
      fallbackNotice: null,
      tierErrors: [],
      isOfflineFallback: false,
    };
  } catch (err1) {
    tierErrors.push({
      tier: 'ระดับ 1 (gviz CSV)',
      message: err1 instanceof Error ? err1.message : String(err1),
    });
  }

  if (publishedCsvUrl && publishedCsvUrl.trim()) {
    try {
      const data = await fetchFromTier2PublishedCsv(
        publishedCsvUrl,
        spreadsheetId,
        sheetName
      );
      saveCachedSheetData(sheetName, data);
      return {
        data,
        tierUsed: ActiveFetcherTier.TIER_2,
        fallbackNotice:
          'ระดับ 1 ไม่ตอบสนอง ระบบสลับไปใช้ระดับ 2 (Published CSV) อัตโนมัติ ข้อมูลอาจช้ากว่าจริงราว 5 นาที',
        tierErrors,
        isOfflineFallback: false,
      };
    } catch (err2) {
      tierErrors.push({
        tier: 'ระดับ 2 (Published CSV)',
        message: err2 instanceof Error ? err2.message : String(err2),
      });
    }
  }

  if (settings.appsScriptUrl && settings.appsScriptUrl.trim()) {
    try {
      const data = await fetchFromTier3AppsScript(
        settings.appsScriptUrl,
        spreadsheetId,
        sheetName
      );
      saveCachedSheetData(sheetName, data);
      return {
        data,
        tierUsed: ActiveFetcherTier.TIER_3,
        fallbackNotice:
          'ระบบสลับไปใช้ตัวดึงข้อมูลระดับ 3 (Google Apps Script) อัตโนมัติ',
        tierErrors,
        isOfflineFallback: false,
      };
    } catch (err3) {
      tierErrors.push({
        tier: 'ระดับ 3 (Apps Script)',
        message: err3 instanceof Error ? err3.message : String(err3),
      });
    }
  }

  const cached = loadCachedSheetData(sheetName);
  if (cached) {
    return {
      data: cached,
      tierUsed: ActiveFetcherTier.CACHE,
      fallbackNotice:
        'ไม่สามารถเชื่อมต่อ Google Sheet ได้ในขณะนี้ ระบบกำลังแสดงข้อมูลล่าสุดที่บันทึกไว้ในเครื่อง (แคชออฟไลน์)',
      tierErrors,
      isOfflineFallback: true,
    };
  }

  const mock = loadMockSheetData(spreadsheetId, sheetName);
  return {
    data: mock,
    tierUsed: ActiveFetcherTier.MOCK,
    fallbackNotice:
      'เชื่อมต่อเครือข่ายไม่สำเร็จและไม่มีแคชในเครื่อง ระบบแสดงข้อมูลจำลอง (Mock Data) เพื่อให้ตรวจสอบการทำงานได้ทันที',
    tierErrors,
    isOfflineFallback: true,
  };
}

/**
 * Fetch and parse "Bill ฟอกไต ..." sheets with fallback chain
 */
export async function fetchBillSheetWithFallback(
  settings: AppSettings,
  billSheetName: string,
  gid?: string
): Promise<ParsedBillSheetData> {
  const { spreadsheetId, fetcherMode } = settings;

  if (fetcherMode === FetcherTierMode.MOCK) {
    return loadMockBillData(spreadsheetId, billSheetName);
  }

  // Try Tier 1 (gviz CSV)
  try {
    const rows = await fetchRowsFromTier1Gviz(
      spreadsheetId,
      billSheetName,
      gid
    );
    const parsed = parseBillSheetRows(rows, {
      spreadsheetId,
      sheetName: billSheetName,
      activeTier: ActiveFetcherTier.TIER_1,
    });
    if (parsed.isStructureValid) {
      saveCachedBillData(billSheetName, parsed);
      return parsed;
    }
  } catch {
    // Fallback below
  }

  // Try Tier 3 (Apps Script) if configured
  if (settings.appsScriptUrl && settings.appsScriptUrl.trim()) {
    try {
      const rows = await fetchRowsFromTier3AppsScript(
        settings.appsScriptUrl,
        spreadsheetId,
        billSheetName
      );
      const parsed = parseBillSheetRows(rows, {
        spreadsheetId,
        sheetName: billSheetName,
        activeTier: ActiveFetcherTier.TIER_3,
      });
      if (parsed.isStructureValid) {
        saveCachedBillData(billSheetName, parsed);
        return parsed;
      }
    } catch {
      // Fallback below
    }
  }

  // Try Cache
  const cached = loadCachedBillData(billSheetName);
  if (cached) return cached;

  // Fallback to Mock
  return loadMockBillData(spreadsheetId, billSheetName);
}

export interface ConnectionTestResult {
  success: boolean;
  tierLabel: string;
  latencyMs: number;
  periodsCount: number;
  monthsCount: number;
  grandTotal: number;
  message: string;
}

export async function testConnectionForSettings(
  settings: AppSettings,
  targetTier: 'TIER_1' | 'TIER_2' | 'TIER_3'
): Promise<ConnectionTestResult> {
  const start = performance.now();
  const { spreadsheetId, sheetName } = settings;
  const publishedUrl = sheetName.includes('2568')
    ? settings.publishedCsvUrl2568
    : settings.publishedCsvUrl2569;

  try {
    let data: ParsedSheetData;
    let tierLabel = '';

    if (targetTier === 'TIER_1') {
      tierLabel = 'ระดับ 1 (Google Visualization CSV)';
      data = await fetchFromTier1Gviz(spreadsheetId, sheetName);
    } else if (targetTier === 'TIER_2') {
      tierLabel = 'ระดับ 2 (Published to Web CSV)';
      data = await fetchFromTier2PublishedCsv(
        publishedUrl,
        spreadsheetId,
        sheetName
      );
    } else {
      tierLabel = 'ระดับ 3 (Google Apps Script JSON)';
      data = await fetchFromTier3AppsScript(
        settings.appsScriptUrl,
        spreadsheetId,
        sheetName
      );
    }

    const latencyMs = Math.round(performance.now() - start);
    if (!data.qualityReport.isStructureValid) {
      return {
        success: false,
        tierLabel,
        latencyMs,
        periodsCount: 0,
        monthsCount: 0,
        grandTotal: 0,
        message:
          data.qualityReport.structureErrorMessage ||
          'โครงสร้างตารางไม่ตรงตามกำหนด',
      };
    }

    return {
      success: true,
      tierLabel,
      latencyMs,
      periodsCount: data.periods.length,
      monthsCount: data.months.length,
      grandTotal: data.calculatedTotals.grandTotal,
      message: `เชื่อมต่อสำเร็จใน ${latencyMs} ms — พบข้อมูล ${data.periods.length} งวด (${data.months.length} เดือน)`,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      tierLabel:
        targetTier === 'TIER_1'
          ? 'ระดับ 1 (gviz CSV)'
          : targetTier === 'TIER_2'
          ? 'ระดับ 2 (Published CSV)'
          : 'ระดับ 3 (Apps Script)',
      latencyMs,
      periodsCount: 0,
      monthsCount: 0,
      grandTotal: 0,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getTierBadgeLabel(tier: ActiveFetcherTier): string {
  switch (tier) {
    case ActiveFetcherTier.TIER_1:
      return 'ระดับ 1 · gviz CSV';
    case ActiveFetcherTier.TIER_2:
      return 'ระดับ 2 · Published CSV';
    case ActiveFetcherTier.TIER_3:
      return 'ระดับ 3 · Apps Script';
    case ActiveFetcherTier.CACHE:
      return 'แคชออฟไลน์';
    case ActiveFetcherTier.MOCK:
      return 'ข้อมูลจำลอง';
  }
}
