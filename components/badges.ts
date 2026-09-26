import { DealStage, InvoiceStatus, ProjectStatus, TaskPriority, TaskStatus } from '../types';

export const invoiceStatusClass: Record<InvoiceStatus, string> = {
    [InvoiceStatus.Draft]: 'bg-surface text-muted',
    [InvoiceStatus.Sent]: 'bg-activity-blue/10 text-activity-blue',
    [InvoiceStatus.Paid]: 'bg-activity-green/10 text-activity-green',
    [InvoiceStatus.Overdue]: 'bg-activity-red/10 text-activity-red',
};

export const dealStageClass: Record<DealStage, string> = {
    [DealStage.Lead]: 'bg-surface text-muted',
    [DealStage.Qualified]: 'bg-activity-purple/10 text-activity-purple',
    [DealStage.Proposal]: 'bg-activity-blue/10 text-activity-blue',
    [DealStage.Won]: 'bg-activity-green/10 text-activity-green',
    [DealStage.Lost]: 'bg-activity-red/10 text-activity-red',
};

export const projectStatusClass: Record<ProjectStatus, string> = {
    [ProjectStatus.Active]: 'bg-activity-green/10 text-activity-green',
    [ProjectStatus.Completed]: 'bg-activity-blue/10 text-activity-blue',
    [ProjectStatus.Archived]: 'bg-surface text-muted',
};

export const taskStatusClass: Record<TaskStatus, string> = {
    [TaskStatus.ToDo]: 'bg-surface text-muted',
    [TaskStatus.InProgress]: 'bg-activity-blue/10 text-activity-blue',
    [TaskStatus.Done]: 'bg-activity-green/10 text-activity-green',
};

export const priorityClass: Record<TaskPriority, string> = {
    [TaskPriority.Low]: 'bg-surface text-muted border-border',
    [TaskPriority.Medium]: 'bg-activity-orange/10 text-activity-orange border-activity-orange/20',
    [TaskPriority.High]: 'bg-activity-red/10 text-activity-red border-activity-red/20',
};
