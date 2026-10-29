import {
  ActiveFetcherTier,
  DataQualityIssue,
  DataQualityReport,
  MonthlyRecord,
  ParsedSheetData,
  PeriodRecord,
  SheetSummaryRow,
} from '../types/claims';

export const FISCAL_MONTHS: {
  fiscalIndex: number;
  monthNum: number;
  nameThai: string;
  shortThai: string;
}[] = [
  { fiscalIndex: 0, monthNum: 10, nameThai: 'ตุลาคม', shortThai: 'ต.ค.' },
  { fiscalIndex: 1, monthNum: 11, nameThai: 'พฤศจิกายน', shortThai: 'พ.ย.' },
  { fiscalIndex: 2, monthNum: 12, nameThai: 'ธันวาคม', shortThai: 'ธ.ค.' },
  { fiscalIndex: 3, monthNum: 1, nameThai: 'มกราคม', shortThai: 'ม.ค.' },
  { fiscalIndex: 4, monthNum: 2, nameThai: 'กุมภาพันธ์', shortThai: 'ก.พ.' },
  { fiscalIndex: 5, monthNum: 3, nameThai: 'มีนาคม', shortThai: 'มี.ค.' },
  { fiscalIndex: 6, monthNum: 4, nameThai: 'เมษายน', shortThai: 'เม.ย.' },
  { fiscalIndex: 7, monthNum: 5, nameThai: 'พฤษภาคม', shortThai: 'พ.ค.' },
  { fiscalIndex: 8, monthNum: 6, nameThai: 'มิถุนายน', shortThai: 'มิ.ย.' },
  { fiscalIndex: 9, monthNum: 7, nameThai: 'กรกฎาคม', shortThai: 'ก.ค.' },
  { fiscalIndex: 10, monthNum: 8, nameThai: 'สิงหาคม', shortThai: 'ส.ค.' },
  { fiscalIndex: 11, monthNum: 9, nameThai: 'กันยายน', shortThai: 'ก.ย.' },
];

/**
 * RFC-4180 compliant CSV parser supporting commas and newlines inside quotes
 */
export function parseCsvToRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const text = csvText.replace(/^\uFEFF/, ''); // Strip UTF-8 BOM if present

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nextCh = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && nextCh === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' && nextCh === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Clean formatted number strings like "153,556", "฿1,503,200.00" -> number
 * Empty cells return null (never 0)
 */
