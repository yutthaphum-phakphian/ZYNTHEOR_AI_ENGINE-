// @ts-nocheck
// P14 UI - Status LED with 300ms ease transitions - No Business Logic
import React from 'react';

export type StatusLedVariant = 'verified' | 'experimental' | 'unavailable' | 'pass' | 'warn' | 'fail';

interface StatusLedProps {
  status: StatusLedVariant;
  size?: number;
  showPulse?: boolean;
  label?: string;
}

export const StatusLed: React.FC<StatusLedProps> = ({ 
  status, 
  size = 12, 
  showPulse = true,
  label 
}) => {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span 
        className={`status-led ${status}`}
        style={{ 
          width: size, 
          height: size,
          transition: 'all 300ms ease'
        }}
        aria-label={label || status}
        title={label || status}
      />
      {label && <span style={{ fontSize: '12px', opacity: 0.8 }}>{label}</span>}
    </span>
  );
};

export default StatusLed;
