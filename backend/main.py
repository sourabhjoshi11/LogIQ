"""
LogIQ - AI-Powered Log Intelligence Platform
Backend: FastAPI + Parser Engine + AI Engine
Production-ready MVP
"""

from __future__ import annotations

import re
import json
import time
import hashlib
import os
from abc import ABC, abstractmethod
from collections import defaultdict, Counter, deque
from datetime import datetime
from typing import Any, Optional
from enum import Enum

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx

# ─────────────────────────────────────────────
# Enums & Constants
# ─────────────────────────────────────────────

class LogLevel(str, Enum):
    DEBUG    = "DEBUG"
    TRACE    = "TRACE"
    INFO     = "INFO"
    NOTICE   = "NOTICE"
    VERBOSE  = "VERBOSE"
    SILLY    = "SILLY"
    WARNING  = "WARNING"
    ERROR    = "ERROR"
    CRITICAL = "CRITICAL"
    FATAL    = "FATAL"
    ALERT    = "ALERT"
    EMERG    = "EMERG"
    UNKNOWN  = "UNKNOWN"

class LogFormat(str, Enum):
    PYTHON      = "python"
    FASTAPI     = "fastapi"
    DJANGO      = "django"
    NODEJS      = "nodejs"
    EXPRESS     = "express"
    JAVA        = "java"
    SPRING_BOOT = "spring_boot"
    DOCKER      = "docker"
    KUBERNETES  = "kubernetes"
    AWS_LAMBDA  = "aws_lambda"
    NGINX       = "nginx"
    APACHE      = "apache"
    JSON        = "json"
    GENERIC     = "generic"

LEVEL_ALIASES: dict[str, LogLevel] = {
    "debug":     LogLevel.DEBUG,
    "trace":     LogLevel.TRACE,
    "info":      LogLevel.INFO,
    "notice":    LogLevel.NOTICE,
    "verbose":   LogLevel.VERBOSE,
    "silly":     LogLevel.SILLY,
    "warn":      LogLevel.WARNING,
    "warning":   LogLevel.WARNING,
    "error":     LogLevel.ERROR,
    "err":       LogLevel.ERROR,
    "critical":  LogLevel.CRITICAL,
    "fatal":     LogLevel.FATAL,
    "alert":     LogLevel.ALERT,
    "emerg":     LogLevel.EMERG,
    "emergency": LogLevel.EMERG,
    "severe":    LogLevel.CRITICAL,
    "crit":      LogLevel.CRITICAL,
}

SEVERITY_GROUPS: dict[LogLevel, str] = {
    LogLevel.TRACE: "low",
    LogLevel.DEBUG: "low",
    LogLevel.VERBOSE: "low",
    LogLevel.SILLY: "low",
    LogLevel.INFO: "info",
    LogLevel.NOTICE: "info",
    LogLevel.WARNING: "warning",
    LogLevel.ERROR: "high",
    LogLevel.CRITICAL: "high",
    LogLevel.FATAL: "high",
    LogLevel.ALERT: "high",
    LogLevel.EMERG: "high",
    LogLevel.UNKNOWN: "unknown",
}

def _severity_group(level: LogLevel) -> str:
    return SEVERITY_GROUPS.get(level, "unknown")

HIGH_SEVERITY_LEVELS = {
    LogLevel.ERROR,
    LogLevel.CRITICAL,
    LogLevel.FATAL,
    LogLevel.ALERT,
    LogLevel.EMERG,
}

SUMMARY_SEVERITY_LEVELS = {
    LogLevel.WARNING,
    *HIGH_SEVERITY_LEVELS,
}

def _csv_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]

FRONTEND_ORIGINS = _csv_env(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "100"))

_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)

def _check_rate_limit(request: Request, bucket: str, max_requests: int, window_seconds: int) -> None:
    client = request.client.host if request.client else "unknown"
    key = f"{bucket}:{client}"
    now = time.monotonic()
    hits = _RATE_BUCKETS[key]

    while hits and now - hits[0] > window_seconds:
        hits.popleft()

    if len(hits) >= max_requests:
        raise HTTPException(429, "Too many requests. Please wait a moment and try again.")

    hits.append(now)

# ─────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────

