
import React from 'react';
import { Card } from '../components/ui';

const Reports: React.FC = () => {
    return (
        <div>
            <div className="mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="col-span-1 lg:col-span-2">
                    <h3 className="text-2xl font-bold mb-4">Revenue Over Time</h3>
                    <div className="h-64 bg-brand-light rounded-[10px] border-2 border-brand-dark flex items-center justify-center">
                        <p className="text-gray-500">Chart visualization coming soon</p>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-2xl font-bold mb-4">Project Profitability</h3>
                    <div className="h-48 bg-brand-light rounded-[10px] border-2 border-brand-dark flex items-center justify-center">
                        <p className="text-gray-500">Chart visualization coming soon</p>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-2xl font-bold mb-4">Time Breakdown by Project</h3>
                    <div className="h-48 bg-brand-light rounded-[10px] border-2 border-brand-dark flex items-center justify-center">
                        <p className="text-gray-500">Chart visualization coming soon</p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
