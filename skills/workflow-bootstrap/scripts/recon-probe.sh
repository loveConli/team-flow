#!/usr/bin/env bash
# ============================================================================
# recon-probe.sh — 确定性代码库质量探查脚本（workflow-bootstrap B1）
#
# 用途
#   对既有代码库做"固定化、可复现"的机械采集：目录树 / 依赖清单 / LOC 与文件
#   类型分布 / 测试文件计数 / DB 迁移清单 / README-docs 探测。
#   本脚本只做**确定性机械采集**（设计文档 v0.8 §17.8 第四类载体）——同项目两次
#   运行结果一致，可横展对比。语义判断（架构模式 / 聚合根推断 / 框架定性）交给
#   消费本脚本 JSON 输出的侦察子代理（codebase-recon-analyst）完成。
#
# 映射
#   本脚本是未来 `tf recon` CLI 的底层实现雏形：
#       tf recon [--root <path>] [--out <json>]
#   现阶段以独立 bash 脚本形态供 workflow-bootstrap 调用，后续原样并入 CLI。
#
# 用法
#   recon-probe.sh [--root <path>] [--out <json>]
#     --root <path>   探查根目录（默认当前目录）
#     --out  <json>   JSON 输出文件（默认写到 stdout）
#
# 输出
#   - 结构化 JSON  → --out 指定文件或 stdout（供侦察子代理消费）
#   - 人类可读摘要 → stderr（永远输出）
#
# 依赖
#   纯 bash + 常见 unix 工具（find / grep / sed / awk / wc / sort / uniq）。
#   jq **可选**：有 jq 时美化 JSON；无 jq 时输出脚本自建的合法 JSON（降级为文本）。
#   健壮性：root 不存在不报错（输出最小 JSON + 提示），采集命令失败以 0/空兜底。
# ============================================================================

set -u  # 未定义变量报错；不用 -e（单条采集失败不应中断整体），逐处 || true 兜底

# ----------------------------------------------------------------------------
# 默认参数
# ----------------------------------------------------------------------------
ROOT="."
OUT=""
MAX_FILES=50000     # LOC 统计文件数上限（保护超大仓库）
TREE_DEPTH=4        # 目录树限深

# ----------------------------------------------------------------------------
# 参数解析
# ----------------------------------------------------------------------------
print_help() {
  sed -n '2,30p' "$0" 2>/dev/null | sed 's/^# \{0,1\}//'
}
while [ $# -gt 0 ]; do
  case "$1" in
    --root)   ROOT="${2:-.}"; shift 2 ;;
    --root=*) ROOT="${1#*=}"; shift ;;
    --out)    OUT="${2:-}"; shift 2 ;;
    --out=*)  OUT="${1#*=}"; shift ;;
    -h|--help) print_help; exit 0 ;;
    *) echo "[recon-probe] warn: unknown arg '$1' (ignored)" >&2; shift ;;
  esac
done

# ----------------------------------------------------------------------------
# 临时目录 + 清理
# ----------------------------------------------------------------------------
TMP="$(mktemp -d 2>/dev/null || echo "/tmp/recon-probe.$$")"
mkdir -p "$TMP" 2>/dev/null
trap 'rm -rf "$TMP" 2>/dev/null' EXIT

# ----------------------------------------------------------------------------
# JSON 辅助函数
# ----------------------------------------------------------------------------
# 转义字符串为合法 JSON 字符串内容（处理 \ " 及控制字符）
json_escape() {
  printf '%s' "$1" \
    | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' -e 's/\r//g' \
    | tr '\n' ' '
}

# 从"每行一个 item"的文件构建 JSON 字符串数组（确定性：调用方已 sort）
json_array_from_file() {
  _f="$1"
  if [ ! -s "$_f" ]; then printf '[]'; return; fi
  printf '['
  _first=1
  while IFS= read -r _line; do
    [ -z "$_line" ] && continue
    [ "$_first" -eq 1 ] && _first=0 || printf ','
    printf '"%s"' "$(json_escape "$_line")"
  done < "$_f"
  printf ']'
}

# ----------------------------------------------------------------------------
# root 健壮性处理
# ----------------------------------------------------------------------------
if [ ! -d "$ROOT" ]; then
  echo "[recon-probe] warn: root '$ROOT' not found or not a directory" >&2
  MIN_JSON='{"schema_version":1,"error":"root_not_found","root":"'"$(json_escape "$ROOT")"'"}'
  if [ -n "$OUT" ]; then printf '%s\n' "$MIN_JSON" > "$OUT"; else printf '%s\n' "$MIN_JSON"; fi
  exit 0
