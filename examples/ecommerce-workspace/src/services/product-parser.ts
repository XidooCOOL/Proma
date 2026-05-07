/**
 * 商品数据解析服务
 * 
 * 功能：
 * 1. 从 URL 解析商品信息
 * 2. 从 Excel 文件解析商品数据
 * 3. 从文件夹批量导入商品
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import { v4 as uuidv4 } from 'uuid'

export interface ParsedProduct {
  title: string
  price: number
  description?: string
  images: string[]
  category?: string
  source?: string
}

/**
 * 从 URL 获取页面内容
 */
function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    }, (res) => {
      // 处理重定向
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          fetchPage(res.headers.location).then(resolve).catch(reject)
          return
        }
      }
      
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })
    
    req.on('error', reject)
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('请求超时'))
    })
  })
}

/**
 * 从 HTML 中提取 JSON 数据
 */
function extractJson(html: string, patterns: RegExp[]): any {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        // 继续尝试其他模式
      }
    }
  }
  return null
}

/**
 * 从 HTML 中提取文本内容
 */
function extractText(html: string, pattern: RegExp): string {
  const match = html.match(pattern)
  return match ? match[1]?.trim() || '' : ''
}

/**
 * 解析淘宝/天猫商品
 */
async function parseTaobao(url: string): Promise<ParsedProduct | null> {
  try {
    const html = await fetchPage(url)
    
    // 尝试从 HTML 中提取商品数据
    // 淘宝使用 __INITIAL_DATA__ 或 window.__PRELOADED_STATE__
    let data = extractJson(html, [
      /window\.__INITIAL_DATA__\s*=\s*({.+?});/s,
      /window\.__PRELOADED_STATE__\s*=\s*({.+?});/s,
      /var\s+pageData\s*=\s*({.+?});/s,
    ])
    
    if (!data) {
      // 备选：从 HTML 中提取基本信息
      const title = extractText(html, /<title>(.+?)<\/title>/)
      const price = extractText(html, /"price"\s*:\s*["']?([\d.]+)["']?/)
      const imageMatch = html.match(/"mainPic"\s*:\s*"([^"]+)"/)
      const mainPic = imageMatch ? imageMatch[1] : ''
      
      return {
        title: title.replace(/_.+?_首页/, '').trim(),
        price: parseFloat(price) || 0,
        images: mainPic ? [mainPic] : [],
        source: 'taobao',
      }
    }
    
    // 解析提取到的数据
    const item = data.item || data.itemInfo || data
    
    return {
      title: item.title || '',
      price: parseFloat(item.price || item.auctionPrice || '0'),
      description: item.description || '',
      images: item.images || [],
      source: 'taobao',
    }
  } catch (error) {
    console.error('[ProductParser] 解析淘宝失败:', error)
    return null
  }
}

/**
 * 解析拼多多商品
 */
async function parsePinduoduo(url: string): Promise<ParsedProduct | null> {
  try {
    const html = await fetchPage(url)
    
    // 拼多多数据在 __NEXT_DATA__ 或 script 标签中
    const data = extractJson(html, [
      /window\.__INITIAL_DATA__\s*=\s*({.+?})\s*<script/,
      /id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/,
      /window\.__pinpoint__\s*=\s*({.+?});/s,
    ])
    
    if (!data) {
      const title = extractText(html, /<title>(.+?)<\/title>/)
      const price = extractText(html, /"price"\s*:\s*["']?([\d.]+)["']?/)
      
      return {
        title: title.replace(/[-_]拼多多.+$/, '').trim(),
        price: parseFloat(price) || 0,
        images: [],
        source: 'pinduoduo',
      }
    }
    
    const goods = data.goods || data.detail || data
    
    return {
      title: goods.goodsName || goods.name || '',
      price: parseFloat(goods.groupPrice || goods.price || '0'),
      description: goods.goodsDesc || '',
      images: goods.images || [],
      source: 'pinduoduo',
    }
  } catch (error) {
    console.error('[ProductParser] 解析拼多多失败:', error)
    return null
  }
}

/**
 * 解析抖音商品
 */
async function parseDouyin(url: string): Promise<ParsedProduct | null> {
  try {
    const html = await fetchPage(url)
    
    // 抖音数据
    const data = extractJson(html, [
      /window\.__INITIAL_STATE__\s*=\s*({.+?})\s*<\/script/s,
      /<script id="RENDER_DATA" type="application/json">([^<]+)<\/script>/,
    ])
    
    if (!data) {
      const title = extractText(html, /<title>(.+?)<\/title>/)
      return {
        title: title.replace(/商品详情/, '').trim(),
        price: 0,
        images: [],
        source: 'douyin',
      }
    }
    
    return {
      title: data.title || '',
      price: parseFloat(data.price || '0'),
      images: data.images || [],
      source: 'douyin',
    }
  } catch (error) {
    console.error('[ProductParser] 解析抖音失败:', error)
    return null
  }
}

/**
 * 解析京东商品
 */
async function parseJd(url: string): Promise<ParsedProduct | null> {
  try {
    const html = await fetchPage(url)
    
    const data = extractJson(html, [
      /var\s+pageConfig\s*=\s*\{[\s\S]*?'product'\s*:\s*({.+?})\s*\}[\s\S]*?\};/,
      /window\.__INITIAL_STATE__\s*=\s*({.+?})\s*<\/script/s,
    ])
    
    if (!data) {
      const title = extractText(html, /<title>(.+?)<\/title>/)
      const price = extractText(html, /"jdPrice"\s*:\s*["']?([\d.]+)["']?/)
      
      return {
        title: title.replace(/【.+?】/, '').replace(/_京东/.replace('_', ''), '').trim(),
        price: parseFloat(price) || 0,
        images: [],
        source: 'jd',
      }
    }
    
    const product = data.product || data
    
    return {
      title: product.name || product.productName || '',
      price: parseFloat(product.jdPrice || product.price || '0'),
      description: product.productDesc || '',
      images: product.images || [],
      source: 'jd',
    }
  } catch (error) {
    console.error('[ProductParser] 解析京东失败:', error)
    return null
  }
}

/**
 * 主解析函数
 */
export async function parseProductFromUrl(url: string): Promise<{
  success: boolean
  product?: ParsedProduct
  error?: string
}> {
  try {
    // 检测 URL 类型
    if (url.includes('taobao.com') || url.includes('tmall.com')) {
      const product = await parseTaobao(url)
      if (product) {
        return { success: true, product }
      }
    } else if (url.includes('pinduoduo.com') || url.includes('yangkeduo.com')) {
      const product = await parsePinduoduo(url)
      if (product) {
        return { success: true, product }
      }
    } else if (url.includes('douyin.com') || url.includes('jinritemai.com')) {
      const product = await parseDouyin(url)
      if (product) {
        return { success: true, product }
      }
    } else if (url.includes('jd.com')) {
      const product = await parseJd(url)
      if (product) {
        return { success: true, product }
      }
    }
    
    return { success: false, error: '不支持的商品链接' }
  } catch (error) {
    console.error('[ProductParser] 解析失败:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '解析失败' 
    }
  }
}

/**
 * 从 Excel 文件解析商品数据
 */
export async function parseProductsFromExcel(filePath: string): Promise<ParsedProduct[]> {
  // 实际应该使用 xlsx 库解析
  // 这里先返回模拟数据
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return []
    }
    
    // 假设第一行是表头
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const products: ParsedProduct[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const row: Record<string, string> = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })
      
      products.push({
        title: row.title || row.name || `商品${i}`,
        price: parseFloat(row.price || row.amount || '0'),
        description: row.description || row.desc || '',
        images: row.images ? row.images.split(';').filter(Boolean) : [],
        category: row.category || '',
        source: 'excel',
      })
    }
    
    return products
  } catch (error) {
    console.error('[ProductParser] Excel解析失败:', error)
    return []
  }
}

/**
 * 从文件夹批量导入商品
 */
export function parseProductsFromFolder(folderPath: string): ParsedProduct[] {
  try {
    const files = fs.readdirSync(folderPath)
    const products: ParsedProduct[] = []
    
    for (const file of files) {
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
        const filePath = path.join(folderPath, file)
        const stats = fs.statSync(filePath)
        
        // 使用文件名作为标题（去掉扩展名）
        const title = file.replace(/\.[^/.]+$/, '')
        
        products.push({
          title,
          price: 0,
          images: [filePath],
          source: 'folder',
        })
      }
    }
    
    return products
  } catch (error) {
    console.error('[ProductParser] 文件夹解析失败:', error)
    return []
  }
}
