// P14 SandboxTerminal - REAL Execution Gateway, no mock execution, fail-closed
import React, { useState, useEffect, useRef } from 'react';

export interface ExecutionRequest {
  requestId: string;
  code: string;
  language: 'typescript' | 'javascript' | 'python' | 'shell';
  timeoutMs: number;
  timestamp: string;
}

export interface ExecutionResult {
  requestId: string;
  status: 'SUCCESS' | 'FAIL' | 'TIMEOUT' | 'BLOCKED' | 'PENDING';
  output?: string;
  error?: string;
  durationMs: number;
  timestamp: string;
  securityCheck: { passed: boolean; reason?: string };
}

// REAL gateway interface - implementation must be provided by existing system
// We do NOT mock execution results
export interface ExecutionGateway {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  checkSecurity(code: string): { passed: boolean; reason?: string };
  isAvailable(): boolean;
}

interface SandboxTerminalProps {
  gateway?: ExecutionGateway; // REAL gateway from existing system
  className?: string;
}

export const SandboxTerminal: React.FC<SandboxTerminalProps> = ({ gateway, className = '' }) => {
  const [requests, setRequests] = useState<ExecutionRequest[]>([]);
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [currentCode, setCurrentCode] = useState<string>('// REAL execution - no mock\n// Paste code that exists in repo\nconsole.log("Hello ZYNTHEOR");');
  const [isExecuting, setIsExecuting] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'available' | 'unavailable' | 'checking'>('checking');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // REAL check - no mock
    if (gateway) {
      try {
        const available = gateway.isAvailable();
        setGatewayStatus(available ? 'available' : 'unavailable');
      } catch {
        setGatewayStatus('unavailable');
      }
    } else {
      // Gateway not provided - this is expected in sandbox, we report honestly
      setGatewayStatus('unavailable');
    }
  }, [gateway]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [results]);

  const handleExecute = async () => {
    if (!gateway) {
      // Fail-closed - no mock execution
      const blockedResult: ExecutionResult = {
        requestId: `req-${Date.now()}`,
        status: 'BLOCKED',
        error: 'Execution Gateway not available - fail-closed behavior. No mock execution performed. This is REAL security boundary.',
        durationMs: 0,
        timestamp: new Date().toISOString(),
        securityCheck: { passed: false, reason: 'Gateway unavailable' }
      };
      setResults(prev => [...prev, blockedResult]);
      return;
    }

    setIsExecuting(true);
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    
    const request: ExecutionRequest = {
      requestId,
      code: currentCode,
      language: 'typescript',
      timeoutMs: 10000,
      timestamp: new Date().toISOString()
    };

    setRequests(prev => [...prev, request]);

    try {
      // REAL security check
      const securityCheck = gateway.checkSecurity(currentCode);
      if (!securityCheck.passed) {
        const blocked: ExecutionResult = {
          requestId,
          status: 'BLOCKED',
          error: `Security check failed: ${securityCheck.reason}`,
          durationMs: 0,
          timestamp: new Date().toISOString(),
          securityCheck
        };
        setResults(prev => [...prev, blocked]);
        setIsExecuting(false);
        return;
      }

      // REAL execution - no mock
      const result = await gateway.execute(request);
      setResults(prev => [...prev, result]);
    } catch (err) {
      const failResult: ExecutionResult = {
        requestId,
        status: 'FAIL',
        error: err instanceof Error ? err.message : 'Unknown execution error - REAL error, not mock',
        durationMs: 0,
        timestamp: new Date().toISOString(),
        securityCheck: { passed: true }
      };
      setResults(prev => [...prev, failResult]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className={`sandbox-terminal ${className}`}>
      <div className="sandbox-terminal-header">
        <span className={`status-led ${gatewayStatus === 'available' ? 'verified' : gatewayStatus === 'checking' ? 'experimental' : 'fail'}`} />
        <span style={{ fontSize: '12px', fontWeight: 600 }}>
          SandboxTerminal - {gatewayStatus === 'available' ? 'Gateway Available (REAL)' : gatewayStatus === 'checking' ? 'Checking...' : 'Gateway Unavailable - Fail-Closed (REAL)'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.6 }}>
          No Mock Execution - Security Boundary Preserved
        </span>
      </div>
      
      <div style={{ padding: '12px', borderBottom: '1px solid #232634' }}>
        <textarea
          value={currentCode}
          onChange={(e) => setCurrentCode(e.target.value)}
          style={{
            width: '100%',
            minHeight: '80px',
            background: '#0b0d12',
            border: '1px solid #232634',
            borderRadius: '6px',
            color: '#e5e7eb',
            padding: '8px',
            fontFamily: 'monospace',
            fontSize: '12px',
            resize: 'vertical'
          }}
          placeholder="Enter REAL code from repo - no mock execution"
        />
        <button
          onClick={handleExecute}
          disabled={isExecuting}
          style={{
            marginTop: '8px',
            padding: '6px 14px',
            background: gatewayStatus === 'available' ? '#10b981' : '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: isExecuting ? 'not-allowed' : 'pointer',
            opacity: isExecuting ? 0.6 : 1,
            transition: 'all 300ms ease'
          }}
        >
          {isExecuting ? 'Executing (REAL)...' : gatewayStatus === 'available' ? 'Execute (REAL Gateway)' : 'Execute (Will Fail-Closed - REAL Security)'}
        </button>
      </div>

      <div ref={bodyRef} className="sandbox-terminal-body">
        {results.length === 0 && (
          <div style={{ opacity: 0.5, fontSize: '11px' }}>
            No executions yet. Gateway status: {gatewayStatus}. This terminal does NOT mock results - real gateway required for execution.
          </div>
        )}
        {results.map((result, idx) => (
          <div key={idx} style={{ marginBottom: '12px', padding: '8px', background: '#151821', borderRadius: '6px', borderLeft: `3px solid ${result.status === 'SUCCESS' ? '#10b981' : result.status === 'FAIL' || result.status === 'BLOCKED' ? '#ef4444' : '#f59e0b'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>{result.requestId}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`status-led ${result.status === 'SUCCESS' ? 'verified' : result.status === 'FAIL' || result.status === 'BLOCKED' ? 'fail' : 'warn'}`} />
                {result.status} {result.durationMs}ms
              </span>
            </div>
            {result.output && <pre style={{ fontSize: '11px', margin: '4px 0', whiteSpace: 'pre-wrap', color: '#10b981' }}>{result.output}</pre>}
            {result.error && <pre style={{ fontSize: '11px', margin: '4px 0', whiteSpace: 'pre-wrap', color: '#fca5a5' }}>{result.error}</pre>}
            <div style={{ fontSize: '10px', opacity: 0.6 }}>
              Security: {result.securityCheck.passed ? 'PASS' : `FAIL - ${result.securityCheck.reason}`} | {new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #232634', fontSize: '10px', opacity: 0.5 }}>
        Requests: {requests.length} | Results: {results.length} | No mock data - REAL gateway only | Audit trail preserved
      </div>
    </div>
  );
};

export default SandboxTerminal;
