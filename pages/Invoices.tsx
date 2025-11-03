
import React from 'react';
import { Card, PageHeader, Button, Icon } from '../components/ui';

const Invoices: React.FC = () => {
    return (
        <div>
            <PageHeader title="Invoices">
                <Button variant="primary"><Icon name="plus"/> Create Invoice</Button>
            </PageHeader>
            <Card>
                <p className="text-gray-500 text-center py-8">
                    Invoice feature coming soon with Convex backend
                </p>
            </Card>
        </div>
    );
};

export default Invoices;