class LogEvent(BaseModel):
    id:           str
    line_number:  int
    timestamp:    Optional[str]    = None
    level:        LogLevel         = LogLevel.UNKNOWN
    service:      Optional[str]    = None
    module:       Optional[str]    = None
    logger:       Optional[str]    = None
    request_id:   Optional[str]    = None
    trace_id:     Optional[str]    = None
    user_id:      Optional[str]    = None
    http_method:  Optional[str]    = None
    url:          Optional[str]    = None
    status_code:  Optional[int]    = None
    duration_ms:  Optional[float]  = None
    exception:    Optional[str]    = None
    stack_trace:  Optional[str]    = None
    message:      str              = ""
    raw:          str              = ""
    extra:        dict[str, Any]   = Field(default_factory=dict)

class RequestGroup(BaseModel):
    group_id:    str
    request_id:  Optional[str]
    trace_id:    Optional[str]
    events:      list[str]          # list of LogEvent ids
    start_time:  Optional[str]
    end_time:    Optional[str]
    duration_ms: Optional[float]
    has_error:   bool = False

class Statistics(BaseModel):
    total_lines:       int
    total_events:      int
    level_counts:      dict[str, int]
    top_exceptions:    list[dict[str, Any]]
    top_services:      list[dict[str, Any]]
    avg_response_ms:   Optional[float]
    slowest_requests:  list[dict[str, Any]]
    error_rate:        float
    time_range:        dict[str, Optional[str]]

class ParseResult(BaseModel):
    format:       LogFormat
    events:       list[LogEvent]
    groups:       list[RequestGroup]
    statistics:   Statistics
    timeline:     list[dict[str, Any]]
    parse_time_ms: float

class ParseRequest(BaseModel):
    content: str
    filename: Optional[str] = None

class AIRequest(BaseModel):
    events:      list[LogEvent]
    user_query:  Optional[str] = "Explain the root cause of the issues in these logs."
    provider:    Optional[str] = "anthropic"
    api_key:     Optional[str] = None

class AIResponse(BaseModel):
    root_cause:       str
    confidence:       str
    explanation:      str
    possible_fixes:   list[str]
    next_steps:       list[str]

# ─────────────────────────────────────────────
# Parser Engine — Base + Implementations
# ─────────────────────────────────────────────

def _make_id(line: int, raw: str) -> str:
    h = hashlib.md5(f"{line}:{raw[:40]}".encode()).hexdigest()[:8]
    return f"evt_{line}_{h}"

def _normalize_level(raw: str) -> LogLevel:
    return LEVEL_ALIASES.get(raw.strip().lower(), LogLevel.UNKNOWN)