fi
ROOT_ABS="$(cd "$ROOT" 2>/dev/null && pwd)" || ROOT_ABS="$ROOT"

# 噪音目录剪枝：包装 find，排除 .git/node_modules/构建产物等
pruned_find() {
  find "$ROOT_ABS" \
    \( -type d \( \
        -name .git -o -name node_modules -o -name target -o -name build \
        -o -name dist -o -name out -o -name vendor -o -name .venv \
        -o -name venv -o -name __pycache__ -o -name .idea -o -name .gradle \
        -o -name coverage -o -name .next -o -name .turbo \
    \) -prune \) -o "$@" 2>/dev/null
}

GENERATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo unknown)"

# ============================================================================
# ① 目录树（限深 TREE_DEPTH 层，相对路径，确定性排序）
# ============================================================================
find "$ROOT_ABS" -maxdepth "$TREE_DEPTH" \
  \( -type d \( -name .git -o -name node_modules -o -name target -o -name build \
     -o -name dist -o -name vendor -o -name .venv -o -name venv \
     -o -name __pycache__ -o -name .idea -o -name .gradle \) -prune \) \
  -o -type d -print 2>/dev/null \
  | sed "s#^$ROOT_ABS/##; s#^$ROOT_ABS#.#" \
  | sort > "$TMP/dirs.txt"
DIR_COUNT=$(wc -l < "$TMP/dirs.txt" | tr -d ' ')

# ============================================================================
# ② 依赖清单（探测常见 manifest，机械提取依赖）
# ============================================================================
: > "$TMP/dep_manifests.json"
add_manifest() {
  # $1=file(rel) $2=type $3=deps-file(每行一个依赖)
  _rel="$1"; _type="$2"; _deps="$3"
  _arr="$(json_array_from_file "$_deps")"
  printf '{"file":"%s","type":"%s","deps":%s},' \
    "$(json_escape "$_rel")" "$(json_escape "$_type")" "$_arr" >> "$TMP/dep_manifests.json"
}

# 查找所有 manifest（相对路径），逐个解析
pruned_find -type f \
  \( -name pom.xml -o -name package.json -o -name requirements.txt \
     -o -name go.mod -o -name build.gradle -o -name build.gradle.kts \
     -o -name Gemfile -o -name Cargo.toml -o -name pyproject.toml \) \
  -print 2>/dev/null | sort | while IFS= read -r mf; do
    rel="${mf#"$ROOT_ABS"/}"
    base="$(basename "$mf")"
    deps_file="$TMP/deps_$(echo "$rel" | tr '/' '_').txt"
    : > "$deps_file"
    case "$base" in
      pom.xml)
        grep -oE '<artifactId>[^<]+</artifactId>' "$mf" 2>/dev/null \
          | sed -E 's#</?artifactId>##g' | sort -u > "$deps_file" ;;
      package.json)
        grep -oE '"[@A-Za-z0-9/_-]+"[[:space:]]*:[[:space:]]*"[^"]+"' "$mf" 2>/dev/null \
          | sed -E 's/[[:space:]]*:[[:space:]]*/@/; s/"//g' | sort -u > "$deps_file" ;;
      requirements.txt)
        grep -vE '^[[:space:]]*(#|$)' "$mf" 2>/dev/null \
          | sed -E 's/[[:space:]]+$//' | sort -u > "$deps_file" ;;
      go.mod)
        sed -n '/require/,/)/p' "$mf" 2>/dev/null \
          | grep -oE '[A-Za-z0-9./_-]+/[A-Za-z0-9./_-]+ v[0-9][^ ]*' \
          | sort -u > "$deps_file" ;;
      build.gradle|build.gradle.kts)
        grep -E '(implementation|api|compile|testImplementation)[[:space:]]*[( ]' "$mf" 2>/dev/null \
          | grep -oE "['\"][^'\"]+:[^'\"]+:[^'\"]+['\"]" \
          | sed -E "s/['\"]//g" | sort -u > "$deps_file" ;;
      Gemfile)
        grep -E "^[[:space:]]*gem " "$mf" 2>/dev/null \
          | sed -E "s/^[[:space:]]*gem ['\"]//; s/['\"].*//" | sort -u > "$deps_file" ;;
      Cargo.toml)
        sed -n '/\[dependencies\]/,/^\[/p' "$mf" 2>/dev/null \
          | grep -E '^[A-Za-z0-9_-]+[[:space:]]*=' \
          | sed -E 's/[[:space:]]*=.*//' | sort -u > "$deps_file" ;;
      pyproject.toml)
        sed -n '/dependencies/,/\]/p' "$mf" 2>/dev/null \
          | grep -oE '"[A-Za-z0-9._-]+[^"]*"' \
          | sed -E 's/"//g' | sort -u > "$deps_file" ;;
    esac
    # 限制每个 manifest 提取条数，避免 JSON 过大
    head -n 200 "$deps_file" > "$deps_file.cut" 2>/dev/null && mv "$deps_file.cut" "$deps_file"
    add_manifest "$rel" "$base" "$deps_file"
  done
