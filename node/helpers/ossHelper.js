// 阿里云 OSS 工具类（支持 OSS 与本地存储双模式）
const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');
const ossConfig = require('../config/oss.config');

const useOSS = process.env.STORAGE_TYPE === 'oss';
const publicRoot = path.join(__dirname, '../public');

function normalizePath(filePath = '') {
    return String(filePath).replace(/^\/+/, '').replace(/\\/g, '/');
}

function normalizePrefix(prefix = '') {
    const p = String(prefix).replace(/^\/+|\/+$/g, '');
    return p ? `${p}/` : '';
}

function buildRemotePath(filePath) {
    return `${normalizePrefix(ossConfig.prefix)}${normalizePath(filePath)}`;
}

function toRelativeUrl(filePath) {
    return `/${normalizePath(filePath)}`;
}

function toLocalAbsPath(filePath) {
    return path.join(publicRoot, normalizePath(filePath));
}

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

let client = null;
if (useOSS) {
    client = new OSS(ossConfig);
}

/**
 * 本地磁盘文件到 OSS上传文件到 OSS
 * @param {string} localFilePath - 本地文件路径
 * @param {string} ossFilePath - OSS 文件路径（相对于存储桶）
 * @returns {Promise<string>} - 文件访问 URL
 */
async function uploadFile(localFilePath, ossFilePath) {
    try {
        const normalizedPath = normalizePath(ossFilePath);

        if (!useOSS) {
            const localDest = toLocalAbsPath(normalizedPath);
            ensureParentDir(localDest);
            await fs.promises.copyFile(localFilePath, localDest);
            return toRelativeUrl(normalizedPath);
        }

        const fullOssPath = buildRemotePath(normalizedPath);
        await client.put(fullOssPath, localFilePath);
        return getFileUrl(normalizedPath);
    } catch (error) {
        console.error('OSS 上传文件失败:', error);
        throw error;
    }
}

/**
 * 流式上传文件到 OSS
 * @param {ReadStream} stream - 文件流
 * @param {string} ossFilePath - OSS 文件路径（相对于存储桶）
 * @returns {Promise<string>} - 文件访问 URL
 */
async function uploadStream(stream, ossFilePath) {
    try {
        const normalizedPath = normalizePath(ossFilePath);

        if (!useOSS) {
            const localDest = toLocalAbsPath(normalizedPath);
            ensureParentDir(localDest);
            await new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(localDest);
                stream.pipe(writeStream);
                stream.on('error', reject);
                writeStream.on('error', reject);
                writeStream.on('finish', resolve);
            });
            return toRelativeUrl(normalizedPath);
        }

        const fullOssPath = buildRemotePath(normalizedPath);
        await client.putStream(fullOssPath, stream);
        return getFileUrl(normalizedPath);
    } catch (error) {
        console.error('OSS 流式上传文件失败:', error);
        throw error;
    }
}

/**
 * 上传 Buffer 到 OSS（用户上传的文件（multer），无需写入磁盘）
 * @param {Buffer} buffer - 文件 Buffer
 * @param {string} ossFilePath - OSS 文件路径（相对于存储桶）
 * @returns {Promise<string>} - 文件访问 URL
 */
async function uploadBuffer(buffer, ossFilePath) {
    try {
        const normalizedPath = normalizePath(ossFilePath);

        if (!useOSS) {
            const localDest = toLocalAbsPath(normalizedPath);
            ensureParentDir(localDest);
            await fs.promises.writeFile(localDest, buffer);
            return toRelativeUrl(normalizedPath);
        }

        const fullOssPath = buildRemotePath(normalizedPath);
        await client.put(fullOssPath, buffer);
        return getFileUrl(normalizedPath);
    } catch (error) {
        console.error('OSS 上传 Buffer 失败:', error);
        throw error;
    }
}

/**
 * 删除 OSS 上的文件
 * @param {string} ossFilePath - OSS 文件路径（相对于存储桶）
 * @returns {Promise<boolean>}
 */