class BaseParser(ABC):
    """Every parser must implement parse(). Pluggable architecture."""

    @abstractmethod
    def parse(self, log_text: str) -> list[LogEvent]:
        ...

    @abstractmethod
    def can_parse(self, sample: str) -> float:
        """Return confidence score 0.0–1.0 that this parser handles the sample."""
        ...

    # ── shared helpers ──────────────────────────────────────────────────

    _TS_PATTERNS = [
        r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?',
        r'\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2}',
        r'\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}',
        r'\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2}',
    ]

    def _extract_timestamp(self, text: str) -> Optional[str]:
        for pat in self._TS_PATTERNS:
            m = re.search(pat, text)
            if m:
                return m.group(0)
        return None

    def _extract_level(self, text: str) -> LogLevel:
        m = re.search(
            r'\b(DEBUG|TRACE|INFO|NOTICE|VERBOSE|SILLY|WARN(?:ING)?|ERROR|ERR|CRITICAL|FATAL|ALERT|EMERG|SEVERE)\b',
            text, re.IGNORECASE
        )
        return _normalize_level(m.group(1)) if m else LogLevel.UNKNOWN

    def _extract_request_id(self, text: str) -> Optional[str]:
        patterns = [
            r'request[-_]?id[=:\s]+([a-f0-9-]{8,})',
            r'req[-_]?id[=:\s]+([a-f0-9-]{8,})',
            r'\breqid[=:\s]+([a-zA-Z0-9-]{6,})',
            r'\brid[=:\s]+([a-zA-Z0-9-]{6,})',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return m.group(1)
        return None

    def _extract_trace_id(self, text: str) -> Optional[str]:
        patterns = [
            r'trace[-_]?id[=:\s]+([a-f0-9-]{8,})',
            r'traceid[=:\s]+([a-f0-9-]{8,})',
            r'x-trace[=:\s]+([a-f0-9-]{8,})',
        ]
        for p in patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                return m.group(1)
        return None

    def _extract_http(self, text: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        m = re.search(r'\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b', text)
        if m:
            result['http_method'] = m.group(1)
        m = re.search(r'(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(/[^\s"\']*)', text)
        if m:
            result['url'] = m.group(2)
        m = re.search(r'\b([1-5]\d{2})\b', text)
        if m:
            result['status_code'] = int(m.group(1))
        m = re.search(r'(\d+(?:\.\d+)?)\s*ms\b', text, re.IGNORECASE)
        if m:
            result['duration_ms'] = float(m.group(1))
        return result

    def _detect_exception(self, text: str) -> Optional[str]:
        patterns = [
            r'([A-Z][a-zA-Z]+(?:Exception|Error|Fault|Panic)(?::[^\n]*)?)',
            r'Traceback \(most recent call last\)',
            r'Error: .+',
        ]
        for p in patterns:
            m = re.search(p, text)
            if m:
                return m.group(0)[:200]
        return None

    def _extract_stack_trace(self, lines: list[str], start: int) -> tuple[Optional[str], int]:
        """Collect stack trace lines starting at `start`. Returns (trace, end_index)."""
        stack_lines = []
        i = start
        while i < len(lines):
            l = lines[i]
            if re.match(r'\s+(at |File "|in <)', l) or re.match(r'^\s+\^', l):
                stack_lines.append(l)
                i += 1
            elif stack_lines and l.strip() == '':
                i += 1
                break
            else:
                break
        trace = '\n'.join(stack_lines) if stack_lines else None
        return trace, i


class PythonParser(BaseParser):
    """Handles Python logging output and tracebacks."""

    _PATTERN = re.compile(
        r'^(?P<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s+'
        r'(?P<level>TRACE|DEBUG|INFO|NOTICE|VERBOSE|SILLY|WARNING|ERROR|CRITICAL|FATAL|ALERT|EMERG)\s+'
        r'(?P<logger>[\w.]+)\s*[-:]?\s*'
        r'(?P<msg>.*)',
        re.IGNORECASE
    )
    _TB_START = re.compile(r'^Traceback \(most recent call last\):', re.IGNORECASE)

    def can_parse(self, sample: str) -> float:
        hits = len(self._PATTERN.findall(sample[:3000]))
        tb   = len(self._TB_START.findall(sample[:3000]))
        return min(1.0, (hits * 0.15) + (tb * 0.2))

    def parse(self, log_text: str) -> list[LogEvent]:
        lines  = log_text.splitlines()
        events: list[LogEvent] = []
        i = 0
        while i < len(lines):
            raw  = lines[i]
            m    = self._PATTERN.match(raw)
            if m:
                level = _normalize_level(m.group('level'))
                exc   = self._detect_exception(m.group('msg'))
                # peek for traceback
                trace, next_i = self._extract_stack_trace(lines, i + 1)
                ev = LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = m.group('ts'),
                    level       = level,
                    logger      = m.group('logger'),
                    exception   = exc,
                    stack_trace = trace,
                    message     = m.group('msg').strip(),
                    raw         = raw,
                    **self._extract_http(raw),
                    request_id  = self._extract_request_id(raw),
                    trace_id    = self._extract_trace_id(raw),
                )
                events.append(ev)
                i = next_i
            elif self._TB_START.match(raw):
                trace, next_i = self._extract_stack_trace(lines, i + 1)
                exc_type = None
                if next_i < len(lines):
                    exc_type = self._detect_exception(lines[next_i])
                ev = LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = self._extract_timestamp(raw),
                    level       = LogLevel.ERROR,
                    exception   = exc_type or "Traceback",
                    stack_trace = trace,
                    message     = raw.strip(),
                    raw         = raw,
                )
                events.append(ev)
                i = next_i + 1
            else:
                if raw.strip():
                    events.append(LogEvent(
                        id          = _make_id(i, raw),
                        line_number = i + 1,
                        timestamp   = self._extract_timestamp(raw),
                        level       = self._extract_level(raw),
                        message     = raw.strip(),
                        raw         = raw,
                    ))
                i += 1
        return events