# 去掉尾逗号
MANIFESTS_JSON="$(sed 's/,$//' "$TMP/dep_manifests.json" 2>/dev/null)"
[ -z "$MANIFESTS_JSON" ] && MANIFESTS_JSON=""

# ============================================================================
# ③ LOC 与文件类型分布（按扩展名统计；逐个 wc，避开 bash 关联数组以兼容 bash 3.2）
# ============================================================================
# 生成 "ext<TAB>lines" 对
# 注意：不用 `head -z`（macOS BSD head 不支持 -z，会断管）；改用 while 内部计数 + break
# 限制文件数（MAX_FILES）。sort -z 提供确定性顺序（BSD/GNU sort 均支持）。
pruned_find -type f -print0 2>/dev/null \
  | sort -z 2>/dev/null \
  | while IFS= read -r -d '' f; do
      _n=$(( ${_n:-0} + 1 ))
      [ "$_n" -gt "$MAX_FILES" ] && break
      name="$(basename "$f")"
      case "$name" in
        *.*) ext="${name##*.}" ;;
        *)   ext="(none)" ;;
      esac
      lines="$(wc -l < "$f" 2>/dev/null | tr -d ' ')"
      [ -z "$lines" ] && lines=0
      printf '%s\t%s\n' "$ext" "$lines"
    done > "$TMP/ext_lines.tsv"

# awk 聚合（awk 关联数组无 bash 版本问题）
awk -F'\t' '
  { files[$1]++; loc[$1]+=$2; tf++; tl+=$2 }
  END {
    printf "%d\t%d\n", tf, tl > "'"$TMP"'/_totals.tsv";
    for (e in files) printf "%s\t%d\t%d\n", e, files[e], loc[e];
  }
' "$TMP/ext_lines.tsv" 2>/dev/null | sort -t"$(printf '\t')" -k2,2nr > "$TMP/ext_stats.tsv"

TOTAL_FILES="$(cut -f1 "$TMP/_totals.tsv" 2>/dev/null | head -1)"; TOTAL_FILES="${TOTAL_FILES:-0}"
TOTAL_LINES="$(cut -f2 "$TMP/_totals.tsv" 2>/dev/null | head -1)"; TOTAL_LINES="${TOTAL_LINES:-0}"

# 构建 by_extension JSON 数组
: > "$TMP/byext.json"
while IFS="$(printf '\t')" read -r ext fcnt lcnt; do
  [ -z "$ext" ] && continue
  printf '{"ext":"%s","files":%s,"lines":%s},' \
    "$(json_escape "$ext")" "${fcnt:-0}" "${lcnt:-0}" >> "$TMP/byext.json"
done < "$TMP/ext_stats.tsv"
BYEXT_JSON="$(sed 's/,$//' "$TMP/byext.json" 2>/dev/null)"

