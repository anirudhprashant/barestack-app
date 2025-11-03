
import React from 'react';
import { Card, PageHeader, Button, Icon } from '../components/ui';

const Expenses: React.FC = () => {
    return (
        <div>
            <PageHeader title="Expenses">
                <Button variant="primary"><Icon name="plus"/> Add Expense</Button>
            </PageHeader>
            <Card>
                <p className="text-gray-500 text-center py-8">
                    Expense tracking feature coming soon with Convex backend
                </p>
            </Card>
        </div>
    );
};

export default Expenses;