class NodeParser(BaseParser):
    """Handles Node.js / Express / Winston / Morgan log formats."""

    _WINSTON = re.compile(
        r'(?P<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z?)\s+'
        r'(?P<level>trace|debug|info|notice|warn(?:ing)?|error|verbose|silly|fatal|alert|emerg)\s*:\s*'
        r'(?P<msg>.*)',
        re.IGNORECASE
    )
    _MORGAN  = re.compile(
        r'(?P<method>GET|POST|PUT|DELETE|PATCH)\s+(?P<url>/\S*)\s+'
        r'(?P<status>\d{3})\s+(?P<ms>[\d.]+)\s*ms'
    )

    def can_parse(self, sample: str) -> float:
        w = len(self._WINSTON.findall(sample[:3000]))
        m = len(self._MORGAN.findall(sample[:3000]))
        node_kw = len(re.findall(r'\b(require|module\.exports|express|node\.js|npm)\b', sample[:3000], re.I))
        return min(1.0, w * 0.15 + m * 0.1 + node_kw * 0.05)

    def parse(self, log_text: str) -> list[LogEvent]:
        events: list[LogEvent] = []
        for i, raw in enumerate(log_text.splitlines()):
            if not raw.strip():
                continue
            wm = self._WINSTON.match(raw)
            mm = self._MORGAN.search(raw)
            if wm:
                events.append(LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = wm.group('ts'),
                    level       = _normalize_level(wm.group('level')),
                    exception   = self._detect_exception(wm.group('msg')),
                    message     = wm.group('msg').strip(),
                    raw         = raw,
                    request_id  = self._extract_request_id(raw),
                    trace_id    = self._extract_trace_id(raw),
                    **self._extract_http(raw),
                ))
            elif mm:
                events.append(LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = self._extract_timestamp(raw),
                    level       = LogLevel.INFO,
                    http_method = mm.group('method'),
                    url         = mm.group('url'),
                    status_code = int(mm.group('status')),
                    duration_ms = float(mm.group('ms')),
                    message     = raw.strip(),
                    raw         = raw,
                ))
            else:
                events.append(LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = self._extract_timestamp(raw),
                    level       = self._extract_level(raw),
                    message     = raw.strip(),
                    raw         = raw,
                    **self._extract_http(raw),
                ))
        return events


class JavaParser(BaseParser):
    """Handles Java / Spring Boot / Log4j / SLF4J / Logback formats."""

    _PATTERN = re.compile(
        r'(?P<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[.,]\d+)\s+'
        r'(?P<level>TRACE|DEBUG|INFO|NOTICE|WARN(?:ING)?|ERROR|FATAL|CRITICAL|ALERT|EMERG)\s+'
        r'(?:\[(?P<thread>[^\]]*)\]\s+)?'
        r'(?P<logger>[\w.$]+)\s*[-:]\s*'
        r'(?P<msg>.*)',
        re.IGNORECASE
    )

    def can_parse(self, sample: str) -> float:
        hits = len(self._PATTERN.findall(sample[:3000]))
        java_kw = len(re.findall(
            r'\b(Exception|StackTrace|java\.|org\.|com\.|springframework|hibernate)\b',
            sample[:3000]
        ))
        return min(1.0, hits * 0.15 + java_kw * 0.05)

    def parse(self, log_text: str) -> list[LogEvent]:
        lines  = log_text.splitlines()
        events: list[LogEvent] = []
        i = 0
        while i < len(lines):
            raw = lines[i]
            m   = self._PATTERN.match(raw)
            if m:
                trace, next_i = self._extract_stack_trace(lines, i + 1)
                exc = self._detect_exception(m.group('msg'))
                events.append(LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = m.group('ts'),
                    level       = _normalize_level(m.group('level')),
                    logger      = m.group('logger'),
                    exception   = exc,
                    stack_trace = trace,
                    message     = m.group('msg').strip(),
                    raw         = raw,
                    **self._extract_http(raw),
                    request_id  = self._extract_request_id(raw),
                ))
                i = next_i
            else:
                if raw.strip():
                    events.append(LogEvent(
                        id          = _make_id(i, raw),
                        line_number = i + 1,
                        timestamp   = self._extract_timestamp(raw),
                        level       = self._extract_level(raw),
                        message     = raw.strip(),
                        raw         = raw,
                    ))
                i += 1
        return events


