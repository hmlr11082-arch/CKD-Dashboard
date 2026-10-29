import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Filter,
  Layers,
  PieChart as PieChartIcon,
  RotateCcw,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ClaimScheme, MonthlyRecord, PeriodRecord } from '../types/claims';
import { formatCurrencyTHB, formatNumberTH } from '../utils/csvParser';

interface ChartsSectionProps {
  months: MonthlyRecord[];
  periods: PeriodRecord[];
  hasUcColumn: boolean;
  selectedSchemes: ClaimScheme[];
  effectiveIsDesktop: boolean;
  darkMode: boolean;
  onToggleSingleSchemeFilter: (scheme: ClaimScheme) => void;
  onResetSchemeFilter: () => void;
}

const SCHEME_COLORS: Record<ClaimScheme, string> = {
  UC: '#1E40AF',
  COCD: '#3B82F6',
  SOCD: '#38BDF8',
};

const SCHEME_NAMES_THAI: Record<ClaimScheme, string> = {
  UC: 'UC (บัตรทอง / สปสช.)',
  COCD: 'COCD (กรมบัญชีกลาง)',
  SOCD: 'SOCD (ประกันสังคม)',
};

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  months,
  periods,
  hasUcColumn,
  selectedSchemes,
  effectiveIsDesktop,
  darkMode,
  onToggleSingleSchemeFilter,
  onResetSchemeFilter,
}) => {
  const [mobileChartSubTab, setMobileChartSubTab] = useState<
    'ALL' | 'DONUT' | 'MONTHLY' | 'PERIOD'
  >('ALL');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Compute totals per scheme for Donut Chart (always show all available schemes so user can click any slice to filter)
  const totalUc = months.reduce((acc, m) => acc + (m.ucAmount ?? 0), 0);
  const totalCocd = months.reduce((acc, m) => acc + (m.cocdAmount ?? 0), 0);
  const totalSocd = months.reduce((acc, m) => acc + (m.socdAmount ?? 0), 0);

  const donutRawData = [
    ...(hasUcColumn && totalUc > 0
      ? [
          {
            scheme: 'UC' as ClaimScheme,
            name: 'UC (สปสช.)',
            fullName: SCHEME_NAMES_THAI.UC,
            value: totalUc,
            color: SCHEME_COLORS.UC,
          },
        ]
      : []),
    {
      scheme: 'COCD' as ClaimScheme,
      name: 'COCD (ข้าราชการ)',
      fullName: SCHEME_NAMES_THAI.COCD,
      value: totalCocd,
      color: SCHEME_COLORS.COCD,
    },
    {
      scheme: 'SOCD' as ClaimScheme,
      name: 'SOCD (ประกันสังคม)',
      fullName: SCHEME_NAMES_THAI.SOCD,
      value: totalSocd,
      color: SCHEME_COLORS.SOCD,
    },
  ];

  const donutAllTotal = donutRawData.reduce((acc, d) => acc + d.value, 0);
  const donutDisplayedTotal = donutRawData
    .filter((d) => selectedSchemes.includes(d.scheme))
    .reduce((acc, d) => acc + d.value, 0);

  // Monthly Stacked Bar Data
  const monthlyChartData = months.map((m) => {
    const socd = selectedSchemes.includes('SOCD') ? m.socdAmount ?? 0 : 0;
    const cocd = selectedSchemes.includes('COCD') ? m.cocdAmount ?? 0 : 0;
    const uc = selectedSchemes.includes('UC') ? m.ucAmount ?? 0 : 0;
    const displayedTotal = socd + cocd + uc;

    return {
      monthShort: m.monthShortThai,
      monthFull: m.monthNameThai,
      SOCD: socd,
      COCD: cocd,
      UC: uc,
      rawSocd: m.socdAmount,
      rawCocd: m.cocdAmount,
      rawUc: m.ucAmount,
      displayedTotal,
      isUcMissing: m.isUcMissing,
      isIncomplete: m.isIncomplete,
    };
  });

  // Compute Monthly Average (for ReferenceLine) across months with data
  const validMonthlyTotals = monthlyChartData
    .filter((d) => d.displayedTotal > 0)
    .map((d) => d.displayedTotal);
  const monthlyAverage =
    validMonthlyTotals.length > 0
      ? validMonthlyTotals.reduce((a, b) => a + b, 0) / validMonthlyTotals.length
      : 0;

  // Period Combo Chart Data
  const showCocdInCombo = selectedSchemes.includes('COCD');
  const showSocdInCombo = selectedSchemes.includes('SOCD');

  const periodChartData = periods.map((p) => {
    const cocdAmt = showCocdInCombo ? p.cocdAmount ?? 0 : 0;
    const socdAmt = showSocdInCombo ? p.socdAmount ?? 0 : 0;
    const cocdPts = showCocdInCombo ? p.cocdPatients ?? 0 : 0;
    const socdPts = showSocdInCombo ? p.socdPatients ?? 0 : 0;
    const totalPts = cocdPts + socdPts;
    const totalAmt = cocdAmt + socdAmt;

    return {
      id: p.id,
      shortLabel: `${p.monthShortThai}/${p.periodNo}`,
      fullLabel: p.periodLabelThai,
      cocdCode: p.cocdCode,
      socdCode: p.socdCode,
      COCD: cocdAmt,
      SOCD: socdAmt,
      cocdPatients: p.cocdPatients,
      socdPatients: p.socdPatients,
      cocdAvg: p.cocdAvgPerPatient,
      socdAvg: p.socdAvgPerPatient,
      totalPatients: totalPts,
      totalAmount: totalAmt,
      combinedAvg: totalPts > 0 ? totalAmt / totalPts : 0,
      hasAnomaly:
        p.isDuplicateSchemeValues || p.isCocdOutlier || p.isSocdOutlier,
      isDuplicateSchemeValues: p.isDuplicateSchemeValues,
    };
  });

  const axisTextColor = darkMode ? '#94A3B8' : '#475569';
  const gridStrokeColor = darkMode ? '#1E293B' : '#E2E8F0';

  // Touch swipe handler on mobile chart tabs
  const subTabsOrder: ('ALL' | 'DONUT' | 'MONTHLY' | 'PERIOD')[] = [
    'ALL',
    'DONUT',
    'MONTHLY',
    'PERIOD',
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 65) {
      const idx = subTabsOrder.indexOf(mobileChartSubTab);
      if (deltaX < 0 && idx < subTabsOrder.length - 1) {
        setMobileChartSubTab(subTabsOrder[idx + 1]);
      } else if (deltaX > 0 && idx > 0) {
        setMobileChartSubTab(subTabsOrder[idx - 1]);
      }
    }
    setTouchStartX(null);
  };

  // Custom Top Label for Stacked Bar showing "ไม่ครบ" on months where UC is null
  const renderIncompleteBarLabel = (props: {
    x?: string | number;
    y?: string | number;
    width?: string | number;
    index?: number;
  }): React.ReactElement => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    const index = props.index ?? 0;
    const item = monthlyChartData[index];
    if (!item || !item.isUcMissing || !selectedSchemes.includes('UC')) {
      return <g />;
    }
    const centerX = x + width / 2;
    return (
      <g>
        <rect
          x={centerX - 22}
          y={Math.max(4, y - 22)}
          width={44}
          height={17}
          rx={5}
          fill="#FEF3C7"
          stroke="#F59E0B"
          strokeWidth={1}
        />
        <text
          x={centerX}
          y={Math.max(16, y - 10)}
          textAnchor="middle"
          fill="#B45309"
          fontSize={10}
          fontWeight={600}
        >
          ไม่ครบ
        </text>
      </g>
    );
  };

  const isSingleSchemeFiltered = selectedSchemes.length === 1;

  return (
    <div
      onTouchStart={!effectiveIsDesktop ? handleTouchStart : undefined}
      onTouchEnd={!effectiveIsDesktop ? handleTouchEnd : undefined}
      className="space-y-4"
    >
      {/* Mobile Sub-navigation for switching chart focus or swiping */}
      {!effectiveIsDesktop && (
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#112240] p-1.5 rounded-2xl border border-blue-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
          {[
            { key: 'ALL', label: 'ทั้งหมด', icon: Layers },
            { key: 'DONUT', label: 'สัดส่วนสิทธิ', icon: PieChartIcon },
            { key: 'MONTHLY', label: 'รายเดือน', icon: BarChart3 },
            { key: 'PERIOD', label: 'รายงวด', icon: Filter },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = mobileChartSubTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setMobileChartSubTab(
                    tab.key as 'ALL' | 'DONUT' | 'MONTHLY' | 'PERIOD'
                  )
                }
                className={`min-h-[40px] flex-1 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-blue-50/70 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Middle Row on Desktop (12 cols: 4 cols Donut + 8 cols Monthly Stacked Bar) */}
      <div
        className={
          effectiveIsDesktop
            ? 'grid grid-cols-12 gap-4 items-stretch'
            : 'space-y-4'
        }
      >
        {/* 1) Donut Chart: สัดส่วนยอดเงินตามสิทธิ */}
        {(effectiveIsDesktop ||
          mobileChartSubTab === 'ALL' ||
          mobileChartSubTab === 'DONUT') && (
          <div
            className={`${
              effectiveIsDesktop ? 'col-span-4' : 'w-full'
            } bg-white dark:bg-[#112240] rounded-2xl p-4 sm:p-5 border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <h2 className="font-display font-bold text-base text-[#0F2A6B] dark:text-white">
                    สัดส่วนยอดเบิกตามสิทธิ
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    แตะชิ้นกราฟเพื่อกรองเฉพาะสิทธินั้น
                  </p>
                </div>
                {isSingleSchemeFiltered && (
                  <button
                    type="button"
                    onClick={onResetSchemeFilter}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#E0F2FE] dark:bg-blue-950 text-[#1D4ED8] dark:text-[#38BDF8] text-xs font-medium flex items-center gap-1 hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    แสดงทุกสิทธิ
                  </button>
                )}
              </div>

              {/* Donut Chart Container */}
              <div className="relative h-[230px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutRawData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={92}
                      paddingAngle={3}
                      onClick={(_data, index) => {
                        const clickedItem = donutRawData[index];
                        if (clickedItem?.scheme) {
                          onToggleSingleSchemeFilter(clickedItem.scheme);
                        }
                      }}
                      className="cursor-pointer focus:outline-none"
                    >
                      {donutRawData.map((entry) => {
                        const isSelected = selectedSchemes.includes(entry.scheme);
                        return (
                          <Cell
                            key={entry.scheme}
                            fill={entry.color}
                            fillOpacity={isSelected ? 1 : 0.25}
                            stroke={
                              isSingleSchemeFiltered && isSelected
                                ? '#0F2A6B'
                                : '#FFFFFF'
                            }
                            strokeWidth={
                              isSingleSchemeFiltered && isSelected ? 2.5 : 1.5
                            }
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload as (typeof donutRawData)[0];
                        const pct =
                          donutAllTotal > 0
                            ? ((data.value / donutAllTotal) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-blue-100 dark:border-slate-700 shadow-lg text-xs">
                            <div className="font-display font-bold text-[#0F2A6B] dark:text-white mb-1">
                              {data.fullName}
                            </div>
                            <div className="font-mono-num text-sm font-bold text-[#1D4ED8] dark:text-[#38BDF8]">
                              {formatCurrencyTHB(data.value, true)}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                              สัดส่วน {pct}% ของยอดรวมทั้งหมด
                            </div>
                            <div className="text-[11px] text-[#1D4ED8] dark:text-sky-400 mt-1 font-medium">
                              คลิกเพื่อกรองเฉพาะสิทธิ {data.scheme}
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Label inside Donut */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {selectedSchemes.length === 3
                      ? 'ยอดรวมทุกสิทธิ'
                      : `รวม (${selectedSchemes.join('+')})`}
                  </span>
                  <span className="font-display font-bold font-mono-num text-sm sm:text-base text-[#0F2A6B] dark:text-white mt-0.5">
                    {formatCurrencyTHB(donutDisplayedTotal, false)}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Legend Buttons */}
            <div className="space-y-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {donutRawData.map((item) => {
                const pct =
                  donutAllTotal > 0
                    ? ((item.value / donutAllTotal) * 100).toFixed(1)
                    : '0.0';
                const isSelected = selectedSchemes.includes(item.scheme);
                return (
                  <button
                    key={item.scheme}
                    type="button"
                    onClick={() => onToggleSingleSchemeFilter(item.scheme)}
                    className={`w-full min-h-[40px] px-3 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? 'bg-[#F4F8FF] dark:bg-slate-800/90 text-[#0F2A6B] dark:text-white font-medium'
                        : 'opacity-45 hover:opacity-80 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono-num shrink-0">
                      <span className="font-semibold">
                        {formatCurrencyTHB(item.value, false)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 w-12 text-right">
                        ({pct}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2) Stacked Bar Chart: ยอดเงินรายเดือน (ต.ค. -> ก.ย.) */}
        {(effectiveIsDesktop ||
          mobileChartSubTab === 'ALL' ||
          mobileChartSubTab === 'MONTHLY') && (
          <div
            className={`${
              effectiveIsDesktop ? 'col-span-8' : 'w-full'
            } bg-white dark:bg-[#112240] rounded-2xl p-4 sm:p-5 border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <h2 className="font-display font-bold text-base text-[#0F2A6B] dark:text-white">
                  ยอดเบิกรายเดือนแยกตามสิทธิ (ต.ค. → ก.ย.)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  เส้นประแนวนอนแสดงค่าเฉลี่ยรายเดือน ({formatCurrencyTHB(monthlyAverage, false)}) · แท่งลายขีดคือเดือนที่ยังไม่มีข้อมูล UC
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-3 text-xs">
                {hasUcColumn && (
                  <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="w-3 h-3 rounded-xs bg-[#1E40AF]" />
                    UC
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="w-3 h-3 rounded-xs bg-[#3B82F6]" />
                  COCD
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="w-3 h-3 rounded-xs bg-[#38BDF8]" />
                  SOCD
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
                  <span className="w-3 h-3 rounded-xs border border-amber-500 bg-amber-100" />
                  ไม่ครบ (รอ UC)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[560px] h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyChartData}
                    margin={{ top: 28, right: 16, left: 8, bottom: 4 }}
                  >
                    <defs>
                      {/* Diagonal Hatch Pattern for months where UC is null */}
                      <pattern
                        id="incompleteStripeCocd"
                        width="8"
                        height="8"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                      >
                        <rect width="8" height="8" fill="#3B82F6" fillOpacity="0.82" />
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="8"
                          stroke="#FDE68A"
                          strokeWidth="3"
                        />
                      </pattern>
                      <pattern
                        id="incompleteStripeSocd"
                        width="8"
                        height="8"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                      >
                        <rect width="8" height="8" fill="#38BDF8" fillOpacity="0.85" />
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="8"
                          stroke="#FEF3C7"
                          strokeWidth="3"
                        />
                      </pattern>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={gridStrokeColor}
                    />
                    <XAxis
                      dataKey="monthShort"
                      tick={{ fill: axisTextColor, fontSize: 12 }}
                      axisLine={{ stroke: gridStrokeColor }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: axisTextColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1_000_000
                          ? `฿${(v / 1_000_000).toFixed(1)}M`
                          : v >= 1_000
                          ? `฿${(v / 1_000).toFixed(0)}k`
                          : `฿${v}`
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const row = payload[0].payload as (typeof monthlyChartData)[0];
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-blue-100 dark:border-slate-700 shadow-lg text-xs min-w-[220px]">
                            <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="font-display font-bold text-sm text-[#0F2A6B] dark:text-white">
                                เดือน{row.monthFull}
                              </span>
                              {row.isUcMissing && (
                                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300">
                                  ข้อมูลยังไม่ครบ
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5 font-mono-num">
                              {hasUcColumn && (
                                <div className="flex items-center justify-between gap-4">
                                  <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-sans-thai">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-[#1E40AF]" />
                                    UC:
                                  </span>
                                  <span
                                    className={
                                      row.rawUc === null
                                        ? 'text-amber-600 dark:text-amber-400 font-sans-thai font-medium'
                                        : 'font-semibold text-[#0F2A6B] dark:text-white'
                                    }
                                  >
                                    {row.rawUc === null
                                      ? 'ยังไม่มีข้อมูล'
                                      : formatCurrencyTHB(row.rawUc, true)}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-4">
                                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-sans-thai">
                                  <span className="w-2.5 h-2.5 rounded-xs bg-[#3B82F6]" />
                                  COCD:
                                </span>
                                <span className="font-semibold text-[#0F2A6B] dark:text-white">
                                  {formatCurrencyTHB(row.rawCocd, true)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-sans-thai">
                                  <span className="w-2.5 h-2.5 rounded-xs bg-[#38BDF8]" />
                                  SOCD:
                                </span>
                                <span className="font-semibold text-[#0F2A6B] dark:text-white">
                                  {formatCurrencyTHB(row.rawSocd, true)}
                                </span>
                              </div>

                              <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 font-bold text-[#1D4ED8] dark:text-[#38BDF8]">
                                <span className="font-sans-thai">
                                  ยอดรวม{row.isUcMissing ? ' (ไม่ครบ)' : ''}:
                                </span>
                                <span>
                                  {formatCurrencyTHB(row.displayedTotal, true)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />

                    {monthlyAverage > 0 && (
                      <ReferenceLine
                        y={monthlyAverage}
                        stroke="#F59E0B"
                        strokeDasharray="5 4"
                        strokeWidth={1.75}
                        label={{
                          value: `เฉลี่ย ฿${formatNumberTH(Math.round(monthlyAverage))}`,
                          position: 'insideTopRight',
                          fill: '#D97706',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      />
                    )}

                    <Bar
                      dataKey="SOCD"
                      stackId="monthStack"
                      fill="#38BDF8"
                      radius={[0, 0, 4, 4]}
                    >
                      {monthlyChartData.map((entry, idx) => (
                        <Cell
                          key={`socd-${idx}`}
                          fill={
                            entry.isUcMissing
                              ? 'url(#incompleteStripeSocd)'
                              : '#38BDF8'
                          }
                        />
                      ))}
                    </Bar>

                    <Bar
                      dataKey="COCD"
                      stackId="monthStack"
                      fill="#3B82F6"
                      label={
                        !hasUcColumn || !selectedSchemes.includes('UC')
                          ? renderIncompleteBarLabel
                          : undefined
                      }
                    >
                      {monthlyChartData.map((entry, idx) => (
                        <Cell
                          key={`cocd-${idx}`}
                          fill={
                            entry.isUcMissing
                              ? 'url(#incompleteStripeCocd)'
                              : '#3B82F6'
                          }
                        />
                      ))}
                    </Bar>

                    {hasUcColumn && selectedSchemes.includes('UC') && (
                      <Bar
                        dataKey="UC"
                        stackId="monthStack"
                        fill="#1E40AF"
                        radius={[6, 6, 0, 0]}
                        label={renderIncompleteBarLabel}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3) Combo Chart: ยอดเงินรายงวด (COCD & SOCD) + เส้นจำนวนผู้รับบริการรวม (Dual Y-Axis) */}
      {(effectiveIsDesktop ||
        mobileChartSubTab === 'ALL' ||
        mobileChartSubTab === 'PERIOD') && (
        <div className="bg-white dark:bg-[#112240] rounded-2xl p-4 sm:p-5 border border-blue-100/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display font-bold text-base text-[#0F2A6B] dark:text-white">
                กราฟผสมรายงวด: ยอดเงินเบิก (COCD &amp; SOCD) เทียบจำนวนผู้รับบริการ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                แกนซ้าย: จำนวนเงินรายงวด (บาท) · แกนขวา: จำนวนผู้รับบริการรวม (คน) · จุดสีเหลืองอำพันคืองวดที่พบความผิดปกติ (เช่น 20260201)
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-xs bg-[#3B82F6]" />
                ยอดเงิน COCD
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-xs bg-[#38BDF8]" />
                ยอดเงิน SOCD
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-4 h-0.5 bg-[#0EA5E9] inline-block" />
                จำนวนผู้รับบริการ (คน)
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                พบความผิดปกติ (20260201)
              </span>
            </div>
          </div>

          {!showCocdInCombo && !showSocdInCombo ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-center p-6 bg-[#F4F8FF] dark:bg-slate-900/50 rounded-xl border border-dashed border-blue-200 dark:border-slate-700">
              <p className="text-sm font-medium text-[#0F2A6B] dark:text-slate-200">
                ตารางรายงวดมีเฉพาะสิทธิ COCD และ SOCD (ขณะนี้คุณกรองเฉพาะสิทธิ UC)
              </p>
              <button
                type="button"
                onClick={onResetSchemeFilter}
                className="mt-3 min-h-[40px] px-4 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-medium hover:bg-[#1E40AF] transition-colors"
              >
                แสดงข้อมูลทุกสิทธิ
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[760px] h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={periodChartData}
                    margin={{ top: 20, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={gridStrokeColor}
                    />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fill: axisTextColor, fontSize: 11 }}
                      axisLine={{ stroke: gridStrokeColor }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="leftMoney"
                      tick={{ fill: axisTextColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1_000 ? `฿${(v / 1_000).toFixed(0)}k` : `฿${v}`
                      }
                    />
                    <YAxis
                      yAxisId="rightPatients"
                      orientation="right"
                      tick={{ fill: '#0EA5E9', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v} คน`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const p = payload[0].payload as (typeof periodChartData)[0];
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-blue-100 dark:border-slate-700 shadow-lg text-xs min-w-[260px]">
                            <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                              <div>
                                <div className="font-display font-bold text-sm text-[#0F2A6B] dark:text-white">
                                  งวด {p.id} · {p.fullLabel}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono-num">
                                  {p.cocdCode} / {p.socdCode}
                                </div>
                              </div>
                              {p.hasAnomaly && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold text-[11px]">
                                  <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                                  ผิดปกติ
                                </span>
                              )}
                            </div>

                            {p.isDuplicateSchemeValues && (
                              <div className="mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
                                ตรวจพบ SOCD และ COCD มีจำนวนคน ({p.cocdPatients} คน) และจำนวนเงิน ({formatCurrencyTHB(p.COCD, true)}) เท่ากันทุกตัวเลข
                              </div>
                            )}

                            <div className="space-y-1.5 font-mono-num">
                              {showCocdInCombo && (
                                <div className="p-2 rounded-lg bg-[#F4F8FF] dark:bg-slate-800/70">
                                  <div className="flex items-center justify-between font-semibold text-[#1D4ED8] dark:text-[#3B82F6]">
                                    <span>{p.cocdCode}</span>
                                    <span>{formatCurrencyTHB(p.COCD, true)}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                    <span>ผู้รับบริการ: {formatNumberTH(p.cocdPatients)} คน</span>
                                    <span>
                                      เฉลี่ย {formatNumberTH(p.cocdAvg, 2)} บาท/คน
                                    </span>
                                  </div>
                                </div>
                              )}

                              {showSocdInCombo && (
                                <div className="p-2 rounded-lg bg-sky-50/70 dark:bg-slate-800/70">
                                  <div className="flex items-center justify-between font-semibold text-[#0284C7] dark:text-[#38BDF8]">
                                    <span>{p.socdCode}</span>
                                    <span>{formatCurrencyTHB(p.SOCD, true)}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                    <span>ผู้รับบริการ: {formatNumberTH(p.socdPatients)} คน</span>
                                    <span>
                                      เฉลี่ย {formatNumberTH(p.socdAvg, 2)} บาท/คน
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold text-[#0F2A6B] dark:text-white">
                                <span className="font-sans-thai">
                                  รวมงวด ({formatNumberTH(p.totalPatients)} คน):
                                </span>
                                <span>{formatCurrencyTHB(p.totalAmount, true)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="font-sans-thai">เฉลี่ยรวมงวดนี้:</span>
                                <span>
                                  {formatNumberTH(p.combinedAvg, 2)} บาท/คน
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />

                    {showCocdInCombo && (
                      <Bar
                        yAxisId="leftMoney"
                        dataKey="COCD"
                        name="ยอดเงิน COCD"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                        barSize={12}
                      >
                        {periodChartData.map((entry, index) => (
                          <Cell
                            key={`c-bar-${index}`}
                            fill={entry.hasAnomaly ? '#F59E0B' : '#3B82F6'}
                          />
                        ))}
                      </Bar>
                    )}

                    {showSocdInCombo && (
                      <Bar
                        yAxisId="leftMoney"
                        dataKey="SOCD"
                        name="ยอดเงิน SOCD"
                        fill="#38BDF8"
                        radius={[4, 4, 0, 0]}
                        barSize={12}
                      >
                        {periodChartData.map((entry, index) => (
                          <Cell
                            key={`s-bar-${index}`}
                            fill={entry.hasAnomaly ? '#FBBF24' : '#38BDF8'}
                          />
                        ))}
                      </Bar>
                    )}

                    <Line
                      yAxisId="rightPatients"
                      type="monotone"
                      dataKey="totalPatients"
                      name="ผู้รับบริการรวม (คน)"
                      stroke="#0EA5E9"
                      strokeWidth={2.5}
                      dot={(dotProps: {
                        cx?: number;
                        cy?: number;
                        payload?: (typeof periodChartData)[0];
                      }) => {
                        const { cx = 0, cy = 0, payload } = dotProps;
                        if (payload?.hasAnomaly) {
                          return (
                            <circle
                              key={`dot-${payload.id}`}
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#F59E0B"
                              stroke="#FFFFFF"
                              strokeWidth={2}
                            />
                          );
                        }
                        return (
                          <circle
                            key={`dot-${payload?.id}`}
                            cx={cx}
                            cy={cy}
                            r={3.5}
                            fill="#0EA5E9"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                          />
                        );
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
