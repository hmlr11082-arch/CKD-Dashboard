import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  Check,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  Receipt,
  RotateCcw,
  Settings,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  ClaimScheme,
  FilterState,
  MobileNavTab,
  SheetTabInfo,
} from '../types/claims';
import { FISCAL_MONTHS } from '../utils/csvParser';

interface FilterControlsProps {
  sheetName: string;
  billSheetName: string;
  claimsTabs: SheetTabInfo[];
  billTabs: SheetTabInfo[];
  hasUcColumn: boolean;
  filters: FilterState;
  activeTab: MobileNavTab;
  qualityIssuesCount: number;
  onChangeSheetName: (sheetName: string) => void;
  onChangeBillSheetName: (billSheetName: string) => void;
  onUpdateFilters: (next: FilterState) => void;
  onResetFilters: () => void;
  onSelectTab: (tab: MobileNavTab) => void;
  onOpenQualityModal: () => void;
}

const ALL_SCHEMES: {
  id: ClaimScheme;
  label: string;
  sub: string;
  color: string;
}[] = [
  {
    id: 'UC',
    label: 'UC (บัตรทอง)',
    sub: 'สปสช.',
    color: '#1E40AF',
  },
  {
    id: 'COCD',
    label: 'COCD (ข้าราชการ)',
    sub: 'กรมบัญชีกลาง',
    color: '#3B82F6',
  },
  {
    id: 'SOCD',
    label: 'SOCD (ประกันสังคม)',
    sub: 'สนง.ประกันสังคม',
    color: '#38BDF8',
  },
];