# ============================================================================
# ④ 测试文件计数（test/spec 目录 + 命名约定）
# ============================================================================
pruned_find -type f \
  \( -name '*Test.java' -o -name '*Tests.java' -o -name '*_test.go' \
     -o -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.test.js' -o -name '*.test.mjs' \
     -o -name '*.spec.ts' -o -name '*.spec.tsx' -o -name '*.spec.js' -o -name '*.spec.mjs' \
     -o -name 'test_*.py' -o -name '*_test.py' -o -name '*_spec.rb' \
     -o -name '*Test.kt' -o -name '*Spec.scala' \) \
  -print 2>/dev/null | sed "s#^$ROOT_ABS/##" | sort > "$TMP/test_files.txt"
TEST_FILE_COUNT=$(wc -l < "$TMP/test_files.txt" | tr -d ' ')

# 测试目录
pruned_find -type d \( -name test -o -name tests -o -name spec -o -name __tests__ -o -name __test__ \) \
  -print 2>/dev/null | sed "s#^$ROOT_ABS/##" | sort > "$TMP/test_dirs.txt"
head -n 20 "$TMP/test_files.txt" > "$TMP/test_samples.txt" 2>/dev/null

# ============================================================================
# ⑤ DB 迁移文件清单（db/migration 目录 + *.sql）
# ============================================================================
pruned_find -type f -name '*.sql' -print 2>/dev/null | sed "s#^$ROOT_ABS/##" | sort > "$TMP/sql_files.txt"
pruned_find -type d \( -name migration -o -name migrations -o -name migrate -o -name db \) \
  -print 2>/dev/null | sed "s#^$ROOT_ABS/##" | sort > "$TMP/migration_dirs.txt"
SQL_COUNT=$(wc -l < "$TMP/sql_files.txt" | tr -d ' ')
head -n 50 "$TMP/sql_files.txt" > "$TMP/sql_samples.txt" 2>/dev/null

# ============================================================================
# ⑥ README / docs 探测
# ============================================================================
pruned_find -maxdepth 2 -type f \
  \( -iname 'README*' -o -iname 'ARCHITECTURE*' -o -iname 'CONTRIBUTING*' \
     -o -iname 'CHANGELOG*' -o -iname 'CLAUDE.md' -o -iname 'AGENTS.md' \) \
  -print 2>/dev/null | sed "s#^$ROOT_ABS/##" | sort > "$TMP/doc_files.txt"
if [ -d "$ROOT_ABS/docs" ]; then DOCS_DIR=true; else DOCS_DIR=false; fi

# ============================================================================
# 组装 JSON
# ============================================================================
{
  printf '{\n'
  printf '  "schema_version": 1,\n'
  printf '  "tool": "recon-probe.sh (future: tf recon)",\n'
  printf '  "root": "%s",\n' "$(json_escape "$ROOT_ABS")"
  printf '  "generated_at": "%s",\n' "$GENERATED_AT"
  # ① 目录树
  printf '  "directory_tree": {"max_depth": %d, "dir_count": %s, "dirs": %s},\n' \
    "$TREE_DEPTH" "$DIR_COUNT" "$(json_array_from_file "$TMP/dirs.txt")"
  # ② 依赖清单
  printf '  "dependencies": {"manifests": [%s]},\n' "$MANIFESTS_JSON"
  # ③ LOC 与文件类型分布
  printf '  "loc": {"total_files": %s, "total_lines": %s, "max_files_cap": %d, "by_extension": [%s]},\n' \
    "$TOTAL_FILES" "$TOTAL_LINES" "$MAX_FILES" "$BYEXT_JSON"
  # ④ 测试
  printf '  "tests": {"test_file_count": %s, "test_dirs": %s, "sample_files": %s},\n' \
    "$TEST_FILE_COUNT" \
    "$(json_array_from_file "$TMP/test_dirs.txt")" \
    "$(json_array_from_file "$TMP/test_samples.txt")"
  # ⑤ DB 迁移
  printf '  "db_migrations": {"sql_count": %s, "migration_dirs": %s, "sample_files": %s},\n' \
    "$SQL_COUNT" \
    "$(json_array_from_file "$TMP/migration_dirs.txt")" \
    "$(json_array_from_file "$TMP/sql_samples.txt")"
  # ⑥ docs
  printf '  "docs": {"docs_dir": %s, "doc_files": %s}\n' \
    "$DOCS_DIR" "$(json_array_from_file "$TMP/doc_files.txt")"
  printf '}\n'
} > "$TMP/out.json"

# ============================================================================
# 输出：JSON（--out 或 stdout，jq 可选美化）+ 人类可读摘要（stderr）
# ============================================================================
emit_json() {
  if command -v jq >/dev/null 2>&1; then
    jq '.' "$TMP/out.json" 2>/dev/null || cat "$TMP/out.json"
  else
    # 无 jq：降级为脚本自建的合法 JSON 文本
    cat "$TMP/out.json"
  fi
}
if [ -n "$OUT" ]; then
  emit_json > "$OUT"
  echo "[recon-probe] JSON written to: $OUT" >&2
else
  emit_json
fi

# 人类可读摘要 → stderr
{
  echo "================ recon-probe 摘要 ================"
  echo "root        : $ROOT_ABS"
  echo "目录(≤${TREE_DEPTH}层)  : $DIR_COUNT 个"
  echo "源码文件     : $TOTAL_FILES 个 / $TOTAL_LINES 行 (cap $MAX_FILES)"
  echo "依赖 manifest: $(grep -c '"file"' "$TMP/dep_manifests.json" 2>/dev/null || echo 0) 个"
  echo "测试文件     : $TEST_FILE_COUNT 个"
  echo "SQL 迁移     : $SQL_COUNT 个"
  echo "docs/ 目录   : $DOCS_DIR"
  echo "README 等    : $(wc -l < "$TMP/doc_files.txt" | tr -d ' ') 个"
  echo "================================================="
} >&2

exit 0