class NginxParser(BaseParser):
    """Handles NGINX access and error log formats."""

    _ACCESS = re.compile(
        r'(?P<ip>[\d.]+)\s+-\s+-\s+\[(?P<ts>[^\]]+)\]\s+'
        r'"(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+HTTP/[\d.]+"\s+'
        r'(?P<status>\d{3})\s+(?P<size>\d+)'
        r'(?:\s+"[^"]*"\s+"(?P<ua>[^"]*)")?'
    )
    _ERROR = re.compile(
        r'(?P<ts>\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})\s+'
        r'\[(?P<level>debug|trace|info|notice|warn|error|crit|critical|fatal|alert|emerg|verbose|silly)\]\s+'
        r'(?P<msg>.*)'
    )

    def can_parse(self, sample: str) -> float:
        a = len(self._ACCESS.findall(sample[:3000]))
        e = len(self._ERROR.findall(sample[:3000]))
        return min(1.0, (a + e) * 0.2)

    def parse(self, log_text: str) -> list[LogEvent]:
        events: list[LogEvent] = []
        for i, raw in enumerate(log_text.splitlines()):
            if not raw.strip():
                continue
            am = self._ACCESS.match(raw)
            em = self._ERROR.match(raw)
            if am:
                status = int(am.group('status'))
                level  = LogLevel.ERROR if status >= 500 else (
                    LogLevel.WARNING if status >= 400 else LogLevel.INFO
                )
                events.append(LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = am.group('ts'),
                    level       = level,
                    http_method = am.group('method'),
                    url         = am.group('url'),
                    status_code = status,
                    message     = f"{am.group('method')} {am.group('url')} → {status}",
                    raw         = raw,
                ))
            elif em:
                events.append(LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = em.group('ts'),
                    level       = _normalize_level(em.group('level')),
                    service     = "nginx",
                    message     = em.group('msg').strip(),
                    raw         = raw,
                ))
            else:
                events.append(LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    timestamp   = self._extract_timestamp(raw),
                    level       = self._extract_level(raw),
                    message     = raw.strip(),
                    raw         = raw,
                ))
        return events


class JSONParser(BaseParser):
    """Handles JSON-structured log lines (one JSON object per line)."""

    def can_parse(self, sample: str) -> float:
        lines   = [l.strip() for l in sample[:3000].splitlines() if l.strip()]
        if not lines:
            return 0.0
        parsed  = sum(1 for l in lines[:20] if l.startswith('{') and l.endswith('}'))
        return min(1.0, parsed / max(1, min(20, len(lines))))

    def parse(self, log_text: str) -> list[LogEvent]:
        events: list[LogEvent] = []
        for i, raw in enumerate(log_text.splitlines()):
            raw = raw.strip()
            if not raw:
                continue
            try:
                data: dict[str, Any] = json.loads(raw)
            except json.JSONDecodeError:
                events.append(LogEvent(
                    id          = _make_id(i, raw),
                    line_number = i + 1,
                    level       = self._extract_level(raw),
                    message     = raw,
                    raw         = raw,
                ))
                continue

            # map common JSON log keys
            level_raw = (
                data.get('level') or data.get('severity') or
                data.get('lvl') or data.get('log_level') or ''
            )
            ts = (
                data.get('timestamp') or data.get('time') or
                data.get('ts') or data.get('@timestamp') or
                data.get('datetime')
            )
            msg = (
                data.get('message') or data.get('msg') or
                data.get('event') or data.get('text') or ''
            )
            events.append(LogEvent(
                id          = _make_id(i, raw),
                line_number = i + 1,
                timestamp   = str(ts) if ts else None,
                level       = _normalize_level(str(level_raw)),
                service     = data.get('service') or data.get('app') or data.get('name'),
                logger      = data.get('logger') or data.get('logger_name'),
                request_id  = data.get('request_id') or data.get('req_id') or data.get('requestId'),
                trace_id    = data.get('trace_id') or data.get('traceId'),
                user_id     = data.get('user_id') or data.get('userId'),
                http_method = data.get('method'),
                url         = data.get('url') or data.get('path'),
                status_code = data.get('status') or data.get('status_code'),
                duration_ms = data.get('duration_ms') or data.get('responseTime') or data.get('elapsed_ms'),
                exception   = data.get('error') or data.get('exception'),
                message     = str(msg),
                raw         = raw,
                extra       = {k: v for k, v in data.items()
                               if k not in {'level','severity','lvl','log_level','timestamp',
                                            'time','ts','@timestamp','datetime','message','msg',
                                            'event','text','service','app','name','logger',
                                            'logger_name','request_id','req_id','requestId',
                                            'trace_id','traceId','user_id','userId','method',
                                            'url','path','status','status_code','duration_ms',
                                            'responseTime','elapsed_ms','error','exception'}},
            ))
        return events