export const DesktopSidebar: React.FC<FilterControlsProps> = ({
  sheetName,
  billSheetName,
  claimsTabs,
  billTabs,
  hasUcColumn,
  filters,
  activeTab,
  qualityIssuesCount,
  onChangeSheetName,
  onChangeBillSheetName,
  onUpdateFilters,
  onResetFilters,
  onSelectTab,
  onOpenQualityModal,
}) => {
  const toggleScheme = (scheme: ClaimScheme) => {
    const exists = filters.schemes.includes(scheme);
    if (exists && filters.schemes.length === 1) return;
    const nextSchemes = exists
      ? filters.schemes.filter((s) => s !== scheme)
      : [...filters.schemes, scheme];
    onUpdateFilters({ ...filters, schemes: nextSchemes });
  };

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-[#112240] rounded-2xl p-4 border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between self-start sticky top-22 space-y-5">
      <div className="space-y-5">
        {/* Hospital Identity Banner */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F4F8FF] dark:bg-slate-800/80 border border-blue-100/80 dark:border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-blue-100 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/assets/aistudio/TTK_Logo_3d9ddd8c.png"
              alt="โลโก้ โรงพยาบาลท่าคันโท 11085"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-xs text-[#0F2A6B] dark:text-white leading-snug">
              โรงพยาบาลท่าคันโท
            </div>
            <div className="font-mono-num text-[11px] font-semibold text-[#1D4ED8] dark:text-[#38BDF8]">
              รหัสหน่วยบริการ 11085
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              งานส่งเบิกค่าฟอกไต
            </div>
          </div>
        </div>

        {/* Desktop Navigation Menu */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2.5 mb-1.5">
            เมนูหลัก
          </div>
          {[
            {
              id: MobileNavTab.OVERVIEW,
              label: 'แดชบอร์ดภาพรวมทั้งหมด',
              icon: LayoutDashboard,
            },
            {
              id: MobileNavTab.BILL,
              label: 'หน้า Bill ฟอกไต (CORTBIL)',
              icon: Receipt,
            },
            {
              id: MobileNavTab.CHARTS,
              label: 'เจาะลึกกราฟวิเคราะห์',
              icon: BarChart3,
            },
            {
              id: MobileNavTab.TABLE,
              label: 'ตารางรายงวด & รายเดือน',
              icon: FileSpreadsheet,
            },
            {
              id: MobileNavTab.SETTINGS,
              label: 'ตั้งค่าการเชื่อมต่อ',
              icon: Settings,
            },
          ].map((nav) => {
            const Icon = nav.icon;
            const active = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => onSelectTab(nav.id)}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all ${
                  active
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-[#F4F8FF] dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{nav.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Fiscal Year Switcher (Auto-detected from Google Sheet) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-display font-bold text-[#0F2A6B] dark:text-white">
              แผ่นงานการส่งเบิก ({claimsTabs.length})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {claimsTabs.map((tab) => {
              const active =
                activeTab !== MobileNavTab.BILL && sheetName === tab.name;
              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() => {
                    onChangeSheetName(tab.name);
                    if (activeTab === MobileNavTab.BILL) {
                      onSelectTab(MobileNavTab.OVERVIEW);
                    }
                  }}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all truncate ${
                    active
                      ? 'bg-[#E0F2FE] dark:bg-blue-950/80 text-[#1D4ED8] dark:text-[#38BDF8] border-blue-300 dark:border-blue-700 font-bold'
                      : 'bg-[#F4F8FF] dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-transparent hover:border-blue-200'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Dynamic Bill Sheets Switcher */}
          {billTabs.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <div className="text-xs font-display font-bold text-[#0F2A6B] dark:text-white px-1 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>แผ่นงาน Bill ฟอกไต ({billTabs.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {billTabs.map((bTab) => {
                  const active =
                    activeTab === MobileNavTab.BILL &&
                    billSheetName === bTab.name;
                  return (
                    <button
                      key={bTab.name}
                      type="button"
                      onClick={() => {
                        onChangeBillSheetName(bTab.name);
                        onSelectTab(MobileNavTab.BILL);
                      }}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all ${
                        active
                          ? 'bg-[#0284C7] text-white border-[#0284C7] font-bold shadow-xs'
                          : 'bg-[#F4F8FF] dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-transparent hover:border-sky-200'
                      }`}
                    >
                      <span>{bTab.name}</span>
                      <span className="text-[10px] opacity-80">เปิดดู →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Select Scheme Filter (Shown when on Claims tabs) */}
        {activeTab !== MobileNavTab.BILL && (
          <>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-display font-bold text-[#0F2A6B] dark:text-white flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  กรองตามสิทธิการรักษา
                </span>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-[11px] text-[#1D4ED8] dark:text-[#38BDF8] hover:underline flex items-center gap-0.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  รีเซ็ต
                </button>
              </div>

              <div className="space-y-1.5">
                {ALL_SCHEMES.map((s) => {
                  if (s.id === 'UC' && !hasUcColumn) return null;
                  const checked = filters.schemes.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleScheme(s.id)}
                      className={`w-full min-h-[42px] px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                        checked
                          ? 'bg-[#F4F8FF] dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-[#0F2A6B] dark:text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <div>
                          <div className="text-xs font-semibold leading-tight">
                            {s.label}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {s.sub}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center ${
                          checked
                            ? 'bg-[#1D4ED8] text-white'
                            : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Month Range Selector */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="text-xs font-display font-bold text-[#0F2A6B] dark:text-white flex items-center gap-1.5 px-1">
                <CalendarRange className="w-3.5 h-3.5 text-[#1D4ED8]" />
                ช่วงเดือนปีงบประมาณ
              </div>

              <div className="grid grid-cols-3 gap-1 text-[11px]">
                {[
                  { label: 'ทั้งปี', start: 0, end: 11 },
                  { label: 'ครึ่งแรก', start: 0, end: 5 },
                  { label: 'ครึ่งหลัง', start: 6, end: 11 },
                ].map((p) => {
                  const active =
                    filters.startFiscalMonthIndex === p.start &&
                    filters.endFiscalMonthIndex === p.end;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        onUpdateFilters({
                          ...filters,
                          startFiscalMonthIndex: p.start,
                          endFiscalMonthIndex: p.end,
                        })
                      }
                      className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                        active
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-[#F4F8FF] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    ตั้งแต่เดือน:
                  </label>
                  <select
                    value={filters.startFiscalMonthIndex}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateFilters({
                        ...filters,
                        startFiscalMonthIndex: val,
                        endFiscalMonthIndex: Math.max(
                          val,
                          filters.endFiscalMonthIndex
                        ),
                      });
                    }}
                    className="w-full min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs text-[#0F2A6B] dark:text-white"
                  >
                    {FISCAL_MONTHS.map((m) => (
                      <option key={m.fiscalIndex} value={m.fiscalIndex}>
                        {m.nameThai}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    ถึงเดือน:
                  </label>
                  <select
                    value={filters.endFiscalMonthIndex}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateFilters({
                        ...filters,
                        endFiscalMonthIndex: val,
                        startFiscalMonthIndex: Math.min(
                          val,
                          filters.startFiscalMonthIndex
                        ),
                      });
                    }}
                    className="w-full min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs text-[#0F2A6B] dark:text-white"
                  >
                    {FISCAL_MONTHS.map((m) => (
                      <option key={m.fiscalIndex} value={m.fiscalIndex}>
                        {m.nameThai}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    ...filters,
                    onlyShowAnomaliesOrIncomplete:
                      !filters.onlyShowAnomaliesOrIncomplete,
                  })
                }
                className={`w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
                  filters.onlyShowAnomaliesOrIncomplete
                    ? 'bg-amber-100/90 dark:bg-amber-950/70 border-amber-400 text-amber-900 dark:text-amber-200'
                    : 'bg-[#F4F8FF] dark:bg-slate-800/70 border-blue-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  <span>เฉพาะงวดผิดปกติ/ไม่ครบ</span>
                </span>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center ${
                    filters.onlyShowAnomaliesOrIncomplete
                      ? 'bg-[#F59E0B] text-white'
                      : 'border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {filters.onlyShowAnomaliesOrIncomplete && (
                    <Check className="w-3 h-3" />
                  )}
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Data Quality Quick Audit Card at Bottom of Sidebar */}
      <button
        type="button"
        onClick={onOpenQualityModal}
        className="w-full p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/70 border border-amber-200 dark:border-amber-800/70 text-left transition-colors"
      >
        <div className="flex items-center justify-between text-xs font-display font-bold text-amber-900 dark:text-amber-200">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
            ตรวจสอบข้อมูลอัตโนมัติ
          </span>
          <span className="font-mono-num">{qualityIssuesCount} รายการ</span>
        </div>
        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-1">
          คลิกเพื่อดูรายละเอียดการเทียบยอดและงวดที่ผิดปกติ (เช่น งวด 20260201)
        </p>
      </button>
    </aside>
  );
};

interface MobileFilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sheetName: string;
  billSheetName: string;
  claimsTabs: SheetTabInfo[];
  billTabs: SheetTabInfo[];
  activeTab: MobileNavTab;
  hasUcColumn: boolean;
  filters: FilterState;
  onChangeSheetName: (sheetName: string) => void;
  onChangeBillSheetName: (billSheetName: string) => void;
  onSelectTab: (tab: MobileNavTab) => void;
  onUpdateFilters: (next: FilterState) => void;
  onResetFilters: () => void;
}

export const MobileFilterBottomSheet: React.FC<
  MobileFilterBottomSheetProps
> = ({
  isOpen,
  onClose,
  sheetName,
  billSheetName,
  claimsTabs,
  billTabs,
  activeTab,
  hasUcColumn,
  filters,
  onChangeSheetName,
  onChangeBillSheetName,
  onSelectTab,
  onUpdateFilters,
  onResetFilters,
}) => {
  if (!isOpen) return null;

  const toggleScheme = (scheme: ClaimScheme) => {
    const exists = filters.schemes.includes(scheme);
    if (exists && filters.schemes.length === 1) return;
    const nextSchemes = exists
      ? filters.schemes.filter((s) => s !== scheme)
      : [...filters.schemes, scheme];
    onUpdateFilters({ ...filters, schemes: nextSchemes });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="ตัวกรองข้อมูลและเลือกแผ่นงาน"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#112240] rounded-t-3xl border-t border-blue-100 dark:border-slate-800 shadow-2xl p-5 pb-safe space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-1" />

        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-[#0F2A6B] dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#1D4ED8]" />
            เลือกแผ่นงานและตัวกรองข้อมูล
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Claims Sheets */}
        <div className="space-y-2">
          <label className="text-xs font-display font-bold text-[#0F2A6B] dark:text-white block">
            แผ่นงานการส่งเบิกค่าฟอกไต ({claimsTabs.length} แผ่นงาน)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {claimsTabs.map((tab) => {
              const active =
                activeTab !== MobileNavTab.BILL && sheetName === tab.name;
              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() => {
                    onChangeSheetName(tab.name);
                    if (activeTab === MobileNavTab.BILL) {
                      onSelectTab(MobileNavTab.OVERVIEW);
                    }
                  }}
                  className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    active
                      ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                      : 'bg-[#F4F8FF] dark:bg-slate-800 text-[#0F2A6B] dark:text-slate-200 border-blue-100 dark:border-slate-700'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Bill Sheets */}
        {billTabs.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-display font-bold text-[#0F2A6B] dark:text-white flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#0284C7]" />
              <span>แผ่นงาน Bill ฟอกไต ({billTabs.length} แผ่นงาน)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {billTabs.map((bTab) => {
                const active =
                  activeTab === MobileNavTab.BILL &&
                  billSheetName === bTab.name;
                return (
                  <button
                    key={bTab.name}
                    type="button"
                    onClick={() => {
                      onChangeBillSheetName(bTab.name);
                      onSelectTab(MobileNavTab.BILL);
                      onClose();
                    }}
                    className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      active
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-[#F4F8FF] dark:bg-slate-800 text-[#0F2A6B] dark:text-slate-200 border-blue-100 dark:border-slate-700'
                    }`}
                  >
                    {bTab.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Schemes */}
        <div className="space-y-2">
          <label className="text-xs font-display font-bold text-[#0F2A6B] dark:text-white block">
            สิทธิการรักษา (เลือกได้หลายสิทธิ)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {ALL_SCHEMES.map((s) => {
              if (s.id === 'UC' && !hasUcColumn) return null;
              const checked = filters.schemes.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleScheme(s.id)}
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl border flex items-center justify-between ${
                    checked
                      ? 'bg-[#F4F8FF] dark:bg-slate-800 border-blue-300 dark:border-blue-600 text-[#0F2A6B] dark:text-white font-semibold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-xs">
                    <span
                      className="w-3.5 h-3.5 rounded-sm"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label} ({s.sub})
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      checked
                        ? 'bg-[#1D4ED8] text-white'
                        : 'border border-slate-300'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Month Range */}
        <div className="space-y-2">
          <label className="text-xs font-display font-bold text-[#0F2A6B] dark:text-white block">
            ช่วงเดือน (ต.ค. → ก.ย.)
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">
                ตั้งแต่เดือน
              </span>
              <select
                value={filters.startFiscalMonthIndex}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateFilters({
                    ...filters,
                    startFiscalMonthIndex: val,
                    endFiscalMonthIndex: Math.max(
                      val,
                      filters.endFiscalMonthIndex
                    ),
                  });
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs text-[#0F2A6B] dark:text-white"
              >
                {FISCAL_MONTHS.map((m) => (
                  <option key={m.fiscalIndex} value={m.fiscalIndex}>
                    {m.nameThai}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">
                ถึงเดือน
              </span>
              <select
                value={filters.endFiscalMonthIndex}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateFilters({
                    ...filters,
                    endFiscalMonthIndex: val,
                    startFiscalMonthIndex: Math.min(
                      val,
                      filters.startFiscalMonthIndex
                    ),
                  });
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs text-[#0F2A6B] dark:text-white"
              >
                {FISCAL_MONTHS.map((m) => (
                  <option key={m.fiscalIndex} value={m.fiscalIndex}>
                    {m.nameThai}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Anomaly Only Filter */}
        <button
          type="button"
          onClick={() =>
            onUpdateFilters({
              ...filters,
              onlyShowAnomaliesOrIncomplete:
                !filters.onlyShowAnomaliesOrIncomplete,
            })
          }
          className={`w-full min-h-[48px] px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-between ${
            filters.onlyShowAnomaliesOrIncomplete
              ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 text-amber-900 dark:text-amber-200'
              : 'bg-[#F4F8FF] dark:bg-slate-800 border-blue-100 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            แสดงเฉพาะเดือน/งวดที่ข้อมูลไม่ครบหรือผิดปกติ
          </span>
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center ${
              filters.onlyShowAnomaliesOrIncomplete
                ? 'bg-[#F59E0B] text-white'
                : 'border border-slate-300'
            }`}
          >
            {filters.onlyShowAnomaliesOrIncomplete && (
              <Check className="w-3.5 h-3.5" />
            )}
          </div>
        </button>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              onResetFilters();
              onClose();
            }}
            className="min-h-[48px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            ล้างตัวกรอง
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-xl bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center"
          >
            นำไปใช้ทันที
          </button>
        </div>
      </div>
    </div>
  );
};
