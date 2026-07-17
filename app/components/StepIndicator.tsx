'use client';

import { Check } from 'lucide-react';
import './stepindicator.css';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({
  steps,
  currentStep,
}: StepIndicatorProps) {
  return (
    <div className="step-indicator">
      {steps.map((step, idx) => (
        <div key={idx} className="step-item">
          <div className={`step-number ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}>
            {idx < currentStep ? <Check size={20} /> : idx + 1}
          </div>
          <span className="step-label">{step}</span>
        </div>
      ))}
      <div className="step-line" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}></div>
    </div>
  );
}