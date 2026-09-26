import React, { useState, FC, useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { Button, Icon, IconButton, Modal, EmptyState } from '../components/ui';
import { Deal, DealStage } from '../types';
import { useData, useCurrency } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import CrmHeader from '../components/CrmHeader';
import { DealForm } from '../components/DealForm';
import { formatMoney } from '../src/lib/format';
import { formatDateOnly, parseDateOnly } from '../src/lib/dates';
import { dealStageClass } from '../components/badges';

const STAGES = Object.values(DealStage);

const DealCard: FC<{
    deal: Deal;
    contactName: string;
    currency: string;
    dragging: boolean;
    onDragStart: (e: React.DragEvent, deal: Deal) => void;
    onDragEnd: () => void;
    onOpen: () => void;
    onAdvance?: () => void;
}> = ({ deal, contactName, currency, dragging, onDragStart, onDragEnd, onOpen, onAdvance }) => {
    const close = parseDateOnly(deal.expected_close);
    const days = close ? differenceInCalendarDays(close, new Date()) : null;
    const open = deal.stage !== DealStage.Won && deal.stage !== DealStage.Lost;
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, deal)}
            onDragEnd={onDragEnd}
            onClick={onOpen}
            className={`bg-canvas p-3 border border-border cursor-grab active:cursor-grabbing hover:border-charcoal transition-all group ${dragging ? 'opacity-50' : ''}`}
        >
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-sm text-charcoal truncate">{deal.title || contactName}</p>
                    {deal.title && <p className="text-xs text-muted truncate">{contactName}</p>}
                </div>
                {onAdvance && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAdvance(); }}
                        className="p-1 text-muted hover:text-charcoal hover:bg-surface sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Move to next stage"
                        aria-label="Move to next stage"
                    >
                        <Icon name="arrow-right" className="w-4 h-4" />
                    </button>
                )}
            </div>
            <p className="text-lg font-bold text-charcoal tabular-nums mt-1">{formatMoney(deal.value || 0, currency)}</p>
            {close && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${open && days !== null && days < 0 ? 'text-activity-red font-semibold' : 'text-muted'}`}>
                    <Icon name="calendar" className="w-3 h-3" />
                    {formatDateOnly(deal.expected_close, 'MMM d')}
                    {open && days !== null && days < 0 && ' · past due'}
                </p>
            )}
        </div>
    );
};

const DealPipeline: React.FC = () => {
    const { data, updateDeal, deleteDeal, addRecentActivity } = useData();
    const currency = useCurrency();
    const { toast, confirm } = useToast();
    const { contacts, deals } = data;
    const [formState, setFormState] = useState<{ deal?: Deal; stage?: DealStage } | null>(null);
    const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
    const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

    const getContactName = (contactId: string) => contacts.find(c => c.id === contactId)?.name || 'Unknown Contact';

    const moveDeal = async (deal: Deal, stage: DealStage) => {
        if (deal.stage === stage) return;
        try {
            await updateDeal({ id: deal.id!, stage, last_interaction: new Date().toISOString() });
            if (stage === DealStage.Won) {
                addRecentActivity({ type: 'DEAL_WON', description: `Deal won with ${getContactName(deal.contact_id)}${deal.title ? `: ${deal.title}` : ''} (${formatMoney(deal.value, currency)})` });
                toast('Deal won! 🎉', 'success');
            }
        } catch (error) {
            console.error('Failed to move deal:', error);
            toast('Could not move the deal.', 'error');
        }
    };

    const handleDelete = async (deal: Deal) => {
        const ok = await confirm({ title: 'Delete deal', message: `Delete this ${formatMoney(deal.value, currency)} deal with ${getContactName(deal.contact_id)}?`, danger: true, confirmLabel: 'Delete' });
        if (!ok) return;
        try {
            await deleteDeal(deal.id!);
            setFormState(null);
            toast('Deal deleted', 'success');
        } catch {
            toast('Could not delete the deal.', 'error');
        }
    };

    const stageData = useMemo(() => STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage);
        return { stage, deals: stageDeals, value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0) };
    }), [deals]);

    const stats = useMemo(() => {
        const won = deals.filter(d => d.stage === DealStage.Won);
        const lost = deals.filter(d => d.stage === DealStage.Lost);
        const open = deals.filter(d => d.stage !== DealStage.Won && d.stage !== DealStage.Lost);
        const closed = won.length + lost.length;
        return {
            openValue: open.reduce((s, d) => s + (d.value || 0), 0),
            openCount: open.length,
            wonValue: won.reduce((s, d) => s + (d.value || 0), 0),
            winRate: closed ? Math.round((won.length / closed) * 100) : null,
            avgDeal: won.length ? won.reduce((s, d) => s + (d.value || 0), 0) / won.length : 0,
        };
    }, [deals]);

    return (
        <div className="max-w-7xl mx-auto">
            <CrmHeader>
                <Button variant="primary" onClick={() => setFormState({})} disabled={contacts.length === 0} title={contacts.length === 0 ? 'Add a contact first' : undefined}>
                    <Icon name="plus" className="w-4 h-4 mr-2" /> Add Deal
                </Button>
            </CrmHeader>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Open pipeline', value: formatMoney(stats.openValue, currency), sub: `${stats.openCount} open deal${stats.openCount === 1 ? '' : 's'}` },
                    { label: 'Won', value: formatMoney(stats.wonValue, currency), sub: 'All time' },
                    { label: 'Win rate', value: stats.winRate === null ? '—' : `${stats.winRate}%`, sub: 'Won vs. closed' },
                    { label: 'Avg. won deal', value: formatMoney(stats.avgDeal, currency), sub: 'Per deal' },
                ].map(s => (
                    <div key={s.label} className="bg-canvas border border-border p-4">
                        <p className="text-xs font-bold text-muted uppercase tracking-wider">{s.label}</p>
                        <p className="text-xl sm:text-2xl font-bold text-charcoal tabular-nums mt-1 truncate">{s.value}</p>
                        <p className="text-xs text-muted">{s.sub}</p>
                    </div>
                ))}
            </div>

            {deals.length === 0 ? (
                <EmptyState icon="trending-up" title="No deals yet" description={contacts.length ? 'Track opportunities from first contact to signed.' : 'Add a contact first, then track deals with them here.'}>
                    {contacts.length > 0 && <Button onClick={() => setFormState({})}><Icon name="plus" className="w-4 h-4 mr-2" />Add Deal</Button>}
                </EmptyState>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
                    {stageData.map(({ stage, deals: stageDeals, value }, idx) => (
                        <div
                            key={stage}
                            onDragOver={(e) => { e.preventDefault(); if (draggedDeal?.stage !== stage) setDragOverStage(stage); }}
                            onDragLeave={() => setDragOverStage(null)}
                            onDrop={async (e) => {
                                e.preventDefault();
                                if (draggedDeal) await moveDeal(draggedDeal, stage);
                                setDraggedDeal(null);
                                setDragOverStage(null);
                            }}
                            className={`bg-surface p-3 border-2 ${dragOverStage === stage ? 'border-charcoal' : 'border-border'} transition-colors`}
                        >
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-charcoal text-xs uppercase tracking-wider font-body">{stage}</h3>
                                    <span className={`px-1.5 py-0.5 text-xs font-bold ${dealStageClass[stage]}`}>{stageDeals.length}</span>
                                </div>
                                <span className="text-xs font-bold text-muted tabular-nums">{formatMoney(value, currency, { compact: value >= 10000 })}</span>
                            </div>
                            <div className="space-y-2 min-h-[120px] lg:min-h-[300px]">
                                {stageDeals.map(deal => (
                                    <DealCard
                                        key={deal.id}
                                        deal={deal}
                                        currency={currency}
                                        contactName={getContactName(deal.contact_id)}
                                        dragging={draggedDeal?.id === deal.id}
                                        onDragStart={(e, d) => { setDraggedDeal(d); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', d.id!); }}
                                        onDragEnd={() => { setDraggedDeal(null); setDragOverStage(null); }}
                                        onOpen={() => setFormState({ deal })}
                                        onAdvance={idx < STAGES.indexOf(DealStage.Won) ? () => moveDeal(deal, STAGES[idx + 1]) : undefined}
                                    />
                                ))}
                                <button
                                    onClick={() => setFormState({ stage })}
                                    disabled={contacts.length === 0}
                                    className="w-full py-2 text-xs font-semibold text-muted hover:text-charcoal border border-dashed border-border hover:border-charcoal transition-colors flex items-center justify-center gap-1 disabled:opacity-40"
                                >
                                    <Icon name="plus" className="w-3.5 h-3.5" /> Add
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={!!formState} onClose={() => setFormState(null)} title={formState?.deal ? 'Edit Deal' : 'Add New Deal'}>
                {formState && (
                    <>
                        <DealForm key={formState.deal?.id || formState.stage || 'new'} deal={formState.deal} initialStage={formState.stage} onClose={() => setFormState(null)} />
                        {formState.deal && (
                            <div className="border-t border-border mt-6 pt-4 flex justify-between items-center">
                                <span className="text-xs text-muted">Created {formatDateOnly(formState.deal.created || formState.deal.last_interaction)}</span>
                                <IconButton icon="trash" label="Delete deal" tone="danger" onClick={() => handleDelete(formState.deal!)} />
                            </div>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
};

export default DealPipeline;
