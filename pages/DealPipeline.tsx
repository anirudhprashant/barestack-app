import React, { useState, FC } from 'react';
import { NavLink } from 'react-router-dom';
import { PageHeader, Button, Icon, Modal, Input, Select } from '../components/ui';
import { Deal, DealStage } from '../types';
import { useData } from '../dataStore';


// --- Sub-navigation for CRM section ---
const CrmNav = () => {
    const navLinks = [
        { href: '/crm', label: 'Contacts' },
        { href: '/crm/pipeline', label: 'Pipeline' }
    ];
    return (
        <div className="flex space-x-2 border-b-2 border-brand-dark mb-8">
            {navLinks.map(link => (
                <NavLink
                    key={link.href}
                    to={link.href}
                    end
                    className={({ isActive }) => 
                        `py-2 px-4 font-bold text-lg rounded-t-[10px] border-brand-dark -mb-px
                        ${isActive 
                            ? 'bg-white border-2 border-b-white' 
                            : 'bg-brand-light border-x-2 border-t-2 border-transparent hover:bg-white/60'}`
                    }
                >
                    {link.label}
                </NavLink>
            ))}
        </div>
    );
};


const AddDealForm: FC<{ onClose: () => void; initialContactId?: string; initialStage?: DealStage }> = ({ onClose, initialContactId, initialStage }) => {
    const { data, addDeal, addRecentActivity } = useData();
    const [contactId, setContactId] = useState(initialContactId || data.contacts[0]?.id || '');
    const [value, setValue] = useState('');
    const [stage, setStage] = useState(initialStage || DealStage.Qualified);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const newDeal: Omit<Deal, 'id' | 'user_id' | 'created_at'> = {
                contact_id: contactId,
                value: parseInt(value) || 0,
                stage,
                last_interaction: new Date().toISOString(),
            };

            await addDeal(newDeal);
            const contactName = data.contacts.find(c => c.id === contactId)?.name || 'a contact';
            await addRecentActivity({
                timestamp: new Date().toISOString(),
                type: 'DEAL_ADDED',
                description: `New deal worth $${newDeal.value} added for ${contactName}`
            });
            onClose();
        } catch (error) {
            console.error("Failed to add deal:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Contact" id="contact" value={contactId} onChange={e => setContactId(e.target.value)} required>
                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Deal Value ($)" id="value" type="number" value={value} onChange={e => setValue(e.target.value)} required />
            <Select label="Stage" id="stage" value={stage} onChange={e => setStage(e.target.value as DealStage)}>
                {Object.values(DealStage).filter(s => s !== DealStage.Lead).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Deal'}</Button>
            </div>
        </form>
    );
};

// --- Deal Card ---
const DealCard: FC<{ deal: Deal, contactName: string, onDragStart: (e: React.DragEvent, dealId: string) => void }> = ({ deal, contactName, onDragStart }) => {
    return (
        <div 
            draggable 
            onDragStart={(e) => onDragStart(e, deal.id!)}
            className="bg-white p-3 rounded-[10px] border-2 border-brand-dark mb-3 cursor-grab active:cursor-grabbing transition-opacity duration-200"
        >
            <p className="font-bold">{contactName}</p>
            <p className="text-xl font-black text-brand-dark">${deal.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Last interaction: {new Date(deal.last_interaction).toLocaleDateString()}</p>
        </div>
    );
}

// --- MAIN DEAL PIPELINE COMPONENT ---
const DealPipeline: React.FC = () => {
    const { data, updateDeal } = useData();
    const { contacts, deals } = data;
    const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
    
    // Drag and Drop state
    const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

    const getContactName = (contactId: string) => contacts.find(c => c.id === contactId)?.name || 'Unknown Contact';
    const dealStages = Object.values(DealStage);

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, dealId: string) => {
        setDraggedDealId(dealId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
        e.preventDefault();
        setDragOverStage(stage);
    };
    
    const handleDragLeave = () => {
        setDragOverStage(null);
    }

    const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
        e.preventDefault();
        if (draggedDealId) {
            const dealToUpdate = deals.find(d => d.id === draggedDealId);
            if (dealToUpdate && dealToUpdate.stage !== newStage) {
                await updateDeal({ ...dealToUpdate, stage: newStage, last_interaction: new Date().toISOString() });
            }
        }
        setDraggedDealId(null);
        setDragOverStage(null);
    };

    return (
        <div>
            <CrmNav />
            <PageHeader title="Deal Pipeline">
                <Button variant="primary" onClick={() => setIsAddDealModalOpen(true)} disabled={contacts.length === 0}>
                    <Icon name="plus" /> Add Deal
                </Button>
            </PageHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dealStages.filter(s => s !== DealStage.Lead).map(stage => (
                    <div key={stage} 
                        onDragOver={(e) => handleDragOver(e, stage)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage)}
                        className={`bg-brand-light p-4 rounded-[10px] border-2 border-brand-dark transition-colors duration-300 ${dragOverStage === stage ? 'bg-blue-200' : ''}`}
                    >
                        <h3 className="font-extrabold text-lg mb-4 text-center">{stage} ({deals.filter(d => d.stage === stage).length})</h3>
                        <div className="min-h-[200px]">
                            {deals.filter(d => d.stage === stage).map(deal => (
                                <DealCard key={deal.id} deal={deal} contactName={getContactName(deal.contact_id)} onDragStart={handleDragStart} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
            <Modal isOpen={isAddDealModalOpen} onClose={() => setIsAddDealModalOpen(false)} title="Add New Deal">
                <AddDealForm onClose={() => setIsAddDealModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default DealPipeline;
