// scripts/lib/arch-parse.mjs — 结构化解析 change 架构产物（v0.35.0，v0.14 §62.2）
//
// P2 机器管结构：从 markdown 表格 / schema SQL 提取机器可读数据，替代正则扫 markdown。
// 背景（红队评估实证）：旧实现正则硬编码（`## 2. To-Be`、`/api/` 前缀、反引号表名）
// 在 LLM 文档标题漂移/格式变化时静默失败（match 失配返回空串、流程继续、返回 merged:true）。
// 本模块用通用表格解析（按 `|` split + 去反引号）与格式容错匹配，抽取失配由调用方 abort。

/** 解析一行 markdown 表格为单元格数组（去反引号/去 code 包裹/trim）。非表格行返回 null。 */
export function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed
    .slice(1, -1)
    .split('|')
    .map(cell => cell.trim().replace(/`/g, '').trim());
}

/**
 * 在内容中定位某个标题（headingRe），解析其后的第一个表格为行数组。
 * 标题匹配容错：不依赖序号/中英文（如 `/^#{2,3}\s*\d*\.?\s*(聚合注册表|Aggregate Registry)/i`）。
 * 返回行数组（每行 = 单元格数组）；找不到标题或表格返回 []。
 */
export function parseTableAfter(content, headingRe) {
  const lines = content.split('\n');
  let i = 0;
  for (; i < lines.length; i++) {
    if (headingRe.test(lines[i])) break;
  }
  if (i >= lines.length) return [];
  for (; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) break;
  }
  if (i >= lines.length) return [];
  const rows = [];
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) break;
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue;
    const cells = parseTableRow(line);
    if (cells && cells.length > 0) rows.push(cells);
  }
  return rows;
}

/**
 * 从 api.md 提取端点（Command/Read/Query 三段表格）。
 * 容错：匹配路径单元格（`/xxx/{id}`）与方法单元格（GET/POST/PUT/DELETE/PATCH），
 * 不依赖 `/api/` 前缀硬编码（企业系统可能是 /v1/、/gateway/oms/ 等）。
 */
export function extractEndpoints(apiMd) {
  const endpoints = [];
  const lines = apiMd.split('\n');
  let currentKind = 'unknown';
  for (const line of lines) {
    if (/^#{2,3}\s*.*(Command|命令)/i.test(line)) currentKind = 'Command';
    else if (/^#{2,3}\s*.*(Read|读取)/i.test(line)) currentKind = 'Read';
    else if (/^#{2,3}\s*.*(Query|查询)/i.test(line)) currentKind = 'Query';
    if (!line.trim().startsWith('|')) continue;
    const cells = parseTableRow(line);
    if (!cells || cells.length === 0) continue;
    const pathCell = cells.find(c => /^\/[\w\-/{}.]+$/.test(c));
    if (!pathCell) continue;
    const methodCell = cells.find(c => /^(GET|POST|PUT|DELETE|PATCH)$/i.test(c));
    // kind：章节标题优先；若无章节标题（如 API-INDEX 生成格式），从表格分流列取
    const kindCell = cells.find(c => /^(Command|Read|Query)$/i.test(c));
    const kind = currentKind !== 'unknown' ? currentKind : (kindCell || 'unknown');
    endpoints.push({ path: pathCell, method: methodCell ? methodCell.toUpperCase() : '', kind });
  }
  return endpoints;
}

/**
 * 从 architecture.md 提取聚合清单。聚合 id 格式 `context:Aggregate`。
 * 兼容两种模板：
 * - 产品级「聚合注册表」：`| 聚合ID | 上下文 | 根实体 | ... |`（列1=上下文，列2=根，列5=不变量）
 * - change 级「To-Be 增量设计 §2.1 聚合变更」：`| 聚合名称 | 操作 | 聚合根 | ... | 所属 BC |`（列1=操作，列5=所属 BC）
 */
export function extractAggregates(archMd) {
  let rows = parseTableAfter(archMd, /^#{2,3}\s*\d*\.?\s*(聚合注册表|Aggregate Registry)/i);
  if (rows.length === 0) {
    rows = parseTableAfter(archMd, /^#{3,4}\s*\d*\.?\s*(聚合变更|Aggregate Changes)/i);
  }
  if (rows.length === 0) {
    rows = parseTableAfter(archMd, /^#{2,3}\s*\d*\.?\s*To-Be/i);
  }
  const aggregates = [];
  for (const row of rows) {
    const id = row[0]?.trim();
    if (!id || id === '聚合ID' || id === '聚合名称' || id === 'Aggregate') continue;
    if (!/^[\w]+:[\w]+$/.test(id)) continue;
    const col1 = row[1]?.trim() || '';
    const isChange = /^(新增|修改|New|Update)/i.test(col1);
    // source：产品级全局格式（buildCurrentStateSection 生成）列3=来源 changeName；change 级无来源列 → ''
    const source = /^change:/.test(row[3]?.trim() || '') ? row[3].trim() : '';
    aggregates.push({
      id,
      context: isChange ? (row[5]?.trim() || '') : col1,
      root: row[2]?.trim() || '',
      invariants: isChange ? '' : (row[5]?.trim() || ''),
      source,
    });
  }
  return aggregates;
}

/** 从 schema-baseline.sql 提取 CREATE TABLE 表名（容错：IF NOT EXISTS / 反引号 / schema 前缀）。 */
export function extractTablesFromSql(sql) {
  const tables = [];
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([\w.]+)`?\s*(?:\(|;)/gi;
  let m;
  while ((m = re.exec(sql))) {
    tables.push(m[1].replace(/`/g, ''));
  }
  return [...new Set(tables)];
}

/**
 * 从演进日志段提取条目。返回 `{ key, content }[]`，key 用 changeName 唯一锚
 *（`### change:<name>` 或 `### <name>`），替代按版本号去重（不同 change 可能同版本号）。
 */
export function extractEvolutionLogEntries(archMd, changeName) {
  const logStart = archMd.search(/^#{2,3}\s*\d*\.?\s*(演进日志|Evolution Log)/m);
  if (logStart < 0) return [];
  const logSection = archMd.slice(logStart);
  const entries = [];
  const blockRe = /(###\s+.+)([\s\S]*?)(?=###\s|##\s|\n#\s|$)/g;
  let m;
  while ((m = blockRe.exec(logSection))) {
    const title = m[1].trim();
    const body = m[2].trim();
    if (!title || !body) continue;
    entries.push({ key: changeName, title, body });
  }
  return entries;
}

/** 从 database.md 的 Schema 变更详情段（§3）提取受影响的表。 */
export function extractTablesFromDatabaseMd(dbMd) {
  const tables = new Set();
  // 匹配表格行中的 CREATE/ALTER TABLE 操作列
  const re = /(?:CREATE|ALTER)\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([\w.]+)`?/gi;
  let m;
  while ((m = re.exec(dbMd))) {
    tables.add(m[1].replace(/`/g, ''));
  }
  // 兜底：匹配形如 `t_xxx` 的表名行
  const tableRe = /\b(t_[a-z_0-9]+)\b/g;
  while ((m = tableRe.exec(dbMd))) tables.add(m[1]);
  return [...tables];
}

/** 从 markdown 中提取所有 frontmatter 字段（简单正则，与 state-loader 兼容）。 */
export function readFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return fm;
}