async function deleteFile(ossFilePath) {
    try {
        const normalizedPath = normalizePath(ossFilePath);

        if (!useOSS) {
            const localDest = toLocalAbsPath(normalizedPath);
            if (fs.existsSync(localDest)) {
                await fs.promises.unlink(localDest);
            }
            return true;
        }

        const fullOssPath = buildRemotePath(normalizedPath);
        await client.delete(fullOssPath);
        return true;
    } catch (error) {
        console.error('OSS 删除文件失败:', error);
        throw error;
    }
}

function extractPathFromUrl(fileUrl) {
    if (!fileUrl) return '';

    let filePath = String(fileUrl).trim();

    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        try {
            filePath = new URL(filePath).pathname || '';
        } catch (error) {
            // ignore parse error and fallback to original value
        }
    }

    filePath = normalizePath(filePath);

    if (useOSS) {
        const prefix = normalizePrefix(ossConfig.prefix);
        if (prefix && filePath.startsWith(prefix)) {
            filePath = filePath.slice(prefix.length);
        }
    }

    return normalizePath(filePath);
}

/**
 * 通过 URL 删除 OSS 文件
 * @param {string} fileUrl - 文件完整 URL
 * @returns {Promise<boolean>}
 */
async function deleteFileByUrl(fileUrl) {
    try {
        const filePath = extractPathFromUrl(fileUrl);
        return await deleteFile(filePath);
    } catch (error) {
        console.error('OSS 通过 URL 删除文件失败:', error);
        throw error;
    }
}

/**
 * 获取 OSS 文件的访问 URL
 * @param {string} ossFilePath - OSS 文件路径（相对于存储桶）
 * @returns {string} - 文件访问 URL
 */
function getFileUrl(ossFilePath) {
    const normalizedPath = normalizePath(ossFilePath);
    if (!useOSS) {
        return toRelativeUrl(normalizedPath);
    }

    const fullOssPath = buildRemotePath(normalizedPath);

    if (ossConfig.cdnDomain) {
        // 使用 CDN 域名
        return `https://${ossConfig.cdnDomain}/${fullOssPath}`;
    } else {
        // 使用 OSS 原始域名
        return `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${fullOssPath}`;
    }
}

/**
 * 递归遍历目录，获取所有文件路径
 * @param {string} dirPath - 目录路径
 * @returns {Array<string>} - 文件路径数组
 */
function getAllFiles(dirPath) {
    const files = [];
    
    function traverse(currentPath) {
        const items = fs.readdirSync(currentPath);
        
        items.forEach(item => {
            const itemPath = path.join(currentPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                traverse(itemPath);
            } else {
                files.push(itemPath);
            }
        });
    }
    
    traverse(dirPath);
    return files;
}

/**
 * 迁移本地目录到 OSS
 * @param {string} localDir - 本地目录路径
 * @param {string} ossDir - OSS 目录路径（相对于存储桶）
 * @returns {Promise<Array<{localPath: string, ossPath: string, url: string}>>} - 迁移结果数组
 */
async function migrateDirToOSS(localDir, ossDir) {
    try {
        if (!useOSS) {
            throw new Error('migrateDirToOSS 仅在 STORAGE_TYPE=oss 时可用');
        }
        const files = getAllFiles(localDir);
        const migrateResults = [];
        
        for (const localFilePath of files) {
            // 计算相对于本地目录的路径
            const relativePath = path.relative(localDir, localFilePath);
            // 构建 OSS 文件路径
            const ossFilePath = path.posix.join(ossDir, relativePath).replace(/\\/g, '/');
            
            // 上传文件到 OSS
            const url = await uploadFile(localFilePath, ossFilePath);
            
            migrateResults.push({
                localPath: localFilePath,
                ossPath: ossFilePath,
                url: url
            });
            
            console.log(`迁移成功: ${localFilePath} -> ${ossFilePath}`);
        }
        
        return migrateResults;
    } catch (error) {
        console.error('迁移目录到 OSS 失败:', error);
        throw error;
    }
}

module.exports = {
    uploadFile,
    uploadStream,
    uploadBuffer,
    deleteFile,
    deleteFileByUrl,
    getFileUrl,
    migrateDirToOSS
};
