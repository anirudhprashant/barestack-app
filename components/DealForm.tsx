import React, { useState, FC } from 'react';
import { Button, Input, Select } from './ui';
import { Deal, DealStage } from '../types';
import { useData, useCurrency } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import { currencySymbol } from '../src/lib/format';
import { toDateInput, toStoredDate } from '../src/lib/dates';

interface DealFormProps {
    deal?: Deal;
    initialContactId?: string;
    initialStage?: DealStage;
    onClose: () => void;
}

export const DealForm: FC<DealFormProps> = ({ deal, initialContactId, initialStage, onClose }) => {
    const { data, addDeal, updateDeal, addRecentActivity } = useData();
    const currency = useCurrency();
    const { toast } = useToast();
    const [contactId, setContactId] = useState(deal?.contact_id || initialContactId || data.contacts[0]?.id || '');
    const [title, setTitle] = useState(deal?.title || '');
    const [value, setValue] = useState(deal ? String(deal.value ?? '') : '');
    const [stage, setStage] = useState<DealStage>(deal?.stage || initialStage || DealStage.Qualified);
    const [expectedClose, setExpectedClose] = useState(toDateInput(deal?.expected_close));
    const [loading, setLoading] = useState(false);

    const contactName = (id: string) => data.contacts.find(c => c.id === id)?.name || 'a contact';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactId) {
            toast('Pick a contact for this deal.', 'error');
            return;
        }
        setLoading(true);
        const payload = {
            contact_id: contactId,
            title: title.trim(),
            value: Math.max(0, parseFloat(value) || 0),
            stage,
            expected_close: expectedClose ? toStoredDate(expectedClose) : '',
            last_interaction: new Date().toISOString(),
        };
        try {
            if (deal?.id) {
                await updateDeal({ id: deal.id, ...payload });
                if (stage === DealStage.Won && deal.stage !== DealStage.Won) {
                    addRecentActivity({ type: 'DEAL_WON', description: `Deal won with ${contactName(contactId)}${payload.title ? `: ${payload.title}` : ''}` });
                }
                toast('Deal updated', 'success');
            } else {
                await addDeal(payload);
                addRecentActivity({
                    type: stage === DealStage.Won ? 'DEAL_WON' : 'DEAL_ADDED',
                    description: `New deal${payload.title ? ` "${payload.title}"` : ''} added for ${contactName(contactId)}`,
                });
                toast('Deal added', 'success');
            }
            onClose();
        } catch (error) {
            console.error('Failed to save deal:', error);
            toast('Failed to save deal', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Contact" id="deal-contact" value={contactId} onChange={e => setContactId(e.target.value)} required>
                {data.contacts.length === 0 && <option value="">Add a contact first</option>}
                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
            </Select>
            <Input label="Deal title" id="deal-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Website redesign" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={`Value (${currencySymbol(currency)})`} id="deal-value" type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} required />
                <Input label="Expected close" id="deal-close" type="date" value={expectedClose} onChange={e => setExpectedClose(e.target.value)} />
            </div>
            <Select label="Stage" id="deal-stage" value={stage} onChange={e => setStage(e.target.value as DealStage)}>
                {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading || !contactId}>{loading ? 'Saving...' : deal ? 'Save Deal' : 'Add Deal'}</Button>
            </div>
        </form>
    );
};
