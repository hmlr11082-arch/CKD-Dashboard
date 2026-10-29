import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts';
import {
  ClaimScheme,
  MonthlyRecord,
  PeriodRecord,
  SheetSummaryRow,
} from '../types/claims';
import { formatCurrencyTHB, formatNumberTH } from '../utils/csvParser';

interface KpiCardsProps {
  months: MonthlyRecord[];
  periods: PeriodRecord[];
  selectedSchemes: ClaimScheme[];
  sheetSummaryRow: SheetSummaryRow | null;
  grandTotalPassed: boolean;
  grandTotalDiff: number;
  effectiveIsDesktop: boolean;
  flashKey: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  months,
  periods,
  selectedSchemes,
  sheetSummaryRow,
  grandTotalPassed,
  grandTotalDiff,
  effectiveIsDesktop,
  flashKey,
}) => {
  // Compute filtered monthly amount helper
  const getFilteredMonthTotal = (m: MonthlyRecord): number => {
    let sum = 0;
    if (selectedSchemes.includes('UC') && m.ucAmount !== null) sum += m.ucAmount;
    if (selectedSchemes.includes('COCD') && m.cocdAmount !== null) sum += m.cocdAmount;
    if (selectedSchemes.includes('SOCD') && m.socdAmount !== null) sum += m.socdAmount;
    return sum;
  };

  const getFilteredPeriodAmount = (p: PeriodRecord): number => {
    let sum = 0;
    if (selectedSchemes.includes('COCD') && p.cocdAmount !== null) sum += p.cocdAmount;
    if (selectedSchemes.includes('SOCD') && p.socdAmount !== null) sum += p.socdAmount;
    return sum;
  };

  const getFilteredPeriodPatients = (p: PeriodRecord): number => {
    let sum = 0;
    if (selectedSchemes.includes('COCD') && p.cocdPatients !== null) sum += p.cocdPatients;
    if (selectedSchemes.includes('SOCD') && p.socdPatients !== null) sum += p.socdPatients;
    return sum;
  };

  // 1. Fiscal Year Total
  const totalFiscalAmount = months.reduce(
    (acc, m) => acc + getFilteredMonthTotal(m),
    0
  );

  const isAllSchemesSelected = selectedSchemes.length === 3;

  // 2. Latest month with data & % vs previous month
  const monthsWithData = months.filter((m) => getFilteredMonthTotal(m) > 0);
  const latestMonth =
    monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1] : null;
  const prevMonth =
    monthsWithData.length > 1 ? monthsWithData[monthsWithData.length - 2] : null;

  const latestMonthAmount = latestMonth ? getFilteredMonthTotal(latestMonth) : 0;
  const prevMonthAmount = prevMonth ? getFilteredMonthTotal(prevMonth) : 0;
  const monthMoMPct =
    prevMonthAmount > 0
      ? ((latestMonthAmount - prevMonthAmount) / prevMonthAmount) * 100
      : null;

  // 3. Latest period patient count (COCD + SOCD)
  const latestPeriod = periods.length > 0 ? periods[periods.length - 1] : null;
  const prevPeriod = periods.length > 1 ? periods[periods.length - 2] : null;
  const latestPeriodPatients = latestPeriod
    ? getFilteredPeriodPatients(latestPeriod)
    : 0;
  const prevPeriodPatients = prevPeriod ? getFilteredPeriodPatients(prevPeriod) : 0;
  const periodPatientsDiff =
    prevPeriod ? latestPeriodPatients - prevPeriodPatients : 0;

  // 4. Average Baht / Patient across filtered periods (COCD & SOCD)
  const totalPeriodClaimAmount = periods.reduce(
    (acc, p) => acc + getFilteredPeriodAmount(p),
    0
  );
  const totalPeriodPatientsCount = periods.reduce(
    (acc, p) => acc + getFilteredPeriodPatients(p),
    0
  );
  const overallAvgPerPatient =
    totalPeriodPatientsCount > 0
      ? totalPeriodClaimAmount / totalPeriodPatientsCount
      : 0;

  const cocdTotalAmt = periods.reduce((acc, p) => acc + (p.cocdAmount ?? 0), 0);
  const cocdTotalPts = periods.reduce((acc, p) => acc + (p.cocdPatients ?? 0), 0);
  const cocdAvg = cocdTotalPts > 0 ? cocdTotalAmt / cocdTotalPts : 0;

  const socdTotalAmt = periods.reduce((acc, p) => acc + (p.socdAmount ?? 0), 0);
  const socdTotalPts = periods.reduce((acc, p) => acc + (p.socdPatients ?? 0), 0);
  const socdAvg = socdTotalPts > 0 ? socdTotalAmt / socdTotalPts : 0;

  // Sparkline datasets
  const monthlySparkData = months.map((m) => ({
    name: m.monthShortThai,
    value: getFilteredMonthTotal(m),
  }));

  const periodPatientsSparkData = periods.map((p) => ({
    name: p.id,
    value: getFilteredPeriodPatients(p),
  }));

  const periodAvgSparkData = periods.map((p) => {
    const pts = getFilteredPeriodPatients(p);
    const amt = getFilteredPeriodAmount(p);
    return {
      name: p.id,
      value: pts > 0 ? Math.round(amt / pts) : 0,
    };
  });

  const containerClass = effectiveIsDesktop
    ? 'grid grid-cols-4 gap-4'
    : 'flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 custom-scrollbar -mx-3 px-3';

  const cardWidthClass = effectiveIsDesktop
    ? 'w-full'
    : 'min-w-[275px] sm:min-w-[300px] snap-start shrink-0';

  return (
    <section aria-label="ตัวชี้วัดหลัก (KPI)" className={containerClass}>
      {/* Card 1: ยอดรวมปีงบประมาณ (Primary Gradient Card) */}
      <div
        className={`${cardWidthClass} rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#1D4ED8] via-[#1E40AF] to-[#0284C7] text-white shadow-sm flex flex-col justify-between relative overflow-hidden`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-blue-100">
              ยอดรวมปีงบประมาณ
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4 text-sky-200" />
            </div>
          </div>

          <div
            key={`kpi1-${flashKey}`}
            className="text-xl sm:text-2xl font-display font-bold font-mono-num tracking-tight animate-number-flash"
          >
            {formatCurrencyTHB(totalFiscalAmount, true)}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-100">
            {isAllSchemesSelected && sheetSummaryRow?.grandTotal !== null ? (
              grandTotalPassed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
                  <span className="truncate">
                    ตรงกับแถว &ldquo;รวม&rdquo; ของ Sheet ทุกบาท
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate text-amber-200">
                    ต่างจากแถวรวม {formatCurrencyTHB(Math.abs(grandTotalDiff), true)}
                  </span>
                </>
              )
            ) : (
              <span className="truncate">
                คำนวณตามตัวกรอง ({selectedSchemes.join(', ')})
              </span>
            )}
          </div>
        </div>

        <div className="h-10 mt-3 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySparkData}>
              <defs>
                <linearGradient id="spark1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E0F2FE" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#E0F2FE" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#BAE6FD"
                strokeWidth={2}
                fill="url(#spark1)"
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card 2: ยอดเดือนล่าสุดที่มีข้อมูล */}
      <div
        className={`${cardWidthClass} rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#112240] border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
              ยอดเดือนล่าสุด ({latestMonth ? latestMonth.monthNameThai : '—'})
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] dark:bg-blue-950/60 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
            </div>
          </div>

          <div
            key={`kpi2-${flashKey}`}
            className="text-xl sm:text-2xl font-display font-bold font-mono-num text-[#0F2A6B] dark:text-white tracking-tight animate-number-flash"
          >
            {latestMonth ? formatCurrencyTHB(latestMonthAmount, true) : '—'}
          </div>

          <div className="mt-2 flex items-center flex-wrap gap-1.5 text-xs">
            {monthMoMPct !== null && (
              <span
                className={`inline-flex items-center gap-0.5 font-mono-num font-semibold ${
                  monthMoMPct >= 0
                    ? 'text-[#16A34A] dark:text-[#22C55E]'
                    : 'text-[#F59E0B]'
                }`}
              >
                {monthMoMPct >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {monthMoMPct >= 0 ? '+' : ''}
                {monthMoMPct.toFixed(1)}%
              </span>
            )}
            <span className="text-slate-500 dark:text-slate-400">
              เทียบ {prevMonth ? prevMonth.monthShortThai : 'เดือนก่อน'}
            </span>
            {latestMonth?.isIncomplete && selectedSchemes.includes('UC') && (
              <span className="text-[#F59E0B] font-medium">
                · ข้อมูลยังไม่ครบ (รอ UC)
              </span>
            )}
          </div>
        </div>

        <div className="h-10 mt-3 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySparkData}>
              <defs>
                <linearGradient id="spark2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#spark2)"
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card 3: จำนวนผู้รับบริการงวดล่าสุด (COCD+SOCD) */}
      <div
        className={`${cardWidthClass} rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#112240] border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
              ผู้รับบริการงวดล่าสุด ({latestPeriod ? `งวด ${latestPeriod.id}` : '—'})
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] dark:bg-blue-950/60 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#0EA5E9]" />
            </div>
          </div>

          <div
            key={`kpi3-${flashKey}`}
            className="text-xl sm:text-2xl font-display font-bold font-mono-num text-[#0F2A6B] dark:text-white tracking-tight animate-number-flash"
          >
            {latestPeriod ? `${formatNumberTH(latestPeriodPatients)} คน` : '—'}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            {latestPeriod ? (
              <>
                <span className="font-mono-num">
                  COCD {formatNumberTH(latestPeriod.cocdPatients)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">
                  SOCD {formatNumberTH(latestPeriod.socdPatients)}
                </span>
                {prevPeriod && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-mono-num font-medium ${
                        periodPatientsDiff >= 0
                          ? 'text-[#1D4ED8] dark:text-[#38BDF8]'
                          : 'text-slate-500'
                      }`}
                    >
                      ({periodPatientsDiff >= 0 ? '+' : ''}
                      {periodPatientsDiff} คน)
                    </span>
                  </>
                )}
              </>
            ) : (
              <span>ไม่มีข้อมูลงวด</span>
            )}
          </div>
        </div>

        <div className="h-10 mt-3 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={periodPatientsSparkData}>
              <defs>
                <linearGradient id="spark3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0EA5E9"
                strokeWidth={2}
                fill="url(#spark3)"
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card 4: เฉลี่ยบาท/คน */}
      <div
        className={`${cardWidthClass} rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#112240] border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
              เฉลี่ยบาท/คน (รายงวด COCD+SOCD)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] dark:bg-blue-950/60 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
            </div>
          </div>

          <div
            key={`kpi4-${flashKey}`}
            className="text-xl sm:text-2xl font-display font-bold font-mono-num text-[#0F2A6B] dark:text-white tracking-tight animate-number-flash"
          >
            {overallAvgPerPatient > 0
              ? `${formatCurrencyTHB(overallAvgPerPatient, false)}/คน`
              : '—'}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 truncate">
            <span className="font-mono-num">
              COCD ฿{formatNumberTH(Math.round(cocdAvg))}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              SOCD ฿{formatNumberTH(Math.round(socdAvg))}
            </span>
          </div>
        </div>

        <div className="h-10 mt-3 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={periodAvgSparkData}>
              <defs>
                <linearGradient id="spark4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#1E40AF"
                strokeWidth={2}
                fill="url(#spark4)"
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
