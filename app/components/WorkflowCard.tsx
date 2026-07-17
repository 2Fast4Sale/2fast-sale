import React from 'react';

interface WorkflowCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  icon,
  title,
  description,
  children,
}) => {
  return (
    <section className="workflow-card">
      <div className="card-header">
        {icon}
        <h2>{title}</h2>
      </div>
      <p className="card-description">{description}</p>
      {children}
    </section>
  );
};