class GenericParser(BaseParser):
    """Fallback parser — handles any unknown format best-effort."""

    def can_parse(self, sample: str) -> float:
        return 0.1  # always last resort

    def parse(self, log_text: str) -> list[LogEvent]:
        events: list[LogEvent] = []
        lines  = log_text.splitlines()
        i = 0
        while i < len(lines):
            raw = lines[i]
            if not raw.strip():
                i += 1
                continue
            level = self._extract_level(raw)
            exc   = self._detect_exception(raw)
            trace, next_i = None, i + 1
            if exc:
                trace, next_i = self._extract_stack_trace(lines, i + 1)
            events.append(LogEvent(
                id          = _make_id(i, raw),
                line_number = i + 1,
                timestamp   = self._extract_timestamp(raw),
                level       = level,
                exception   = exc,
                stack_trace = trace,
                message     = raw.strip(),
                raw         = raw,
                **self._extract_http(raw),
                request_id  = self._extract_request_id(raw),
                trace_id    = self._extract_trace_id(raw),
            ))
            i = next_i
        return events


# ─────────────────────────────────────────────
# Parser Factory
# ─────────────────────────────────────────────

class ParserFactory:
    """Auto-selects the best parser for a given log sample."""

    _parsers: list[BaseParser] = [
        JSONParser(),
        PythonParser(),
        NodeParser(),
        JavaParser(),
        NginxParser(),
        GenericParser(),
    ]

    @classmethod
    def detect(cls, log_text: str) -> tuple[BaseParser, LogFormat]:
        sample  = log_text[:5000]
        scores  = [(p, p.can_parse(sample)) for p in cls._parsers]
        best, _ = max(scores, key=lambda x: x[1])

        format_map = {
            JSONParser:    LogFormat.JSON,
            PythonParser:  LogFormat.PYTHON,
            NodeParser:    LogFormat.NODEJS,
            JavaParser:    LogFormat.JAVA,
            NginxParser:   LogFormat.NGINX,
            GenericParser: LogFormat.GENERIC,
        }
        return best, format_map[type(best)]

    @classmethod
    def parse(cls, log_text: str) -> tuple[LogFormat, list[LogEvent]]:
        parser, fmt = cls.detect(log_text)
        return fmt, parser.parse(log_text)


# ─────────────────────────────────────────────
# Correlation Engine
# ─────────────────────────────────────────────

def build_groups(events: list[LogEvent]) -> list[RequestGroup]:
    buckets: dict[str, list[LogEvent]] = defaultdict(list)
    ungrouped: list[LogEvent] = []

    for ev in events:
        key = ev.request_id or ev.trace_id
        if key:
            buckets[key].append(ev)
        else:
            ungrouped.append(ev)

    # group ungrouped by timestamp proximity (within 100 ms window)
    proximity_groups: list[list[LogEvent]] = []
    current: list[LogEvent] = []
    for ev in ungrouped:
        if not current:
            current.append(ev)
        else:
            last_ts = current[-1].timestamp
            curr_ts = ev.timestamp
            if last_ts and curr_ts:
                # naive proximity: same second prefix
                if last_ts[:19] == curr_ts[:19]:
                    current.append(ev)
                    continue
            if len(current) >= 2:
                proximity_groups.append(current)
            current = [ev]
    if len(current) >= 2:
        proximity_groups.append(current)

    groups: list[RequestGroup] = []

    for key, evs in buckets.items():
        has_err = any(e.level in HIGH_SEVERITY_LEVELS for e in evs)
        groups.append(RequestGroup(
            group_id   = f"grp_{key[:12]}",
            request_id = evs[0].request_id,
            trace_id   = evs[0].trace_id,
            events     = [e.id for e in evs],
            start_time = evs[0].timestamp,
            end_time   = evs[-1].timestamp,
            duration_ms= evs[0].duration_ms,
            has_error  = has_err,
        ))

    for idx, evs in enumerate(proximity_groups):
        has_err = any(e.level in HIGH_SEVERITY_LEVELS for e in evs)
        groups.append(RequestGroup(
            group_id   = f"prx_{idx}",
            request_id = None,
            trace_id   = None,
            events     = [e.id for e in evs],
            start_time = evs[0].timestamp,
            end_time   = evs[-1].timestamp,
            duration_ms= None,
            has_error  = has_err,
        ))

    return groups


# ─────────────────────────────────────────────
# Statistics Engine
# ─────────────────────────────────────────────

