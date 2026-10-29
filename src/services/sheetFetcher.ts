import { MOCK_CSV_2568, MOCK_CSV_2569 } from '../data/mockSheetCsv';
import {
  ActiveFetcherTier,
  AppSettings,
  FetcherTierMode,
  ParsedSheetData,
  ViewLayoutMode,
} from '../types/claims';
import { parseCsvToRows, parseSheetRows } from '../utils/csvParser';

export const DEFAULT_SPREADSHEET_ID = '1shG_tr85INBLD_Vvc56SG6BSQte6z4U56uWVTdOogy4';
export const DEFAULT_GID_2569 = '1291235853';

const SETTINGS_STORAGE_KEY = 'dialysis_dashboard_settings_v1';
const CACHE_STORAGE_PREFIX = 'dialysis_dashboard_cache_v1_';

export const DEFAULT_SETTINGS: AppSettings = {
  spreadsheetId: DEFAULT_SPREADSHEET_ID,
  sheetName: 'ฟอกไต 2569',
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

export function saveCachedSheetData(sheetName: string, data: ParsedSheetData): void {
  try {
    localStorage.setItem(
      `${CACHE_STORAGE_PREFIX}${sheetName}`,
      JSON.stringify(data)
    );
  } catch {
    // Ignore storage quota errors
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

/**
 * Build Tier 1 (Google Visualization CSV endpoint) URL with cache-busting
 */
export function buildTier1GvizUrl(spreadsheetId: string, sheetName: string): string {
  const encodedSheet = encodeURIComponent(sheetName.trim());
  const cb = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  // Use sheet={encodedSheet} as specified, and include gid for default tab compatibility
  if (sheetName.trim() === 'ฟอกไต 2569') {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${DEFAULT_GID_2569}&sheet=${encodedSheet}&_cb=${cb}`;
  }
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}&_cb=${cb}`;
}

/**
 * Fetch Tier 1: Google Visualization Endpoint (CSV)
 */
async function fetchFromTier1Gviz(
  spreadsheetId: string,
  sheetName: string
): Promise<ParsedSheetData> {
  const url = buildTier1GvizUrl(spreadsheetId, sheetName);
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

    const rows = parseCsvToRows(text);
    const parsed = parseSheetRows(rows, {
      spreadsheetId,
      sheetName,
      activeTier: ActiveFetcherTier.TIER_1,
    });

    return parsed;
  } finally {
    clearTimeout(timeout);
  }
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
 * Fetch Tier 3: Google Apps Script Web App JSON
 */
async function fetchFromTier3AppsScript(
  appsScriptUrl: string,
  spreadsheetId: string,
  sheetName: string
): Promise<ParsedSheetData> {
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

    const rows: string[][] = json.rows.map((r: unknown[]) =>
      Array.isArray(r) ? r.map((c) => (c === null || c === undefined ? '' : String(c))) : []
    );

    return parseSheetRows(rows, {
      spreadsheetId,
      sheetName,
      activeTier: ActiveFetcherTier.TIER_3,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Load Mock Data for testing or ultimate fallback
 */
export function loadMockSheetData(
  spreadsheetId: string,
  sheetName: string
): ParsedSheetData {
  const csv = sheetName.includes('2568') ? MOCK_CSV_2568 : MOCK_CSV_2569;
  const rows = parseCsvToRows(csv);
  return parseSheetRows(rows, {
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
 * Execute the 3-tier fallback chain (or forced tier from settings)
 */
export async function fetchSheetWithFallback(
  settings: AppSettings
): Promise<FetchOutcome> {
  const { spreadsheetId, sheetName, fetcherMode } = settings;
  const publishedCsvUrl = sheetName.includes('2568')
    ? settings.publishedCsvUrl2568
    : settings.publishedCsvUrl2569;

  const tierErrors: { tier: string; message: string }[] = [];

  // Forced Mock Mode
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

  // Forced Tier 1
  if (fetcherMode === FetcherTierMode.TIER_1_GVIZ) {
    const data = await fetchFromTier1Gviz(spreadsheetId, sheetName);
    saveCachedSheetData(sheetName, data);
    return {
      data,
      tierUsed: ActiveFetcherTier.TIER_1,
      fallbackNotice: null,
      tierErrors: [],
      isOfflineFallback: false,
    };
  }

  // Forced Tier 2
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

  // Forced Tier 3
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
    const data = await fetchFromTier1Gviz(spreadsheetId, sheetName);
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
  } else {
    tierErrors.push({
      tier: 'ระดับ 2 (Published CSV)',
      message: 'ไม่ได้กำหนด URL ของ Published CSV ไว้ในหน้าตั้งค่า',
    });
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
  } else {
    tierErrors.push({
      tier: 'ระดับ 3 (Apps Script)',
      message: 'ไม่ได้กำหนด URL ของ Google Apps Script ไว้ในหน้าตั้งค่า',
    });
  }

  // If all 3 tiers failed, try cached data in localStorage first
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

  // Ultimate fallback: Built-in realistic snapshot so UI remains functional
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
      data = await fetchFromTier2PublishedCsv(publishedUrl, spreadsheetId, sheetName);
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
        message: data.qualityReport.structureErrorMessage || 'โครงสร้างตารางไม่ตรงตามกำหนด',
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
