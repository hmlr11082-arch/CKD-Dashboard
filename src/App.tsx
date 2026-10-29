import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  LayoutDashboard,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { AboutSystemModal } from './components/AboutSystemModal';
import { BillDashboardView } from './components/BillDashboardView';
import { ChartsSection } from './components/ChartsSection';
import { ClaimsTable } from './components/ClaimsTable';
import { DataQualityModal } from './components/DataQualityModal';
import {
  DesktopSidebar,
  MobileFilterBottomSheet,
} from './components/FilterControls';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { SettingsView } from './components/SettingsView';
import {
  DEFAULT_SETTINGS,
  discoverSpreadsheetTabs,
  fetchBillSheetWithFallback,
  fetchSheetWithFallback,
  loadAppSettings,
  loadCachedTabs,
  saveAppSettings,
} from './services/sheetFetcher';
import {
  ActiveFetcherTier,
  AppSettings,
  ClaimScheme,
  FilterState,
  MobileNavTab,
  ParsedBillSheetData,
  ParsedSheetData,
  SheetTabInfo,
  ViewLayoutMode,
} from './types/claims';
import { FISCAL_MONTHS } from './utils/csvParser';

const DEFAULT_FILTERS: FilterState = {
  schemes: ['UC', 'COCD', 'SOCD'],
  startFiscalMonthIndex: 0,
  endFiscalMonthIndex: 11,
  onlyShowAnomaliesOrIncomplete: false,
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadAppSettings()
  );
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<MobileNavTab>(
    MobileNavTab.OVERVIEW
  );

  // Dynamically Discovered Worksheet Tabs
  const [allTabs, setAllTabs] = useState<SheetTabInfo[]>(() =>
    loadCachedTabs()
  );
  const [isDiscoveringTabs, setIsDiscoveringTabs] = useState<boolean>(false);

  const claimsTabs = useMemo(
    () => allTabs.filter((t) => t.kind === 'CLAIMS'),
    [allTabs]
  );
  const billTabs = useMemo(
    () => allTabs.filter((t) => t.kind === 'BILL'),
    [allTabs]
  );

  // Sheet Data & Telemetry State
  const [sheetData, setSheetData] = useState<ParsedSheetData | null>(null);
  const [billData, setBillData] = useState<ParsedBillSheetData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isBillLoading, setIsBillLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastUpdatedTimeStr, setLastUpdatedTimeStr] =
    useState<string>('--:--:--');
  const [flashKey, setFlashKey] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [isQualityModalOpen, setIsQualityModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Responsive viewport detection for AUTO layout mode
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Pull-to-refresh state on mobile
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState<number>(0);

  // Refs for polling & hash comparison
  const prevHashRef = useRef<string | null>(null);
  const prevBillHashRef = useRef<string | null>(null);
  const prevSheetNameRef = useRef<string>(settings.sheetName);
  const prevBillSheetNameRef = useRef<string>(settings.billSheetName);
  const retryCountRef = useRef<number>(0);
  const allTabsRef = useRef<SheetTabInfo[]>(allTabs);

  useEffect(() => {
    allTabsRef.current = allTabs;
  }, [allTabs]);

  // Sync Dark Mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Listen to window resize for AUTO layout mode
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveIsDesktop =
    settings.viewLayoutMode === ViewLayoutMode.DESKTOP ||
    (settings.viewLayoutMode === ViewLayoutMode.AUTO && windowWidth >= 768);

  const isForcedDesktopOnMobile =
    settings.viewLayoutMode === ViewLayoutMode.DESKTOP && windowWidth < 1100;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const t = setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
    return () => clearTimeout(t);
  }, []);

  // Auto-discover worksheet tabs from Google Sheets
  const performTabDiscovery = useCallback(
    async (notifyOnNew = false, customSettings?: AppSettings) => {
      const currentSettings = customSettings || settings;
      setIsDiscoveringTabs(true);
      try {
        const discovered = await discoverSpreadsheetTabs(
          currentSettings.spreadsheetId,
          currentSettings.appsScriptUrl
        );
        const prevNames = new Set(allTabsRef.current.map((t) => t.name));
        const newlyAdded = discovered.filter((t) => !prevNames.has(t.name));
        setAllTabs(discovered);
        if (newlyAdded.length > 0 && notifyOnNew) {
          showToast(
            `ตรวจพบแผ่นงานใหม่: ${newlyAdded.map((t) => t.name).join(', ')}`
          );
        } else if (notifyOnNew) {
          showToast(`ซิงก์รายชื่อแผ่นงานแล้ว (${discovered.length} แผ่นงาน)`);
        }
        return discovered;
      } finally {
        setIsDiscoveringTabs(false);
      }
    },
    [settings, showToast]
  );

  // Main Data Fetcher (fetches both Claims sheet and Bill sheet, plus discovers tabs)
  const performFetch = useCallback(
    async (isManualRefresh = false, customSettings?: AppSettings) => {
      const currentSettings = customSettings || settings;
      setIsFetching(true);

      try {
        // Discover tabs in parallel
        const tabsPromise = discoverSpreadsheetTabs(
          currentSettings.spreadsheetId,
          currentSettings.appsScriptUrl
        );

        const currentTabs = allTabsRef.current;
        const matchedClaimsTab = currentTabs.find(
          (t) => t.name === currentSettings.sheetName
        );
        const matchedBillTab = currentTabs.find(
          (t) => t.name === currentSettings.billSheetName
        );

        const [outcome, newBillData, discoveredTabs] = await Promise.all([
          fetchSheetWithFallback(currentSettings, matchedClaimsTab?.gid),
          fetchBillSheetWithFallback(
            currentSettings,
            currentSettings.billSheetName,
            matchedBillTab?.gid
          ),
          tabsPromise,
        ]);

        if (discoveredTabs && discoveredTabs.length > 0) {
          setAllTabs(discoveredTabs);
        }

        const newData = outcome.data;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        setLastUpdatedTimeStr(timeStr);
        setFallbackNotice(outcome.fallbackNotice);
        setErrorBanner(null);

        if (outcome.isOfflineFallback) {
          retryCountRef.current += 1;
        } else {
          retryCountRef.current = 0;
        }

        const isSameSheet =
          prevSheetNameRef.current === currentSettings.sheetName;
        const isSameBillSheet =
          prevBillSheetNameRef.current === currentSettings.billSheetName;

        const hasClaimsChanged =
          prevHashRef.current !== null &&
          isSameSheet &&
          prevHashRef.current !== newData.dataHash;

        const hasBillChanged =
          prevBillHashRef.current !== null &&
          isSameBillSheet &&
          prevBillHashRef.current !== newBillData.dataHash;

        prevHashRef.current = newData.dataHash;
        prevBillHashRef.current = newBillData.dataHash;
        prevSheetNameRef.current = currentSettings.sheetName;
        prevBillSheetNameRef.current = currentSettings.billSheetName;

        setSheetData(newData);
        setBillData(newBillData);
        setIsInitialLoading(false);
        setIsBillLoading(false);

        if (hasClaimsChanged || hasBillChanged) {
          setFlashKey((k) => k + 1);
          showToast('ข้อมูลอัปเดตแล้ว');
        } else if (isManualRefresh) {
          showToast('ข้อมูลและรายชื่อแผ่นงานเป็นปัจจุบันแล้ว');
        }
      } catch (err) {
        retryCountRef.current += 1;
        const msg =
          err instanceof Error
            ? err.message
            : 'ไม่สามารถเชื่อมต่อกับ Google Sheets ได้ในขณะนี้';
        setErrorBanner(msg);
        setIsInitialLoading(false);
        setIsBillLoading(false);
      } finally {
        setIsFetching(false);
      }
    },
    [settings, showToast]
  );

  // Initial fetch and re-fetch when sheetName, billSheetName, spreadsheetId, or fetcherMode changes
  useEffect(() => {
    performFetch(false);
  }, [
    settings.sheetName,
    settings.billSheetName,
    settings.spreadsheetId,
    settings.fetcherMode,
    settings.publishedCsvUrl2569,
    settings.publishedCsvUrl2568,
    settings.appsScriptUrl,
  ]);

  // Real-time Polling with exponential backoff when offline & pause when hidden
  useEffect(() => {
    let timerId: number | undefined;

    const scheduleNextPoll = () => {
      const baseMs = settings.pollingIntervalSec * 1000;
      const backoffMultiplier =
        retryCountRef.current > 0
          ? Math.min(4, Math.pow(1.5, retryCountRef.current))
          : 1;
      const delayMs = Math.round(baseMs * backoffMultiplier);

      timerId = window.setTimeout(async () => {
        if (typeof document !== 'undefined' && !document.hidden) {
          await performFetch(false);
        }
        scheduleNextPoll();
      }, delayMs);
    };

    scheduleNextPoll();
    return () => {
      if (timerId) window.clearTimeout(timerId);
    };
  }, [settings.pollingIntervalSec, performFetch]);

  // Visibilitychange & Online listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        performFetch(false);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      retryCountRef.current = 0;
      performFetch(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performFetch]);

  // Settings Handlers
  const handleUpdateSettings = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    saveAppSettings(nextSettings);
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    saveAppSettings(DEFAULT_SETTINGS);
    showToast('รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นแล้ว');
  };

  const handleChangeSheetName = (nextSheetName: string) => {
    const updated = { ...settings, sheetName: nextSheetName };
    handleUpdateSettings(updated);
    if (activeTab === MobileNavTab.BILL || activeTab === MobileNavTab.SETTINGS) {
      setActiveTab(MobileNavTab.OVERVIEW);
    }
  };

  const handleChangeBillSheetName = (nextBillSheetName: string) => {
    setIsBillLoading(true);
    const updated = { ...settings, billSheetName: nextBillSheetName };
    handleUpdateSettings(updated);
  };

  const handleCycleViewLayoutMode = () => {
    const order = [
      ViewLayoutMode.AUTO,
      ViewLayoutMode.MOBILE,
      ViewLayoutMode.DESKTOP,
    ];
    const nextIdx = (order.indexOf(settings.viewLayoutMode) + 1) % order.length;
    const nextMode = order[nextIdx];
    const updated = { ...settings, viewLayoutMode: nextMode };
    handleUpdateSettings(updated);
    const modeThai =
      nextMode === ViewLayoutMode.AUTO
        ? 'โหมดอัตโนมัติ'
        : nextMode === ViewLayoutMode.MOBILE
        ? 'โหมดมือถือ'
        : 'โหมดเดสก์ท็อป';
    showToast(`สลับเป็น${modeThai}แล้ว`);
  };

  const handleToggleDarkMode = () => {
    const updated = { ...settings, darkMode: !settings.darkMode };
    handleUpdateSettings(updated);
  };

  // Filter Handlers
  const handleToggleSingleSchemeFromDonut = (scheme: ClaimScheme) => {
    if (filters.schemes.length === 1 && filters.schemes[0] === scheme) {
      setFilters({ ...filters, schemes: ['UC', 'COCD', 'SOCD'] });
      showToast('แสดงข้อมูลครบทุกสิทธิ');
    } else {
      setFilters({ ...filters, schemes: [scheme] });
      showToast(`กรองเฉพาะสิทธิ ${scheme}`);
    }
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    showToast('ล้างตัวกรองทั้งหมดแล้ว');
  };

  // Filtered Months & Periods according to active filters
  const filteredMonths = useMemo(() => {
    if (!sheetData) return [];
    return sheetData.months.filter((m) => {
      const inRange =
        m.fiscalMonthIndex >= filters.startFiscalMonthIndex &&
        m.fiscalMonthIndex <= filters.endFiscalMonthIndex;
      if (!inRange) return false;
      if (filters.onlyShowAnomaliesOrIncomplete) {
        const hasPeriodAnomalyInMonth = sheetData.periods.some(
          (p) =>
            p.monthNum === m.monthNum &&
            (p.isDuplicateSchemeValues || p.isCocdOutlier || p.isSocdOutlier)
        );
        return (
          m.isIncomplete ||
          m.hasMonthlySumMismatch ||
          Math.abs(m.cocdCrossTableDiff) > 0.5 ||
          Math.abs(m.socdCrossTableDiff) > 0.5 ||
          hasPeriodAnomalyInMonth
        );
      }
      return true;
    });
  }, [sheetData, filters]);

  const filteredPeriods = useMemo(() => {
    if (!sheetData) return [];
    const allowedMonthNums = new Set(
      FISCAL_MONTHS.filter(
        (fm) =>
          fm.fiscalIndex >= filters.startFiscalMonthIndex &&
          fm.fiscalIndex <= filters.endFiscalMonthIndex
      ).map((fm) => fm.monthNum)
    );

    return sheetData.periods.filter((p) => {
      if (!allowedMonthNums.has(p.monthNum)) return false;
      if (filters.onlyShowAnomaliesOrIncomplete) {
        return (
          p.isDuplicateSchemeValues ||
          p.isCocdOutlier ||
          p.isSocdOutlier ||
          p.hasRowSumMismatch
        );
      }
      return true;
    });
  }, [sheetData, filters]);

  const activeFilterCount =
    (filters.schemes.length < 3 ? 1 : 0) +
    (filters.startFiscalMonthIndex > 0 || filters.endFiscalMonthIndex < 11
      ? 1
      : 0) +
    (filters.onlyShowAnomaliesOrIncomplete ? 1 : 0);

  // Pull-to-refresh touch handlers on mobile
  const handleTouchStartRoot = (e: React.TouchEvent) => {
    if (window.scrollY <= 5) {
      setPullStartY(e.touches[0].clientY);
    } else {
      setPullStartY(null);
    }
  };

  const handleTouchMoveRoot = (e: React.TouchEvent) => {
    if (pullStartY === null) return;
    const dy = e.touches[0].clientY - pullStartY;
    if (dy > 0 && window.scrollY <= 5) {
      setPullDistance(Math.min(90, dy * 0.45));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEndRoot = () => {
    if (pullDistance > 55 && !isFetching) {
      performFetch(true);
    }
    setPullStartY(null);
    setPullDistance(0);
  };

  const qualityIssuesCount = sheetData?.qualityReport.issues.length ?? 0;
  const duplicateAnomalyCount =
    sheetData?.qualityReport.issues.filter(
      (i) => i.category === 'ANOMALY_DUPLICATE' || i.category === 'ANOMALY_OUTLIER'
    ).length ?? 0;

  const isSheetEmptyTemplate =
    sheetData !== null &&
    sheetData.periods.length > 0 &&
    sheetData.calculatedTotals.grandTotal === 0 &&
    sheetData.calculatedTotals.cocd === 0 &&
    sheetData.calculatedTotals.socd === 0;

  return (
    <div
      onTouchStart={!effectiveIsDesktop ? handleTouchStartRoot : undefined}
      onTouchMove={!effectiveIsDesktop ? handleTouchMoveRoot : undefined}
      onTouchEnd={!effectiveIsDesktop ? handleTouchEndRoot : undefined}
      className="min-h-screen bg-[#F4F8FF] dark:bg-[#0B1528] text-[#0F2A6B] dark:text-slate-100 transition-colors"
    >
      {/* Pull-to-refresh visual indicator on mobile */}
      {pullDistance > 10 && (
        <div
          className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none transition-transform"
          style={{ transform: `translateY(${Math.min(40, pullDistance - 10)}px)` }}
        >
          <div className="px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-blue-200 dark:border-slate-700 text-xs font-medium text-[#1D4ED8] dark:text-[#38BDF8] flex items-center gap-1.5">
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                pullDistance > 55 ? 'animate-spin' : ''
              }`}
            />
            <span>
              {pullDistance > 55
                ? 'ปล่อยเพื่อรีเฟรชข้อมูล...'
                : 'ดึงลงเพื่อรีเฟรช'}
            </span>
          </div>
        </div>
      )}

      {/* Real-time Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-18 right-4 z-50 px-4 py-2.5 rounded-2xl bg-[#0F2A6B] dark:bg-[#1D4ED8] text-white text-xs font-medium shadow-lg flex items-center gap-2 border border-blue-400/30 animate-number-flash"
        >
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky Header */}
      <Header
        sheetName={settings.sheetName}
        billSheetName={settings.billSheetName}
        claimsTabs={claimsTabs}
        billTabs={billTabs}
        activeTab={activeTab}
        fiscalYearLabel={
          activeTab === MobileNavTab.BILL
            ? billData?.fiscalYearLabel || settings.billSheetName
            : sheetData?.fiscalYearLabel || settings.sheetName
        }
        activeTier={
          activeTab === MobileNavTab.BILL
            ? billData?.activeTier ?? ActiveFetcherTier.TIER_1
            : sheetData?.activeTier ?? ActiveFetcherTier.TIER_1
        }
        isOnline={isOnline}
        isFetching={isFetching}
        lastUpdatedTimeStr={lastUpdatedTimeStr}
        viewLayoutMode={settings.viewLayoutMode}
        effectiveIsDesktop={effectiveIsDesktop}
        darkMode={settings.darkMode}
        qualityIssuesCount={qualityIssuesCount}
        activeFilterCount={activeFilterCount}
        onRefresh={() => performFetch(true)}
        onChangeSheetName={handleChangeSheetName}
        onChangeBillSheetName={handleChangeBillSheetName}
        onSelectTab={setActiveTab}
        onCycleViewLayoutMode={handleCycleViewLayoutMode}
        onSelectViewLayoutMode={(mode) =>
          handleUpdateSettings({ ...settings, viewLayoutMode: mode })
        }
        onToggleDarkMode={handleToggleDarkMode}
        onOpenQualityModal={() => setIsQualityModalOpen(true)}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
        onOpenMobileFilterSheet={() => setIsMobileFilterOpen(true)}
      />

      {/* Wrapper that supports Forced Desktop Mode (min-w-[1120px] with horizontal scroll) on Mobile */}
      <div
        className={
          isForcedDesktopOnMobile
            ? 'overflow-x-auto custom-scrollbar pb-8'
            : 'w-full'
        }
      >
        <div
          className={`${
            isForcedDesktopOnMobile
              ? 'min-w-[1140px] px-4 py-5'
              : 'max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8'
          }`}
        >
          {/* Forced Desktop on Mobile Notice Bar */}
          {isForcedDesktopOnMobile && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-[#E0F2FE] dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs text-[#0F2A6B] dark:text-sky-200">
              <span>
                กำลังแสดงผลใน <strong>โหมดเดสก์ท็อป</strong> บนหน้าจอขนาดเล็ก (สามารถเลื่อนซ้าย-ขวาหรือย่อ/ขยายเพื่อดูตารางและกราฟทั้งหมดได้)
              </span>
              <button
                type="button"
                onClick={() =>
                  handleUpdateSettings({
                    ...settings,
                    viewLayoutMode: ViewLayoutMode.AUTO,
                  })
                }
                className="px-3 py-1 rounded-lg bg-[#1D4ED8] text-white font-medium hover:bg-[#1E40AF] shrink-0"
              >
                กลับโหมดมือถือ
              </button>
            </div>
          )}

          {/* Error or Fallback Notice Banners */}
          {errorBanner && (
            <div className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex flex-wrap items-center justify-between gap-3 text-xs text-red-900 dark:text-red-200">
              <div className="flex items-start gap-2.5">
                <WifiOff className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-bold text-sm">
                    ไม่สามารถดึงข้อมูลล่าสุดจาก Google Sheets ได้
                  </div>
                  <p className="mt-0.5">{errorBanner}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => performFetch(true)}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#EF4444] text-white font-medium hover:bg-red-700"
                >
                  ลองใหม่
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(MobileNavTab.SETTINGS)}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700 font-medium"
                >
                  ไปหน้าตั้งค่า
                </button>
              </div>
            </div>
          )}

          {fallbackNotice && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>{fallbackNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => performFetch(true)}
                className="text-xs font-semibold text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
              >
                ลองเชื่อมต่อระดับ 1 ใหม่
              </button>
            </div>
          )}

          {/* Structure Changed Error State */}
          {activeTab !== MobileNavTab.BILL &&
          sheetData &&
          !sheetData.qualityReport.isStructureValid ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#112240] border-2 border-red-300 dark:border-red-800 text-center max-w-2xl mx-auto my-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-[#EF4444] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="font-display font-bold text-lg text-[#0F2A6B] dark:text-white">
                โครงสร้าง Sheet เปลี่ยนไป
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {sheetData.qualityReport.structureErrorMessage}
              </p>
              <p className="text-xs text-slate-500">
                ระบบระงับการแสดงผลตัวเลขเพื่อป้องกันการอ่านคอลัมน์ผิดพลาด กรุณาตรวจสอบหัวตารางใน Google Sheet (คอลัมน์ A–G และ I–M) หรือเลือกแท็บปีงบประมาณอื่น
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => performFetch(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-medium"
                >
                  ลองอ่านข้อมูลอีกครั้ง
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(MobileNavTab.SETTINGS)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium"
                >
                  ตั้งค่าแหล่งข้อมูล
                </button>
              </div>
            </div>
          ) : isInitialLoading || !sheetData ? (
            /* Skeleton Loading State */
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-36 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-800 p-5"
                  >
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                    <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                    <div className="h-3 w-32 bg-slate-100 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 h-80 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-800" />
                <div className="lg:col-span-8 h-80 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-800" />
              </div>
            </div>
          ) : (
            /* Main Workspace (Desktop Sidebar + Content OR Mobile Single-Column + Bottom Nav) */
            <div
              className={
                effectiveIsDesktop ? 'flex items-start gap-5' : 'space-y-4'
              }
            >
              {/* Left Sidebar on Desktop */}
              {effectiveIsDesktop && (
                <DesktopSidebar
                  sheetName={settings.sheetName}
                  billSheetName={settings.billSheetName}
                  claimsTabs={claimsTabs}
                  billTabs={billTabs}
                  hasUcColumn={sheetData.hasUcColumn}
                  filters={filters}
                  activeTab={activeTab}
                  qualityIssuesCount={qualityIssuesCount}
                  onChangeSheetName={handleChangeSheetName}
                  onChangeBillSheetName={handleChangeBillSheetName}
                  onUpdateFilters={setFilters}
                  onResetFilters={handleResetFilters}
                  onSelectTab={setActiveTab}
                  onOpenQualityModal={() => setIsQualityModalOpen(true)}
                />
              )}

              {/* Main Viewport */}
              <main className="flex-1 min-w-0 space-y-4">
                {/* Mobile Compact Fiscal Year & Active Filter Bar */}
                {!effectiveIsDesktop &&
                  activeTab !== MobileNavTab.SETTINGS &&
                  activeTab !== MobileNavTab.BILL && (
                    <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#112240] p-2.5 rounded-2xl border border-blue-100/80 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                        {claimsTabs.map((tab) => {
                          const active = settings.sheetName === tab.name;
                          return (
                            <button
                              key={tab.name}
                              type="button"
                              onClick={() => handleChangeSheetName(tab.name)}
                              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                                active
                                  ? 'bg-[#1D4ED8] text-white shadow-xs'
                                  : 'bg-[#F4F8FF] dark:bg-slate-800 text-[#0F2A6B] dark:text-slate-300'
                              }`}
                            >
                              ปีงบ {tab.fiscalYearBE}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>ล้าง ({activeFilterCount})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsMobileFilterOpen(true)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#E0F2FE] dark:bg-slate-800 text-[#1D4ED8] dark:text-[#38BDF8] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>ตัวกรอง</span>
                        </button>
                      </div>
                    </div>
                  )}

                {/* Banner when viewing a newly created fiscal year sheet with 0 recorded amounts (e.g., ฟอกไต 2570) */}
                {activeTab !== MobileNavTab.SETTINGS &&
                  activeTab !== MobileNavTab.BILL &&
                  isSheetEmptyTemplate && (
                    <div className="p-4 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                        <div className="text-[#0F2A6B] dark:text-sky-100 space-y-0.5">
                          <div className="font-display font-bold">
                            เชื่อมต่อแผ่นงานใหม่ &ldquo;{settings.sheetName}&rdquo; เรียบร้อยแล้ว ({sheetData.periods.length} งวด)
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">
                            โครงสร้างตารางพร้อมใช้งาน (COCD20261001 – SOCD20270902) ขณะนี้ยังไม่มีการกรอกยอดเงินในแผ่นงานนี้ เมื่อกรอกตัวเลขใน Google Sheet ระบบจะอัปเดตกราฟและยอดรวมอัตโนมัติ
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChangeSheetName('ฟอกไต 2569')}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#1D4ED8] text-white font-semibold whitespace-nowrap self-start sm:self-center shrink-0 hover:bg-[#1E40AF]"
                      >
                        ดูข้อมูลปีงบ 2569
                      </button>
                    </div>
                  )}

                {/* Data Quality & Anomaly Alert Strip (Highlights Period 20260201 & Incomplete UC Months) */}
                {activeTab !== MobileNavTab.SETTINGS &&
                  activeTab !== MobileNavTab.BILL &&
                  !isSheetEmptyTemplate &&
                  (duplicateAnomalyCount > 0 ||
                    sheetData.qualityReport.incompleteMonths.length > 0) && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                        <div className="text-amber-900 dark:text-amber-200 space-y-0.5">
                          <div className="font-display font-bold">
                            ตรวจพบข้อสังเกตจากการตรวจสอบข้อมูลอัตโนมัติ ({sheetData.fiscalYearLabel})
                          </div>
                          <div>
                            {duplicateAnomalyCount > 0 && (
                              <span>
                                • พบงวดที่ข้อมูลผิดปกติ (งวด <strong>20260201</strong> มีค่า SOCD = COCD เท่ากันทุกตัวเลข: 61 คน, 145,828 บาท){' '}
                              </span>
                            )}
                            {sheetData.qualityReport.incompleteMonths.length >
                              0 && (
                              <span>
                                • เดือนที่ยังไม่มีข้อมูล UC:{' '}
                                <strong>
                                  {sheetData.qualityReport.incompleteMonths.join(
                                    ', '
                                  )}
                                </strong>{' '}
                                (ไม่นับเป็น 0)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsQualityModalOpen(true)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-semibold whitespace-nowrap self-start sm:self-center shrink-0"
                      >
                        ดูรายงานตรวจสอบ →
                      </button>
                    </div>
                  )}

                {/* Conditional Views based on Active Tab */}
                {activeTab === MobileNavTab.SETTINGS ? (
                  <SettingsView
                    settings={settings}
                    claimsTabs={claimsTabs}
                    billTabs={billTabs}
                    isDiscoveringTabs={isDiscoveringTabs}
                    onUpdateSettings={handleUpdateSettings}
                    onResetSettings={handleResetSettings}
                    onRediscoverTabs={() => performTabDiscovery(true)}
                    onOpenAboutModal={() => setIsAboutModalOpen(true)}
                  />
                ) : activeTab === MobileNavTab.BILL ? (
                  <BillDashboardView
                    billData={billData}
                    billTabs={billTabs}
                    activeBillSheetName={settings.billSheetName}
                    isLoading={isBillLoading}
                    effectiveIsDesktop={effectiveIsDesktop}
                    darkMode={settings.darkMode}
                    flashKey={flashKey}
                    onSelectBillSheet={handleChangeBillSheetName}
                  />
                ) : activeTab === MobileNavTab.CHARTS ? (
                  <ChartsSection
                    months={filteredMonths}
                    periods={filteredPeriods}
                    hasUcColumn={sheetData.hasUcColumn}
                    selectedSchemes={filters.schemes}
                    effectiveIsDesktop={effectiveIsDesktop}
                    darkMode={settings.darkMode}
                    onToggleSingleSchemeFilter={handleToggleSingleSchemeFromDonut}
                    onResetSchemeFilter={() =>
                      setFilters({ ...filters, schemes: ['UC', 'COCD', 'SOCD'] })
                    }
                  />
                ) : activeTab === MobileNavTab.TABLE ? (
                  <ClaimsTable
                    periods={filteredPeriods}
                    months={filteredMonths}
                    hasUcColumn={sheetData.hasUcColumn}
                    sheetName={settings.sheetName}
                    selectedSchemes={filters.schemes}
                    sheetSummaryRow={sheetData.sheetSummaryRow}
                  />
                ) : (
                  /* OVERVIEW TAB (Default: Shows KPI Cards + Charts + Table) */
                  <div className="space-y-4">
                    <KpiCards
                      months={filteredMonths}
                      periods={filteredPeriods}
                      selectedSchemes={filters.schemes}
                      sheetSummaryRow={sheetData.sheetSummaryRow}
                      grandTotalPassed={sheetData.qualityReport.grandTotalPassed}
                      grandTotalDiff={sheetData.qualityReport.grandTotalDiff}
                      effectiveIsDesktop={effectiveIsDesktop}
                      flashKey={flashKey}
                    />

                    <ChartsSection
                      months={filteredMonths}
                      periods={filteredPeriods}
                      hasUcColumn={sheetData.hasUcColumn}
                      selectedSchemes={filters.schemes}
                      effectiveIsDesktop={effectiveIsDesktop}
                      darkMode={settings.darkMode}
                      onToggleSingleSchemeFilter={
                        handleToggleSingleSchemeFromDonut
                      }
                      onResetSchemeFilter={() =>
                        setFilters({
                          ...filters,
                          schemes: ['UC', 'COCD', 'SOCD'],
                        })
                      }
                    />

                    <ClaimsTable
                      periods={filteredPeriods}
                      months={filteredMonths}
                      hasUcColumn={sheetData.hasUcColumn}
                      sheetName={settings.sheetName}
                      selectedSchemes={filters.schemes}
                      sheetSummaryRow={sheetData.sheetSummaryRow}
                    />
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (5 Tabs: ภาพรวม | Bill ฟอกไต | กราฟ | ตาราง | ตั้งค่า) */}
      {!effectiveIsDesktop && (
        <nav
          aria-label="แถบเมนูหลักด้านล่าง"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0D1B35]/95 backdrop-blur-md border-t border-blue-100 dark:border-slate-800 pb-safe"
        >
          <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
            {[
              {
                id: MobileNavTab.OVERVIEW,
                label: 'ภาพรวม',
                icon: LayoutDashboard,
              },
              {
                id: MobileNavTab.BILL,
                label: 'Bill ฟอกไต',
                icon: ReceiptText,
              },
              {
                id: MobileNavTab.CHARTS,
                label: 'กราฟ',
                icon: BarChart3,
              },
              {
                id: MobileNavTab.TABLE,
                label: 'ตาราง',
                icon: FileSpreadsheet,
              },
              {
                id: MobileNavTab.SETTINGS,
                label: 'ตั้งค่า',
                icon: Settings,
              },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    active
                      ? 'text-[#1D4ED8] dark:text-[#38BDF8] font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-[#0F2A6B]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] leading-none">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Modals & Mobile Filter Sheet */}
      {sheetData && (
        <DataQualityModal
          isOpen={isQualityModalOpen}
          onClose={() => setIsQualityModalOpen(false)}
          report={sheetData.qualityReport}
          months={sheetData.months}
          sheetName={settings.sheetName}
        />
      )}

      <AboutSystemModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      <MobileFilterBottomSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        sheetName={settings.sheetName}
        billSheetName={settings.billSheetName}
        claimsTabs={claimsTabs}
        billTabs={billTabs}
        activeTab={activeTab}
        hasUcColumn={sheetData?.hasUcColumn ?? true}
        filters={filters}
        onChangeSheetName={handleChangeSheetName}
        onChangeBillSheetName={(billName) => {
          handleChangeBillSheetName(billName);
          setActiveTab(MobileNavTab.BILL);
          setIsMobileFilterOpen(false);
        }}
        onSelectTab={setActiveTab}
        onUpdateFilters={setFilters}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}