def compute_statistics(events: list[LogEvent], total_lines: int) -> Statistics:
    level_counts: Counter[str] = Counter()
    exceptions:   Counter[str] = Counter()
    services:     Counter[str] = Counter()
    durations:    list[float]  = []
    slowest:      list[dict]   = []

    for ev in events:
        level_counts[ev.level.value] += 1
        if ev.exception:
            exc_key = ev.exception.split(':')[0].strip()[:60]
            exceptions[exc_key] += 1
        if ev.service:
            services[ev.service] += 1
        if ev.duration_ms is not None:
            durations.append(ev.duration_ms)
            slowest.append({'url': ev.url, 'duration_ms': ev.duration_ms, 'id': ev.id})

    slowest.sort(key=lambda x: x['duration_ms'], reverse=True)

    timestamps = [e.timestamp for e in events if e.timestamp]

    total = max(1, sum(level_counts.values()))
    errors = sum(level_counts.get(level.value, 0) for level in HIGH_SEVERITY_LEVELS)

    return Statistics(
        total_lines      = total_lines,
        total_events     = len(events),
        level_counts     = dict(level_counts),
        top_exceptions   = [{'exception': k, 'count': v} for k, v in exceptions.most_common(10)],
        top_services     = [{'service': k, 'count': v} for k, v in services.most_common(10)],
        avg_response_ms  = round(sum(durations) / len(durations), 2) if durations else None,
        slowest_requests = slowest[:5],
        error_rate       = round(errors / total * 100, 1),
        time_range       = {
            'start': timestamps[0]  if timestamps else None,
            'end':   timestamps[-1] if timestamps else None,
        },
    )


# ─────────────────────────────────────────────
# Timeline Engine
# ─────────────────────────────────────────────

def build_timeline(events: list[LogEvent]) -> list[dict[str, Any]]:
    """Build a chronological timeline of significant events."""
    SIGNIFICANT = SUMMARY_SEVERITY_LEVELS
    timeline: list[dict[str, Any]] = []

    for ev in events:
        if ev.level in SIGNIFICANT or ev.exception or ev.http_method:
            timeline.append({
                'id':        ev.id,
                'timestamp': ev.timestamp,
                'level':     ev.level.value,
                'message':   ev.message[:120],
                'exception': ev.exception,
                'url':       ev.url,
                'method':    ev.http_method,
                'status':    ev.status_code,
            })

    return timeline[:200]  # cap at 200 entries for frontend perf


# ─────────────────────────────────────────────
# AI Engine
# ─────────────────────────────────────────────

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
GROQ_API_URL = "https://api.groq.com/openai/v1/responses"

def build_ai_prompt(events: list[LogEvent], user_query: str) -> str:
    """Build a tight, focused prompt — only send relevant events to the AI."""
    important = [e for e in events if e.level in SUMMARY_SEVERITY_LEVELS]
    with_exc  = [e for e in events if e.exception]

    selected_ids: set[str] = set()
    selected: list[LogEvent] = []
    for ev in (important + with_exc)[:30]:
        if ev.id not in selected_ids:
            selected.append(ev)
            selected_ids.add(ev.id)

    summary_lines = []
    for ev in selected:
        line = f"[{ev.level.value}] {ev.timestamp or ''} {ev.message[:200]}"
        if ev.exception:
            line += f"\n  Exception: {ev.exception}"
        if ev.stack_trace:
            line += f"\n  Stack: {ev.stack_trace[:300]}"
        if ev.url:
            line += f"\n  {ev.http_method or 'HTTP'} {ev.url} → {ev.status_code}"
        summary_lines.append(line)

    prompt = f"""You are a senior SRE analyzing production logs.

User query: {user_query}

Here are the most critical/relevant log events:

{chr(10).join(summary_lines) if summary_lines else "No critical events found — logs appear healthy."}

Respond ONLY with valid JSON in this exact schema:
{{
  "root_cause": "One-sentence root cause",
  "confidence": "high|medium|low",
  "explanation": "2-3 paragraph detailed explanation",
  "possible_fixes": ["fix 1", "fix 2", "fix 3"],
  "next_steps": ["step 1", "step 2", "step 3"]
}}"""

    return prompt


async def call_anthropic(prompt: str, api_key: str) -> AIResponse:
    if not api_key:
        raise HTTPException(503, "AI is not configured. Set an Anthropic API key on the server or provide one from the browser.")

    headers = {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": api_key,
    }
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}],
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(ANTHROPIC_API_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        text = data['content'][0]['text'].strip()

    # strip possible markdown fences
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)

    parsed = json.loads(text)
    return AIResponse(**parsed)