export function cleanNumber(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed.toLowerCase() === 'null') {
    return null;
  }
  const cleaned = trimmed.replace(/[฿$,\sคนบาท]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse Period Code e.g. "COCD20251001" or "SOCD20260201"
 */
export function parsePeriodCode(code: string): {
  scheme: string;
  id: string;
  yearAD: number;
  yearBE: number;
  monthNum: number;
  periodNo: number;
  fiscalOrderIndex: number;
  monthNameThai: string;
  monthShortThai: string;
  periodLabelThai: string;
} | null {
  const trimmed = code.trim().toUpperCase();
  const match = trimmed.match(/^([A-Z]+)(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;

  const scheme = match[1];
  const yearAD = parseInt(match[2], 10);
  const monthNum = parseInt(match[3], 10);
  const periodNo = parseInt(match[4], 10);
  const id = `${match[2]}${match[3]}${match[4]}`;
  const yearBE = yearAD + 543;

  const monthMeta = FISCAL_MONTHS.find((m) => m.monthNum === monthNum) || {
    fiscalIndex: monthNum - 1,
    monthNum,
    nameThai: `เดือน ${monthNum}`,
    shortThai: `ด.${monthNum}`,
  };

  const fiscalOrderIndex = monthMeta.fiscalIndex * 10 + periodNo;
  const shortBE = String(yearBE).slice(-2);

  return {
    scheme,
    id,
    yearAD,
    yearBE,
    monthNum,
    periodNo,
    fiscalOrderIndex,
    monthNameThai: monthMeta.nameThai,
    monthShortThai: monthMeta.shortThai,
    periodLabelThai: `${monthMeta.shortThai} ${shortBE} (งวด ${periodNo})`,
  };
}

export function formatCurrencyTHB(val: number | null | undefined, showDecimals = false): string {
  if (val === null || val === undefined || Number.isNaN(val)) return 'ยังไม่มีข้อมูล';
  const hasFraction = Math.abs(val - Math.round(val)) > 0.005;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: showDecimals || hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatNumberTH(val: number | null | undefined, decimals = 0): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  const hasFraction = Math.abs(val - Math.round(val)) > 0.005;
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals > 0 ? decimals : hasFraction ? 2 : 0,
    maximumFractionDigits: decimals > 0 ? decimals : 2,
  }).format(val);
}

/**
 * Simple deterministic string hash for detecting sheet updates
 */
export function computeDataHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * Parse 2D array of rows into structured, validated ParsedSheetData
 */
export function parseSheetRows(
  rows: string[][],
  options: {
    spreadsheetId: string;
    sheetName: string;
    activeTier: ActiveFetcherTier;
  }
): ParsedSheetData {
  const fetchedAt = new Date().toISOString();

  if (!rows || rows.length === 0) {
    return createInvalidStructureData(
      options,
      'ไม่พบข้อมูลในตาราง (ตารางว่างเปล่า)'
    );
  }

  // Locate header row (usually row 0, or first non-empty row)
  const headerRowIndex = rows.findIndex((r) =>
    r.some((cell) => cell && cell.trim().length > 0)
  );

  if (headerRowIndex === -1) {
    return createInvalidStructureData(
      options,
      'ไม่พบแถวหัวตารางใน Google Sheet'
    );
  }

  const headerRow = rows[headerRowIndex].map((c) => (c || '').trim());

  // Validate Table 1 (Columns A-G) and Table 2 (Columns I-M) headers
  const colAHeader = headerRow[0] || '';
  const colDHeader = headerRow[3] || '';
  const colGHeader = headerRow[6] || '';
  const colIHeader = headerRow[8] || '';
  const colJHeader = headerRow[9] || '';
  const colKHeader = headerRow[10] || '';

  const isTable1Valid =
    colAHeader.includes('COCD') &&
    colDHeader.includes('SOCD') &&
    colGHeader.includes('รวม');

  const isTable2Valid =
    colIHeader.includes('เดือน') &&
    colJHeader.includes('SOCD') &&
    colKHeader.includes('COCD');

  if (!isTable1Valid || !isTable2Valid) {
    return createInvalidStructureData(
      options,
      `โครงสร้าง Sheet เปลี่ยนไป: หัวตารางไม่ตรงตามรูปแบบที่กำหนด (พบคอลัมน์ A="${colAHeader}", D="${colDHeader}", I="${colIHeader}")`
    );
  }

  // Detect whether Table 2 has UC column at index 11 (L) or if index 11 is "รวม" (like in ฟอกไต 2568)
  const colLHeader = headerRow[11] || '';
  const colMHeader = headerRow[12] || '';
  const hasUcColumn = colLHeader.toUpperCase().includes('UC');
  const ucColIndex = hasUcColumn ? 11 : -1;
  const monthlyTotalColIndex = hasUcColumn ? 12 : colLHeader.includes('รวม') ? 11 : 12;

  const rawPeriods: PeriodRecord[] = [];
  const rawMonths: MonthlyRecord[] = [];
  let sheetSummaryRow: SheetSummaryRow | null = null;

  // Iterate all rows after headerRowIndex (whole sheet scan, skipping empty cells)
  for (let rIdx = headerRowIndex + 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    if (!row || row.length === 0) continue;

    // --- Parse Table 1 (Columns A-G: index 0..6) ---
    const cocdCodeRaw = (row[0] || '').trim();
    const socdCodeRaw = (row[3] || '').trim();

    if (cocdCodeRaw || socdCodeRaw) {
      const parsedCode =
        parsePeriodCode(cocdCodeRaw) || parsePeriodCode(socdCodeRaw);

      if (parsedCode) {
        const cocdPatients = cleanNumber(row[1]);
        const cocdAmount = cleanNumber(row[2]);
        const socdPatients = cleanNumber(row[4]);
        const socdAmount = cleanNumber(row[5]);
        const sheetTotalAmount = cleanNumber(row[6]);

        const calculatedTotalAmount = (cocdAmount ?? 0) + (socdAmount ?? 0);
        const totalPatients = (cocdPatients ?? 0) + (socdPatients ?? 0);

        const cocdAvgPerPatient =
          cocdPatients && cocdPatients > 0 && cocdAmount !== null
            ? cocdAmount / cocdPatients
            : null;

        const socdAvgPerPatient =
          socdPatients && socdPatients > 0 && socdAmount !== null
            ? socdAmount / socdPatients
            : null;

        const combinedAvgPerPatient =
          totalPatients > 0 ? calculatedTotalAmount / totalPatients : null;

        const isDuplicateSchemeValues =
          cocdPatients !== null &&
          socdPatients !== null &&
          cocdAmount !== null &&
          socdAmount !== null &&
          cocdPatients === socdPatients &&
          Math.abs(cocdAmount - socdAmount) < 0.01;

        const hasRowSumMismatch =
          sheetTotalAmount !== null &&
          Math.abs(sheetTotalAmount - calculatedTotalAmount) > 0.5;

        rawPeriods.push({
          id: parsedCode.id,
          rowNumber: rIdx + 1,
          fiscalOrderIndex: parsedCode.fiscalOrderIndex,
          yearAD: parsedCode.yearAD,
          yearBE: parsedCode.yearBE,
          monthNum: parsedCode.monthNum,
          monthNameThai: parsedCode.monthNameThai,
          monthShortThai: parsedCode.monthShortThai,
          periodNo: parsedCode.periodNo,
          periodLabelThai: parsedCode.periodLabelThai,
          cocdCode: cocdCodeRaw || `COCD${parsedCode.id}`,
          cocdPatients,
          cocdAmount,
          cocdAvgPerPatient,
          socdCode: socdCodeRaw || `SOCD${parsedCode.id}`,
          socdPatients,
          socdAmount,
          socdAvgPerPatient,
          sheetTotalAmount,
          calculatedTotalAmount,
          totalPatients,
          combinedAvgPerPatient,
          isDuplicateSchemeValues,
          isCocdOutlier: false,
          isSocdOutlier: false,
          cocdDeviationPct: null,
          socdDeviationPct: null,
          hasRowSumMismatch,
        });
      }
    }

    // --- Parse Table 2 (Columns I-M: index 8..12) ---
    const monthLabelRaw = (row[8] || '').trim();
    if (monthLabelRaw) {
      const socdVal = cleanNumber(row[9]);
      const cocdVal = cleanNumber(row[10]);
      const ucVal = ucColIndex !== -1 ? cleanNumber(row[ucColIndex]) : null;
      const totalVal = cleanNumber(row[monthlyTotalColIndex]);

      if (monthLabelRaw === 'รวม' || monthLabelRaw.includes('รวมทั้งสิ้น')) {
        // Summary row at the bottom of Table 2 — do NOT count as a month!
        sheetSummaryRow = {
          socdTotal: socdVal,
          cocdTotal: cocdVal,
          ucTotal: ucVal,
          grandTotal: totalVal,
        };
      } else {
        const matchedMonth = FISCAL_MONTHS.find(
          (m) =>
            m.nameThai === monthLabelRaw ||
            monthLabelRaw.includes(m.nameThai) ||
            m.shortThai === monthLabelRaw
        );

        const fiscalMonthIndex = matchedMonth ? matchedMonth.fiscalIndex : rawMonths.length;
        const monthNum = matchedMonth ? matchedMonth.monthNum : ((rawMonths.length + 9) % 12) + 1;
        const monthNameThai = matchedMonth ? matchedMonth.nameThai : monthLabelRaw;
        const monthShortThai = matchedMonth ? matchedMonth.shortThai : monthLabelRaw;

        const calculatedTotalAmount =
          (socdVal ?? 0) + (cocdVal ?? 0) + (ucVal ?? 0);

        const isUcMissing = hasUcColumn && ucVal === null;
        const isIncomplete =
          isUcMissing || socdVal === null || cocdVal === null;

        const hasMonthlySumMismatch =
          totalVal !== null &&
          Math.abs(totalVal - calculatedTotalAmount) > 0.5;

        rawMonths.push({
          id: `month-${monthNum}`,
          rowNumber: rIdx + 1,
          fiscalMonthIndex,
          monthNum,
          monthNameThai,
          monthShortThai,
          socdAmount: socdVal,
          cocdAmount: cocdVal,
          ucAmount: ucVal,
          sheetTotalAmount: totalVal,
          calculatedTotalAmount,
          isUcMissing,
          isIncomplete,
          hasMonthlySumMismatch,
          period1And2CocdSum: 0,
          period1And2SocdSum: 0,
          cocdCrossTableDiff: 0,
          socdCrossTableDiff: 0,
        });
      }
    }
  }

  // Sort periods by fiscal year order (Oct -> Sep, period 01 -> 02)
  const periods = [...rawPeriods].sort(
    (a, b) => a.fiscalOrderIndex - b.fiscalOrderIndex
  );

  // Sort months by fiscal year order (Oct -> Sep)
  const months = [...rawMonths].sort(
    (a, b) => a.fiscalMonthIndex - b.fiscalMonthIndex
  );

  // Compute mean Baht/person for COCD and SOCD to detect ±25% outliers
  const validCocdAvgs = periods
    .map((p) => p.cocdAvgPerPatient)
    .filter((v): v is number => v !== null && v > 0);
  const validSocdAvgs = periods
    .map((p) => p.socdAvgPerPatient)
    .filter((v): v is number => v !== null && v > 0);

  const meanCocdPerPatient =
    validCocdAvgs.length > 0
      ? validCocdAvgs.reduce((acc, v) => acc + v, 0) / validCocdAvgs.length
      : 0;
  const meanSocdPerPatient =
    validSocdAvgs.length > 0
      ? validSocdAvgs.reduce((acc, v) => acc + v, 0) / validSocdAvgs.length
      : 0;

  const issues: DataQualityIssue[] = [];

  // Check (ค): Period outliers (±25%) and duplicate COCD == SOCD values
  for (const p of periods) {
    if (p.cocdAvgPerPatient !== null && meanCocdPerPatient > 0) {
      const devPct =
        ((p.cocdAvgPerPatient - meanCocdPerPatient) / meanCocdPerPatient) * 100;
      p.cocdDeviationPct = devPct;
      if (Math.abs(devPct) > 25) {
        p.isCocdOutlier = true;
        issues.push({
          id: `outlier-cocd-${p.id}`,
          category: 'ANOMALY_OUTLIER',
          severity: 'warning',
          title: `ค่าเฉลี่ยบาท/คน สิทธิ COCD ผิดปกติเกิน ±25% (งวด ${p.id})`,
          description: `งวด ${p.cocdCode} (${p.periodLabelThai}) มีค่าเฉลี่ย ${formatNumberTH(p.cocdAvgPerPatient, 2)} บาท/คน ต่างจากค่าเฉลี่ยรวม (${formatNumberTH(meanCocdPerPatient, 2)} บาท/คน) คิดเป็น ${devPct > 0 ? '+' : ''}${devPct.toFixed(1)}%`,
          periodOrMonth: p.periodLabelThai,
          expectedValue: `${formatNumberTH(meanCocdPerPatient, 2)} บาท/คน`,
          actualValue: `${formatNumberTH(p.cocdAvgPerPatient, 2)} บาท/คน (${devPct > 0 ? '+' : ''}${devPct.toFixed(1)}%)`,
        });
      }
    }

    if (p.socdAvgPerPatient !== null && meanSocdPerPatient > 0) {
      const devPct =
        ((p.socdAvgPerPatient - meanSocdPerPatient) / meanSocdPerPatient) * 100;
      p.socdDeviationPct = devPct;
      if (Math.abs(devPct) > 25) {
        p.isSocdOutlier = true;
        issues.push({
          id: `outlier-socd-${p.id}`,
          category: 'ANOMALY_OUTLIER',
          severity: 'warning',
          title: `ค่าเฉลี่ยบาท/คน สิทธิ SOCD ผิดปกติเกิน ±25% (งวด ${p.id})`,
          description: `งวด ${p.socdCode} (${p.periodLabelThai}) มีค่าเฉลี่ย ${formatNumberTH(p.socdAvgPerPatient, 2)} บาท/คน ต่างจากค่าเฉลี่ยรวม (${formatNumberTH(meanSocdPerPatient, 2)} บาท/คน) คิดเป็น ${devPct > 0 ? '+' : ''}${devPct.toFixed(1)}%`,
          periodOrMonth: p.periodLabelThai,
          expectedValue: `${formatNumberTH(meanSocdPerPatient, 2)} บาท/คน`,
          actualValue: `${formatNumberTH(p.socdAvgPerPatient, 2)} บาท/คน (${devPct > 0 ? '+' : ''}${devPct.toFixed(1)}%)`,
        });
      }
    }

    if (p.isDuplicateSchemeValues) {
      issues.push({
        id: `dup-scheme-${p.id}`,
        category: 'ANOMALY_DUPLICATE',
        severity: 'warning',
        title: `พบข้อมูล SOCD และ COCD ซ้ำกันทุกตัวเลขในงวด ${p.id}`,
        description: `งวด ${p.id} (${p.periodLabelThai}) มีจำนวนผู้รับบริการ (${p.cocdPatients} คน) และจำนวนเงิน (${formatCurrencyTHB(p.cocdAmount, true)}) ของสิทธิ SOCD และ COCD เท่ากันทุกประการ ควรตรวจสอบว่าคัดลอกตัวเลขซ้ำหรือไม่`,
        periodOrMonth: `งวด ${p.id} (${p.periodLabelThai})`,
        expectedValue: 'ข้อมูลแยกตามสิทธิจริง',
        actualValue: `COCD = SOCD (${p.cocdPatients} คน, ${formatCurrencyTHB(p.cocdAmount, true)})`,
      });
    }

    if (p.hasRowSumMismatch) {
      issues.push({
        id: `row-sum-${p.id}`,
        category: 'CROSS_TABLE',
        severity: 'error',
        title: `ผลรวมรายงวด ${p.id} ไม่ตรงกับคอลัมน์รวมเงิน (G)`,
        description: `COCD + SOCD คำนวณได้ ${formatCurrencyTHB(p.calculatedTotalAmount, true)} แต่ใน Sheet คอลัมน์ G ระบุ ${formatCurrencyTHB(p.sheetTotalAmount, true)}`,
        periodOrMonth: `งวด ${p.id}`,
        expectedValue: formatCurrencyTHB(p.calculatedTotalAmount, true),
        actualValue: formatCurrencyTHB(p.sheetTotalAmount, true),
      });
    }
  }

  // Check (ก): Cross-table reconciliation (Sum of 2 periods in Table 1 vs Monthly total in Table 2)
  let crossTablePassed = true;
  const incompleteMonths: string[] = [];

  for (const m of months) {
    const monthPeriods = periods.filter((p) => p.monthNum === m.monthNum);
    const pCocdSum = monthPeriods.reduce((acc, p) => acc + (p.cocdAmount ?? 0), 0);
    const pSocdSum = monthPeriods.reduce((acc, p) => acc + (p.socdAmount ?? 0), 0);

    m.period1And2CocdSum = pCocdSum;
    m.period1And2SocdSum = pSocdSum;
    m.cocdCrossTableDiff = pCocdSum - (m.cocdAmount ?? 0);
    m.socdCrossTableDiff = pSocdSum - (m.socdAmount ?? 0);

    if (monthPeriods.length > 0 && m.cocdAmount !== null && Math.abs(m.cocdCrossTableDiff) > 0.5) {
      crossTablePassed = false;
      issues.push({
        id: `cross-cocd-${m.monthNum}`,
        category: 'CROSS_TABLE',
        severity: 'error',
        title: `ยอดรวม 2 งวด COCD เดือน${m.monthNameThai} ไม่ตรงกับตารางสรุปรายเดือน`,
        description: `ผลรวมรายงวด COCD ในตารางที่ 1 ได้ ${formatCurrencyTHB(pCocdSum, true)} แต่ตารางที่ 2 (คอลัมน์ K) ระบุ ${formatCurrencyTHB(m.cocdAmount, true)}`,
        periodOrMonth: m.monthNameThai,
        expectedValue: formatCurrencyTHB(pCocdSum, true),
        actualValue: formatCurrencyTHB(m.cocdAmount, true),
      });
    }

    if (monthPeriods.length > 0 && m.socdAmount !== null && Math.abs(m.socdCrossTableDiff) > 0.5) {
      crossTablePassed = false;
      issues.push({
        id: `cross-socd-${m.monthNum}`,
        category: 'CROSS_TABLE',
        severity: 'error',
        title: `ยอดรวม 2 งวด SOCD เดือน${m.monthNameThai} ไม่ตรงกับตารางสรุปรายเดือน`,
        description: `ผลรวมรายงวด SOCD ในตารางที่ 1 ได้ ${formatCurrencyTHB(pSocdSum, true)} แต่ตารางที่ 2 (คอลัมน์ J) ระบุ ${formatCurrencyTHB(m.socdAmount, true)}`,
        periodOrMonth: m.monthNameThai,
        expectedValue: formatCurrencyTHB(pSocdSum, true),
        actualValue: formatCurrencyTHB(m.socdAmount, true),
      });
    }

    if (m.isUcMissing) {
      incompleteMonths.push(m.monthNameThai);
      issues.push({
        id: `incomplete-uc-${m.monthNum}`,
        category: 'INCOMPLETE_DATA',
        severity: 'info',
        title: `เดือน${m.monthNameThai}: ยังไม่มีข้อมูลสิทธิ UC`,
        description: `ช่องข้อมูล UC ของเดือน${m.monthNameThai} ยังว่างอยู่ ระบบจึงแสดง "ยังไม่มีข้อมูล" (ไม่นับเป็น 0) และติดป้ายกำกับ "ข้อมูลยังไม่ครบ" ที่ยอดรวมของเดือนนี้`,
        periodOrMonth: m.monthNameThai,
        expectedValue: 'รอการบันทึกยอด UC',
        actualValue: 'ยังไม่มีข้อมูล (ว่าง)',
      });
    }
  }

  // Calculate App Grand Totals across all months
  const totalSocd = months.reduce((acc, m) => acc + (m.socdAmount ?? 0), 0);
  const totalCocd = months.reduce((acc, m) => acc + (m.cocdAmount ?? 0), 0);
  const totalUc = months.reduce((acc, m) => acc + (m.ucAmount ?? 0), 0);
  const calculatedGrandTotal = totalSocd + totalCocd + totalUc;

  const totalCocdPatients = periods.reduce((acc, p) => acc + (p.cocdPatients ?? 0), 0);
  const totalSocdPatients = periods.reduce((acc, p) => acc + (p.socdPatients ?? 0), 0);
  const totalPatients = totalCocdPatients + totalSocdPatients;

  // Check (ข): Grand total calculated by app vs "รวม" row in Sheet
  const sheetGrandTotal = sheetSummaryRow?.grandTotal ?? null;
  const grandTotalDiff =
    sheetGrandTotal !== null ? calculatedGrandTotal - sheetGrandTotal : 0;
  const grandTotalPassed =
    sheetGrandTotal === null || Math.abs(grandTotalDiff) <= 0.5;

  if (!grandTotalPassed && sheetGrandTotal !== null) {
    issues.push({
      id: 'grand-total-mismatch',
      category: 'GRAND_TOTAL',
      severity: 'error',
      title: 'ยอดรวมทั้งปีงบประมาณไม่ตรงกับแถว "รวม" ใน Sheet',
      description: `แอปคำนวณยอดรวมได้ ${formatCurrencyTHB(calculatedGrandTotal, true)} แต่แถว "รวม" ใน Sheet ระบุ ${formatCurrencyTHB(sheetGrandTotal, true)} (ส่วนต่าง ${formatCurrencyTHB(Math.abs(grandTotalDiff), true)})`,
      periodOrMonth: 'รวมทั้งปีงบประมาณ',
      expectedValue: formatCurrencyTHB(calculatedGrandTotal, true),
      actualValue: formatCurrencyTHB(sheetGrandTotal, true),
    });
  }

  // Derive Fiscal Year Label
  const yearMatch = options.sheetName.match(/(\d{4})/);
  const fyBE = yearMatch ? parseInt(yearMatch[1], 10) : 2569;
  const prevShort = String(fyBE - 1).slice(-2);
  const currShort = String(fyBE).slice(-2);
  const fiscalYearLabel = `ปีงบประมาณ ${fyBE} (ต.ค. ${prevShort} – ก.ย. ${currShort})`;

  // Deterministic hash of parsed values so polling detects any cell edit, row addition, or deletion
  const hashPayload = JSON.stringify({
    sheetName: options.sheetName,
    periods: periods.map((p) => [
      p.cocdCode,
      p.cocdPatients,
      p.cocdAmount,
      p.socdCode,
      p.socdPatients,
      p.socdAmount,
      p.sheetTotalAmount,
    ]),
    months: months.map((m) => [
      m.monthNameThai,
      m.socdAmount,
      m.cocdAmount,
      m.ucAmount,
      m.sheetTotalAmount,
    ]),
    sheetSummaryRow,
  });

  const dataHash = computeDataHash(hashPayload);

  const qualityReport: DataQualityReport = {
    isStructureValid: true,
    structureErrorMessage: null,
    crossTablePassed,
    grandTotalPassed,
    calculatedGrandTotal,
    sheetGrandTotal,
    grandTotalDiff,
    meanCocdPerPatient,
    meanSocdPerPatient,
    incompleteMonths,
    issues,
  };

  return {
    spreadsheetId: options.spreadsheetId,
    sheetName: options.sheetName,
    fiscalYearLabel,
    hasUcColumn,
    periods,
    months,
    sheetSummaryRow,
    calculatedTotals: {
      socd: totalSocd,
      cocd: totalCocd,
      uc: totalUc,
      grandTotal: calculatedGrandTotal,
      totalCocdPatients,
      totalSocdPatients,
      totalPatients,
    },
    qualityReport,
    dataHash,
    fetchedAt,
    activeTier: options.activeTier,
  };
}

function createInvalidStructureData(
  options: {
    spreadsheetId: string;
    sheetName: string;
    activeTier: ActiveFetcherTier;
  },
  errorMessage: string
): ParsedSheetData {
  return {
    spreadsheetId: options.spreadsheetId,
    sheetName: options.sheetName,
    fiscalYearLabel: options.sheetName,
    hasUcColumn: true,
    periods: [],
    months: [],
    sheetSummaryRow: null,
    calculatedTotals: {
      socd: 0,
      cocd: 0,
      uc: 0,
      grandTotal: 0,
      totalCocdPatients: 0,
      totalSocdPatients: 0,
      totalPatients: 0,
    },
    qualityReport: {
      isStructureValid: false,
      structureErrorMessage: errorMessage,
      crossTablePassed: false,
      grandTotalPassed: false,
      calculatedGrandTotal: 0,
      sheetGrandTotal: null,
      grandTotalDiff: 0,
      meanCocdPerPatient: 0,
      meanSocdPerPatient: 0,
      incompleteMonths: [],
      issues: [],
    },
    dataHash: 'invalid',
    fetchedAt: new Date().toISOString(),
    activeTier: options.activeTier,
  };
}
