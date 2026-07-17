import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status,
}) => {
  return (
    <div className="progress-section">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="progress-text">
        Fortschritt: {progress}% | Status: {status}
      </p>
    </div>
  );
};