def _extract_groq_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        for key in ("output", "text", "content", "message", "response", "result", "generated_text"):
            if key in value:
                extracted = _extract_groq_text(value[key])
                if extracted:
                    return extracted
        for item in value.values():
            extracted = _extract_groq_text(item)
            if extracted:
                return extracted
        return None
    if isinstance(value, list):
        parts: list[str] = []
        for item in value:
            extracted = _extract_groq_text(item)
            if extracted:
                parts.append(extracted)
        return "\n".join(parts).strip() if parts else None
    return None


async def call_groq(prompt: str, api_key: str) -> AIResponse:
    if not api_key:
        raise HTTPException(503, "Groq is not configured. Provide a Groq API key from the browser or server.")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "LogIQ/1.0",
    }
    payload = {
        "model": GROQ_MODEL,
        "input": prompt,
        "max_output_tokens": 1024,
    }
    url = GROQ_API_URL

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    text = None
    if isinstance(data, dict):
        text = _extract_groq_text(data.get("outputs"))
        if not text:
            text = _extract_groq_text(data.get("output"))
        if not text:
            text = _extract_groq_text(data)

    if not isinstance(text, str) or not text.strip():
        raise HTTPException(502, f"Groq returned malformed response: {json.dumps(data)[:400]}")

    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)

    parsed = json.loads(text)
    return AIResponse(**parsed)


# ─────────────────────────────────────────────
# FastAPI Application
# ─────────────────────────────────────────────

app = FastAPI(
    title       = "LogIQ API",
    description = "AI-Powered Log Intelligence Platform",
    version     = "1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins  = FRONTEND_ORIGINS,
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/parse", response_model=ParseResult)
async def parse_logs(body: ParseRequest, request: Request):
    _check_rate_limit(request, "parse", max_requests=30, window_seconds=60)
    if not body.content.strip():
        raise HTTPException(400, "Log content cannot be empty.")

    t0 = time.perf_counter()

    fmt, events = ParserFactory.parse(body.content)
    groups      = build_groups(events)
    stats       = compute_statistics(events, total_lines=len(body.content.splitlines()))
    timeline    = build_timeline(events)

    elapsed = round((time.perf_counter() - t0) * 1000, 2)

    return ParseResult(
        format       = fmt,
        events       = events,
        groups       = groups,
        statistics   = stats,
        timeline     = timeline,
        parse_time_ms= elapsed,
    )


@app.post("/api/upload", response_model=ParseResult)
async def upload_log(request: Request, file: UploadFile = File(...)):
    _check_rate_limit(request, "upload", max_requests=10, window_seconds=300)
    allowed = {'.log', '.txt', '.out', '.json'}
    suffix  = '.' + (file.filename or '').rsplit('.', 1)[-1].lower()
    if suffix not in allowed:
        raise HTTPException(400, f"Unsupported file type: {suffix}")

    content_bytes = await file.read()
    if len(content_bytes) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {MAX_UPLOAD_MB}MB limit.")

    try:
        text = content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        text = content_bytes.decode('latin-1')

    body = ParseRequest(content=text, filename=file.filename)
    return await parse_logs(body, request)


@app.post("/api/explain", response_model=AIResponse)
async def explain_logs(body: AIRequest, request: Request):
    _check_rate_limit(request, "explain", max_requests=10, window_seconds=60)
    if not body.events:
        raise HTTPException(400, "No events provided.")

    prompt = build_ai_prompt(body.events, body.user_query or "Explain root cause")
    provider = (body.provider or "anthropic").strip().lower()
    api_key = body.api_key

    try:
        if provider == "groq":
            api_key = api_key or GROQ_API_KEY
            return await call_groq(prompt, api_key)

        if provider in {"anthropic", "claude"}:
            api_key = api_key or ANTHROPIC_API_KEY
            return await call_anthropic(prompt, api_key)

        raise HTTPException(400, "Unsupported AI provider. Use 'anthropic' or 'groq'.")
    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(502, f"AI service returned an error ({exc.response.status_code if exc.response is not None else 'n/a'}): {detail[:200]}")
    except json.JSONDecodeError as exc:
        raise HTTPException(502, f"AI returned malformed response: {str(exc)}")
    except Exception as exc:
        raise HTTPException(500, f"Internal server error while explaining logs: {type(exc).__name__}: {str(exc)}")


@app.get("/api/formats")
def supported_formats():
    return {
        "formats": [f.value for f in LogFormat],
        "parsers": ["JSONParser", "PythonParser", "NodeParser",
                    "JavaParser", "NginxParser", "GenericParser"],
    }


# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
