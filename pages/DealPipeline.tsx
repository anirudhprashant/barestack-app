import React, { useState, FC, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, Icon, Modal, Input, Select } from '../components/ui';
import { Deal, DealStage } from '../types';
import { useData } from '../dataStore';


// --- Shared CRM Header Component ---
const CrmHeader: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const navLinks = [
        { href: '/crm', label: 'Contacts' },
        { href: '/crm/pipeline', label: 'Pipeline' },
        { href: '/crm/activities', label: 'Activities' },
    ];

    return (
        <div className="flex justify-between items-center mb-8">
            <div className="flex space-x-2">
                {navLinks.map(link => (
                    <NavLink
                        key={link.href}
                        to={link.href}
                        end
                        className={({ isActive }) => 
                            `font-bold py-2 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm transition-all active:shadow-none active:translate-x-1 active:translate-y-1
                            ${isActive 
                                ? 'bg-brand-dark text-white' 
                                : 'bg-white text-brand-dark'}`
                        }
                    >
                        {link.label}
                    </NavLink>
                ))}
            </div>
            <div>
                {children}
            </div>
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
const DealCard: FC<{ deal: Deal, contactName: string, onDragStart: (e: React.DragEvent, deal: Deal) => void }> = ({ deal, contactName, onDragStart }) => {
    return (
        <div 
            draggable 
            onDragStart={(e) => onDragStart(e, deal)}
            className="bg-white p-3 rounded-[10px] border-2 border-brand-dark mb-3 cursor-grab active:cursor-grabbing transition-opacity duration-200"
        >
            <p className="font-bold text-lg">{contactName}</p>
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
    const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
    const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

    const getContactName = (contactId: string) => contacts.find(c => c.id === contactId)?.name || 'Unknown Contact';
    const dealStages = Object.values(DealStage).filter(s => s !== DealStage.Lead);

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, deal: Deal) => {
        setDraggedDeal(deal);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', deal.id!);
    };

    const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
        e.preventDefault();
        if (draggedDeal?.stage !== stage) {
            setDragOverStage(stage);
        }
    };
    
    const handleDragLeave = () => {
        setDragOverStage(null);
    }

    const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
        e.preventDefault();
        if (draggedDeal && draggedDeal.stage !== newStage) {
            await updateDeal({ ...draggedDeal, stage: newStage, last_interaction: new Date().toISOString() });
        }
        setDraggedDeal(null);
        setDragOverStage(null);
    };

    const stageData = useMemo(() => {
        return dealStages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
            return { stage, deals: stageDeals, value: stageValue, count: stageDeals.length };
        });
    }, [deals, dealStages]);


    return (
        <div>
            <CrmHeader>
                <Button variant="primary" onClick={() => setIsAddDealModalOpen(true)} disabled={contacts.length === 0}>
                    <Icon name="plus" /> Add Deal
                </Button>
            </CrmHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                {stageData.map(({ stage, deals: stageDeals, value, count }) => (
                    <div key={stage} 
                        onDragOver={(e) => handleDragOver(e, stage)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage)}
                        className={`bg-brand-light p-4 rounded-[10px] border-2 border-brand-dark transition-colors duration-300 h-full`}
                    >
                        <div className="text-center mb-4 pb-2 border-b-2 border-brand-dark">
                            <h3 className="font-extrabold text-lg">{stage}</h3>
                            <p className="font-bold text-brand-dark">${value.toLocaleString()} ({count})</p>
                        </div>
                        <div className={`min-h-[300px] p-2 rounded-[10px] transition-all ${dragOverStage === stage ? 'border-2 border-dashed border-brand-dark bg-white/50' : ''}`}>
                            {stageDeals.length > 0 ? (
                                stageDeals.map(deal => (
                                    <div key={deal.id} style={{ opacity: draggedDeal?.id === deal.id ? 0.5 : 1 }}>
                                        <DealCard deal={deal} contactName={getContactName(deal.contact_id)} onDragStart={handleDragStart} />
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full text-center text-gray-500 font-semibold">
                                    No deals in this stage.
                                </div>
                            )}
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