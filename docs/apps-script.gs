/**
 * ============================================================================
 * Google Apps Script สำหรับระบบ "Dashboard การส่งเบิกค่าฟอกไต" (ระดับที่ 3)
 * ============================================================================
 * ไฟล์นี้ใช้สำหรับสร้าง Web App เพื่อส่งข้อมูลจาก Google Sheets ออกมาเป็น JSON
 * กรณีที่เครือข่ายของผู้ใช้บล็อกการดึงข้อมูลผ่าน gviz CSV (ระดับ 1) หรือ Published CSV (ระดับ 2)
 *
 * ----------------------------------------------------------------------------
 * ขั้นตอนการติดตั้งและ Deploy (ทำเพียงครั้งเดียว):
 * ----------------------------------------------------------------------------
 * 1. เปิดไฟล์ Google Sheet "การส่งเบิกฟอกไต"
 *    (ID: 1shG_tr85INBLD_Vvc56SG6BSQte6z4U56uWVTdOogy4)
 * 2. ไปที่เมนูด้านบน เลือก "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดเดิมในไฟล์ Code.gs ออกทั้งหมด แล้วคัดลอกโค้ดในไฟล์นี้ไปวางแทน
 * 4. กดปุ่มบันทึก (ไอคอนแผ่นดิสก์ หรือ Ctrl+S / Cmd+S)
 * 5. กดปุ่มสีน้ำเงินมุมขวาบน "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. กดไอคอนรูปเฟืองข้างคำว่า "เลือกประเภท" (Select type) แล้วเลือก "เว็บแอป" (Web app)
 * 7. ตั้งค่าดังนี้:
 *    - คำอธิบาย (Description): API ข้อมูลการส่งเบิกค่าฟอกไต
 *    - ดำเนินการในฐานะ (Execute as): "ฉัน" (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone) <-- สำคัญมาก เพื่อให้เรียกได้โดยไม่ใช้ OAuth
 * 8. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) แล้วอนุญาตสิทธิ์ (Authorize access) ให้เรียบร้อย
 * 9. คัดลอก "URL ของเว็บแอป" (Web app URL ที่ลงท้ายด้วย /exec)
 * 10. นำ URL ไปวางในหน้า "ตั้งค่า" (Settings) > ช่อง "URL ของ Google Apps Script (ระดับ 3)" ในหน้าเว็บแอป
 * ============================================================================
 */

var DEFAULT_SPREADSHEET_ID = '1shG_tr85INBLD_Vvc56SG6BSQte6z4U56uWVTdOogy4';
var DEFAULT_SHEET_NAME = 'ฟอกไต 2569';

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var spreadsheetId = params.id || DEFAULT_SPREADSHEET_ID;
    var sheetName = params.sheet || DEFAULT_SHEET_NAME;

    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      // หากไม่พบชื่อแท็บที่ระบุ ให้ลองใช้แท็บแรกของไฟล์แทน
      sheet = ss.getSheets()[0];
    }

    var values = sheet.getDataRange().getDisplayValues();
    var allSheetNames = ss.getSheets().map(function(s) {
      return s.getName();
    });

    var payload = {
      status: 'ok',
      spreadsheetId: spreadsheetId,
      sheetName: sheet.getName(),
      availableSheets: allSheetNames,
      updatedAt: new Date().toISOString(),
      rows: values
    };

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var errorPayload = {
      status: 'error',
      message: err && err.message ? err.message : String(err),
      updatedAt: new Date().toISOString()
    };

    return ContentService
      .createTextOutput(JSON.stringify(errorPayload))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
