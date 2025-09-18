// 文件解析工具类
// 当前仅支持纯文本格式 (.txt/.md)

export class FileParser {
  
  /**
   * 解析文件内容
   * @param file 文件对象
   * @returns 解析后的文本内容
   */
  static async parseFile(file: File): Promise<string> {
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    switch (fileExtension) {
      case 'txt':
      case 'md':
        return await this.parseTextFile(file)
      default:
        throw new Error('当前仅支持纯文本题库（.txt 或 .md），请先将文件另存为文本后再上传。')
    }
  }

  /**
   * 解析文本文件
   */
  private static async parseTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve(content)
      }
      reader.onerror = () => reject(new Error('文本文件读取失败'))
      reader.readAsText(file, 'UTF-8')
    })
  }

  /**
   * 解析DOCX文件
   */
  private static async parseDocxFile(file: File): Promise<string> {
    try {
      // 动态导入mammoth
      const mammoth = await import('mammoth')
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer
            const result = await mammoth.extractRawText({ arrayBuffer })
            resolve(result.value)
          } catch (error) {
            reject(new Error('DOCX文件解析失败'))
          }
        }
        reader.onerror = () => reject(new Error('DOCX文件读取失败'))
        reader.readAsArrayBuffer(file)
      })
    } catch (error) {
      throw new Error('DOCX解析器加载失败，请确保网络连接正常')
    }
  }

  /**
   * 解析DOC文件（旧版Word格式）
   */
  private static async parseDocFile(file: File): Promise<string> {
    // DOC格式比较复杂，这里提供一个基础的文本提取
    // 实际项目中可能需要更专业的库
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          // 简单的文本提取，去除二进制字符
          const textContent = content.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          if (textContent.length < 10) {
            reject(new Error('DOC文件内容提取失败，建议转换为DOCX格式'))
          } else {
            resolve(textContent)
          }
        } catch (error) {
          reject(new Error('DOC文件解析失败'))
        }
      }
      reader.onerror = () => reject(new Error('DOC文件读取失败'))
      reader.readAsText(file, 'UTF-8')
    })
  }

  /**
   * 解析Excel文件
   */
  private static async parseExcelFile(file: File): Promise<string> {
    try {
      // 动态导入xlsx
      const XLSX = await import('xlsx')
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            
            let allText = ''
            
            // 遍历所有工作表
            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName]
              const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
              
              // 将每行数据转换为文本
              sheetData.forEach((row: any[]) => {
                if (row && row.length > 0) {
                  const rowText = row.filter(cell => cell !== null && cell !== undefined)
                    .map(cell => String(cell).trim())
                    .join('\t')
                  if (rowText) {
                    allText += rowText + '\n'
                  }
                }
              })
              
              allText += '\n' // 工作表之间添加分隔
            })
            
            if (allText.trim().length === 0) {
              reject(new Error('Excel文件中没有找到有效内容'))
            } else {
              resolve(allText.trim())
            }
          } catch (error) {
            reject(new Error('Excel文件解析失败'))
          }
        }
        reader.onerror = () => reject(new Error('Excel文件读取失败'))
        reader.readAsArrayBuffer(file)
      })
    } catch (error) {
      throw new Error('Excel解析器加载失败，请确保网络连接正常')
    }
  }

  /**
   * 解析PDF文件
   */
  private static async parsePdfFile(file: File): Promise<string> {
    try {
      // 使用pdf.js库进行PDF解析（浏览器兼容）
      const pdfjsLib = await import('pdfjs-dist')

      // 设置worker路径
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer
            const uint8Array = new Uint8Array(arrayBuffer)

            const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise
            let fullText = ''

            // 遍历所有页面
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const page = await pdf.getPage(pageNum)
              const textContent = await page.getTextContent()

              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ')

              fullText += pageText + '\n'
            }

            if (!fullText || fullText.trim().length === 0) {
              reject(new Error('PDF文件中没有找到可提取的文本内容'))
            } else {
              resolve(fullText.trim())
            }
          } catch (error) {
            reject(new Error('PDF文件解析失败，可能是加密或图片PDF'))
          }
        }
        reader.onerror = () => reject(new Error('PDF文件读取失败'))
        reader.readAsArrayBuffer(file)
      })
    } catch (error) {
      throw new Error('PDF解析器加载失败，请确保网络连接正常')
    }
  }

  /**
   * 检测文件类型
   */
  static getFileType(file: File): string {
    const extension = file.name.toLowerCase().split('.').pop()
    
    switch (extension) {
      case 'txt':
      case 'md':
        return 'text'
      default:
        return 'unsupported'
    }
  }

  /**
   * 验证文件是否支持
   */
  static isSupported(file: File): boolean {
    const supportedExtensions = ['txt', 'md']
    const extension = file.name.toLowerCase().split('.').pop()
    return supportedExtensions.includes(extension || '')
  }
}
