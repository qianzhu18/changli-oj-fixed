import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { parse as csvParse } from 'csv-parse';
import { Buffer } from 'buffer';

export interface ParsedFileContent {
  text: string;
  metadata?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    pageCount?: number;
    wordCount?: number;
  };
}

export class FileParserService {
  /**
   * 解析文件内容
   */
  async parseFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<ParsedFileContent> {
    const fileExtension = this.getFileExtension(fileName);
    
    try {
      let text = '';
      let metadata: any = {
        fileName,
        fileType: fileExtension,
        fileSize: fileBuffer.length
      };

      switch (fileExtension.toLowerCase()) {
        case 'txt':
          text = fileBuffer.toString('utf-8');
          metadata.wordCount = this.countWords(text);
          break;

        case 'md':
          text = fileBuffer.toString('utf-8');
          metadata.wordCount = this.countWords(text);
          break;

        default:
          throw new Error('当前版本仅支持纯文本题库（.txt / .md）。');
      }

      return {
        text: text.trim(),
        metadata
      };
    } catch (error) {
      const baseMessage = error instanceof Error ? error.message : '未知错误';
      let hint = '';

      switch (fileExtension.toLowerCase()) {
        case 'pdf':
          hint = '请确认 PDF 未加密或扫描，可尝试导出为 Word/TXT 后重新上传。';
          break;
        case 'doc':
        case 'docx':
          hint = '请确认 Word 文档未损坏，可先另存为新的 DOCX 再上传。';
          break;
        case 'xls':
        case 'xlsx':
          hint = '请检查表格是否包含题号、题目、选项、答案等列，可尝试导出为 CSV 再试。';
          break;
        default:
          hint = '请检查文件内容是否为纯文本题库格式。';
      }

      throw new Error(`文件解析失败: ${baseMessage}${hint ? ` (${hint})` : ''}`);
    }
  }

  /**
   * 解析Word文档
   */
  private async parseWordDocument(buffer: Buffer): Promise<{ text: string }> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value };
    } catch (error) {
      throw new Error('Word文档解析失败');
    }
  }

  /**
   * 解析Excel文件
   */
  private async parseExcelFile(buffer: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allText = '';

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        sheetData.forEach((row: any, index: number) => {
          if (!Array.isArray(row)) {
            return;
          }

          // 跳过表头（常见表头以“题号”或“编号”开头）
          const firstCell = (row[0] ?? '').toString().trim();
          if (index === 0 && /^(题号|编号|序号)$/i.test(firstCell)) {
            return;
          }

          if (!firstCell) {
            return;
          }

          const questionNumber = firstCell.replace(/[^0-9]/g, '');
          const questionText = (row[1] ?? '').toString().trim();
          const options = row.slice(2, 6).map((cell: any) => (cell ?? '').toString().trim()).filter(Boolean);
          const answerCell = (row[6] ?? '').toString().trim();
          const explanation = (row[7] ?? '').toString().trim();

          if (!questionText) {
            return;
          }

          const labels = ['A', 'B', 'C', 'D'];
          let block = '';

          if (questionNumber) {
            block += `${questionNumber}. ${questionText}\n`;
          } else {
            block += `${questionText}\n`;
          }

          options.forEach((opt, idx) => {
            const label = labels[idx] || String.fromCharCode(65 + idx);
            block += `${label}. ${opt}\n`;
          });

          if (answerCell) {
            block += `答案：${answerCell}\n`;
          }

          if (explanation) {
            block += `解析：${explanation}\n`;
          }

          allText += `${block}\n`;
        });
      });

      return allText;
    } catch (error) {
      throw new Error('Excel文件解析失败');
    }
  }

  /**
   * 解析PDF文件
   */
  private async parsePdfFile(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      const data = await pdfParse(buffer);
      return {
        text: data.text,
        pageCount: data.numpages
      };
    } catch (error) {
      throw new Error('PDF文件解析失败');
    }
  }

  /**
   * 解析CSV文件
   */
  private async parseCsvFile(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const csvText = buffer.toString('utf-8');

      csvParse(csvText, {
        delimiter: ',',
        skip_empty_lines: true,
        trim: true,
      }, (err, data) => {
        if (err) {
          reject(new Error('CSV文件解析失败'));
          return;
        }

        let text = '';
        data.forEach((row: any[], index: number) => {
          if (Array.isArray(row) && row.length > 0) {
            const rowText = row
              .filter(cell => cell !== null && cell !== undefined && cell !== '')
              .join(' | ');
            if (rowText.trim()) {
              text += `第${index + 1}行: ${rowText}\n`;
            }
          }
        });

        resolve(text);
      });
    });
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return fileName.substring(lastDotIndex + 1);
  }

  /**
   * 统计单词数量
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 验证文件类型是否支持
   */
  static isSupportedFileType(fileName: string, mimeType: string): boolean {
    const supportedExtensions = ['txt', 'md'];
    const supportedMimeTypes = [
      'text/plain',
      'text/markdown'
    ];

    const extension = fileName.split('.').pop()?.toLowerCase();
    return supportedExtensions.includes(extension || '') || supportedMimeTypes.includes(mimeType);
  }

  /**
   * 获取文件大小限制（字节）
   */
  static getMaxFileSize(): number {
    return 10 * 1024 * 1024; // 10MB
  }

  /**
   * 验证文件大小
   */
  static validateFileSize(fileSize: number): boolean {
    return fileSize <= this.getMaxFileSize();
  }

  /**
   * 格式化文件大小显示
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default FileParserService;
