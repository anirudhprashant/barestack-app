
import React from 'react';
import { Card, PageHeader } from '../components/ui';

const TimeTracking: React.FC = () => {
    return (
        <div>
            <PageHeader title="Time Tracking" />
            <Card>
                <p className="text-gray-500 text-center py-8">
                    Time tracking feature coming soon with Convex backend
                </p>
            </Card>
        </div>
    );
};

export default TimeTracking;
