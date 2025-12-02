import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useData } from '../dataStore';
import Dashboard from '../pages/Dashboard';
import CRM from '../pages/CRM';
import DealPipeline from '../pages/DealPipeline';
import Activities from '../pages/Activities';
import Imports from '../pages/Imports';
import Projects from '../pages/Projects';
import ProjectDetails from '../pages/ProjectDetails';
import Invoices from '../pages/Invoices';
import TimeTracking from '../pages/TimeTracking';
import Expenses from '../pages/Expenses';
import Settings from '../pages/Settings';

const AppLayout: React.FC = () => {
    const { loading, error } = useData();

    return (
        <div className="font-sans text-brand-dark bg-brand-light min-h-screen">
            <Sidebar />
            <div className="ml-[240px]">
                <Header />
                <main className="pt-16">
                    <div className="p-8">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <p className="text-2xl font-bold">Loading your dashboard...</p>
                            </div>
                        ) : error ? (
                            <div className="flex justify-center items-center h-64">
                                <p className="text-2xl font-bold text-brand-dark">Error: {error}</p>
                            </div>
                        ) : (
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/crm" element={<CRM />} />
                                <Route path="/crm/pipeline" element={<DealPipeline />} />
                                <Route path="/crm/activities" element={<Activities />} />
                                <Route path="/crm/imports" element={<Imports />} />
                                <Route path="/projects" element={<Projects />} />
                                <Route path="/projects/:id" element={<ProjectDetails />} />
                                <Route path="/invoices" element={<Invoices />} />
                                <Route path="/time-tracking" element={<TimeTracking />} />
                                <Route path="/expenses" element={<Expenses />} />
                                <Route path="/settings" element={<Settings />} />
                            </Routes>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default AppLayout;
