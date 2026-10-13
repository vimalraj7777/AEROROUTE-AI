export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  subsystem: 'API' | 'ML' | 'ROUTING' | 'WEATHER' | 'CONGESTION' | 'DATABASE';
  message: string;
  metadata?: Record<string, unknown>;
}

const inMemoryLogs: LogEntry[] = [];
const MAX_LOGS = 200;

export function addLog(
  level: 'INFO' | 'WARN' | 'ERROR',
  subsystem: LogEntry['subsystem'],
  message: string,
  metadata?: Record<string, unknown>
): LogEntry {
  const entry: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    subsystem,
    message,
    metadata,
  };

  inMemoryLogs.unshift(entry);
  if (inMemoryLogs.length > MAX_LOGS) {
    inMemoryLogs.pop();
  }

  // Print structured log
  console.log(`[${entry.timestamp}] [${entry.level}] [${entry.subsystem}] ${entry.message}`);
  return entry;
}

export function getLogs(limit = 50, level?: string): LogEntry[] {
  let filtered = inMemoryLogs;
  if (level && level !== 'ALL') {
    filtered = filtered.filter((l) => l.level === level);
  }
  return filtered.slice(0, limit);
}

// Initial bootstrap logs
addLog('INFO', 'API', 'AeroRoute AI backend initialized in academic research mode');
addLog('INFO', 'ROUTING', 'Graph routing engine initialized');
addLog('INFO', 'ML', 'Delay-scoring engine initializing (loading trained model artifacts)');
addLog('INFO', 'WEATHER', 'Bundled METAR observation snapshot loaded');
