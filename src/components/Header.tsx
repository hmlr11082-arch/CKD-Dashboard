import React from 'react';
import {
  Info,
  Laptop,
  Moon,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sun,
} from 'lucide-react';
import { getTierBadgeLabel } from '../services/sheetFetcher';
import {
  ActiveFetcherTier,
  MobileNavTab,
  SheetTabInfo,
  ViewLayoutMode,
} from '../types/claims';

interface HeaderProps {
  sheetName: string;
  billSheetName: string;
  claimsTabs: SheetTabInfo[];
  billTabs: SheetTabInfo[];
  activeTab: MobileNavTab;
  fiscalYearLabel: string;
  activeTier: ActiveFetcherTier;
  isOnline: boolean;
  isFetching: boolean;
  lastUpdatedTimeStr: string;
  viewLayoutMode: ViewLayoutMode;
  effectiveIsDesktop: boolean;
  darkMode: boolean;
  qualityIssuesCount: number;
  activeFilterCount: number;
  onRefresh: () => void;
  onChangeSheetName: (sheetName: string) => void;
  onChangeBillSheetName: (billSheetName: string) => void;
  onSelectTab: (tab: MobileNavTab) => void;
  onCycleViewLayoutMode: () => void;
  onSelectViewLayoutMode: (mode: ViewLayoutMode) => void;
  onToggleDarkMode: () => void;
  onOpenQualityModal: () => void;
  onOpenAboutModal: () => void;
  onOpenMobileFilterSheet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sheetName,
  billSheetName,
  claimsTabs,
  billTabs,
  activeTab,
  activeTier,
  isOnline,
  isFetching,
  lastUpdatedTimeStr,
  viewLayoutMode,
  effectiveIsDesktop,
  darkMode,
  qualityIssuesCount,
  activeFilterCount,
  onRefresh,
  onChangeSheetName,
  onChangeBillSheetName,
  onSelectTab,
  onCycleViewLayoutMode,
  onToggleDarkMode,
  onOpenQualityModal,
  onOpenAboutModal,
  onOpenMobileFilterSheet,
}) => {
  const isLiveConnected =
    isOnline &&
    (activeTier === ActiveFetcherTier.TIER_1 ||
      activeTier === ActiveFetcherTier.TIER_2 ||
      activeTier === ActiveFetcherTier.TIER_3);

  const viewModeLabel =
    viewLayoutMode === ViewLayoutMode.AUTO
      ? 'อัตโนมัติ'
      : viewLayoutMode === ViewLayoutMode.MOBILE
      ? 'มือถือ'
      : 'เดสก์ท็อป';

  const isBillViewActive = activeTab === MobileNavTab.BILL;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/95 dark:bg-[#0D1B35]/95 border-b border-blue-100/80 dark:border-slate-800 transition-colors">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2">
        {/* Left: Hospital Logo & Brand Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white p-0.5 border border-blue-100 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/assets/aistudio/TTK_Logo_3d9ddd8c.png"
              alt="โลโก้ โรงพยาบาลท่าคันโท 11085"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <h1 className="font-display font-bold text-sm sm:text-base md:text-lg text-[#0F2A6B] dark:text-white truncate">
                โรงพยาบาลท่าคันโท 11085
              </h1>
              <span
                className="hidden md:inline text-slate-300 dark:text-slate-600"
                aria-hidden="true"
              >
                |
              </span>
              <span className="text-xs sm:text-sm font-display font-semibold text-[#1D4ED8] dark:text-[#38BDF8] truncate">
                Dashboard การส่งเบิกค่าฟอกไต
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
              {isLiveConnected ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#16A34A] dark:text-[#22C55E] shrink-0">
                  <span
                    className="w-2 h-2 rounded-full bg-[#22C55E]"
                    aria-hidden="true"
                  />
                  LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-[#F59E0B] shrink-0">
                  <span
                    className="w-2 h-2 rounded-full bg-[#F59E0B]"
                    aria-hidden="true"
                  />
                  {isOnline ? 'โหมดสำรอง' : 'ออฟไลน์'}
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono-num shrink-0">
                อัปเดตล่าสุด {lastUpdatedTimeStr}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="hidden sm:inline text-[#1D4ED8] dark:text-[#38BDF8] font-medium truncate">
                {getTierBadgeLabel(activeTier)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Dynamic Worksheet Selector + Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Dynamic Fiscal Year / Sheet Selector (Auto-populated from Google Sheet tabs!) */}
          <div className="hidden lg:flex items-center bg-[#F4F8FF] dark:bg-slate-800/90 p-1 rounded-xl border border-blue-100 dark:border-slate-700 gap-0.5">
            {claimsTabs.map((tab) => {
              const active = !isBillViewActive && sheetName === tab.name;
              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() => {
                    onChangeSheetName(tab.name);
                    if (isBillViewActive) {
                      onSelectTab(MobileNavTab.OVERVIEW);
                    }
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#1D4ED8] text-white shadow-xs'
                      : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.shortLabel}
                </button>
              );
            })}

            {/* Divider & Quick Bill View Button */}
            {billTabs.length > 0 && (
              <>
                <span
                  className="w-px h-5 bg-blue-200 dark:bg-slate-700 mx-1"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!isBillViewActive) {
                      // Sync bill fiscal year if a matching Bill tab exists
                      const yearMatch = sheetName.match(/(\d{4})/);
                      if (yearMatch) {
                        const matchedBill = billTabs.find((b) =>
                          b.name.includes(yearMatch[1])
                        );
                        if (matchedBill) {
                          onChangeBillSheetName(matchedBill.name);
                        }
                      }
                      onSelectTab(MobileNavTab.BILL);
                    } else {
                      onSelectTab(MobileNavTab.OVERVIEW);
                    }
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1 transition-all whitespace-nowrap shrink-0 ${
                    isBillViewActive
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isBillViewActive
                      ? billSheetName
                      : `Bill ฟอกไต (${billTabs.length})`}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Data Quality Audit Trigger */}
          <button
            type="button"
            onClick={onOpenQualityModal}
            title="ตรวจสอบความถูกต้องของข้อมูลอัตโนมัติ"
            className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border whitespace-nowrap shrink-0 ${
              qualityIssuesCount > 0
                ? 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/70 hover:bg-amber-100/80'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/70'
            }`}
          >
            {qualityIssuesCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-[#F59E0B] shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
            )}
            <span className="hidden xl:inline">ตรวจสอบข้อมูล</span>
            <span className="font-mono-num font-semibold">
              ({qualityIssuesCount})
            </span>
          </button>

          {/* Mobile Filter Sheet Trigger (shown when in mobile layout) */}
          {!effectiveIsDesktop && (
            <button
              type="button"
              onClick={onOpenMobileFilterSheet}
              title="ตัวกรองข้อมูลและเลือกแผ่นงาน"
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-[#E0F2FE]/70 dark:bg-slate-800 text-[#1D4ED8] dark:text-[#38BDF8] hover:bg-[#E0F2FE] flex items-center justify-center gap-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              {activeFilterCount > 0 && (
                <span className="font-mono-num font-bold text-[11px]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            title="ดึงข้อมูลและตรวจหาแผ่นงานใหม่เดี๋ยวนี้"
            className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 hover:bg-[#E0F2FE] dark:hover:bg-slate-700 text-[#1D4ED8] dark:text-[#38BDF8] border border-blue-100 dark:border-slate-700 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 shrink-0 ${isFetching ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          {/* 3-State View Mode Switcher (อัตโนมัติ / มือถือ / เดสก์ท็อป) */}
          <button
            type="button"
            onClick={onCycleViewLayoutMode}
            title={`โหมดการแสดงผล: ${viewModeLabel} (คลิกเพื่อสลับ อัตโนมัติ / มือถือ / เดสก์ท็อป)`}
            className="min-h-[44px] px-2.5 sm:px-3 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white flex items-center gap-1.5 text-xs font-medium shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            {viewLayoutMode === ViewLayoutMode.MOBILE ? (
              <Smartphone className="w-4 h-4 shrink-0" />
            ) : viewLayoutMode === ViewLayoutMode.DESKTOP ? (
              <Laptop className="w-4 h-4 shrink-0" />
            ) : effectiveIsDesktop ? (
              <Laptop className="w-4 h-4 shrink-0" />
            ) : (
              <Smartphone className="w-4 h-4 shrink-0" />
            )}
            <span className="text-[11px] sm:text-xs">{viewModeLabel}</span>
          </button>

          {/* About / Flow Diagram Modal Trigger */}
          <button
            type="button"
            onClick={onOpenAboutModal}
            title="เกี่ยวกับระบบและผังการทำงาน"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#F4F8FF] dark:bg-slate-800 hover:bg-[#E0F2FE] dark:hover:bg-slate-700 text-[#0F2A6B] dark:text-slate-200 border border-blue-100 dark:border-slate-700 flex items-center justify-center transition-colors shrink-0"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#F4F8FF] dark:bg-slate-800 hover:bg-[#E0F2FE] dark:hover:bg-slate-700 text-[#0F2A6B] dark:text-slate-200 border border-blue-100 dark:border-slate-700 flex items-center justify-center transition-colors shrink-0"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#1D4ED8]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
