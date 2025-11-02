
import { useState, useEffect, useRef } from 'react';
import { Card, PageHeader, Button } from '../components/ui';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { TimeEntry, Project } from '../types';
import api from '../services/api';

const TimeTracking: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  const fetchData = async () => {
    try {
      const timeEntriesData = await api.get('/time-entries');
      setTimeEntries(timeEntriesData);
      const projectsData = await api.get('/projects');
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch time tracking data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTimerToggle = () => {
    if (isTimerRunning) {
      clearInterval(timerRef.current!);
      timerRef.current = null;
    } else {
      const startTime = Date.now() - elapsedTime;
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const newEntry = {
      project_id: data.get('project'),
      date: data.get('date'),
      hours: Number(data.get('hours')),
      description: data.get('description'),
      is_billable: true,
    };
    try {
      await api.post('/time-entries', newEntry);
      fetchData();
      form.reset();
    } catch (error) {
      console.error('Failed to add time entry:', error);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const week = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  const getHoursForDay = (day: Date) => {
    return timeEntries
      .filter(entry => isSameDay(new Date(entry.date), day))
      .reduce((sum, entry) => sum + entry.hours, 0);
  };

  return (
    <div>
      <PageHeader title="Time Tracking" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <h3 className="text-2xl font-bold mb-4">Timer</h3>
          <div className="text-6xl font-black text-center p-8 bg-brand-light border-2 border-brand-dark rounded-[10px] mb-4">
            {formatTime(elapsedTime)}
          </div>
          <Button onClick={handleTimerToggle} variant="primary" className="w-full">
            {isTimerRunning ? 'Stop Timer' : 'Start Timer'}
          </Button>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="text-2xl font-bold mb-4">Add Manual Entry</h3>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold">Project</label>
                <select name="project" className="w-full p-3 bg-white rounded-[10px] border-2 border-brand-dark">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold">Date</label>
                <input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full p-3 bg-white rounded-[10px] border-2 border-brand-dark" />
              </div>
            </div>
            <div>
              <label className="font-bold">Hours</label>
              <input name="hours" type="number" step="0.1" className="w-full p-3 bg-white rounded-[10px] border-2 border-brand-dark" />
            </div>
            <div>
              <label className="font-bold">Description</label>
              <textarea name="description" className="w-full p-3 bg-white rounded-[10px] border-2 border-brand-dark"></textarea>
            </div>
            <Button variant="secondary" type="submit">Add Entry</Button>
          </form>
        </Card>
      </div>

      <div className="mt-8">
        <PageHeader title="This Week's Timesheet" />
        <Card>
          <div className="grid grid-cols-7 text-center border-b-2 border-brand-dark pb-2 mb-2">
            {week.map(day => (
              <div key={day.toString()} className="font-black text-lg">{format(day, 'EEE')}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center">
            {week.map(day => (
              <div key={day.toString()} className="p-4 bg-brand-light m-1 border-2 border-brand-dark rounded-[10px]">
                <div className="font-bold text-gray-500 text-sm">{format(day, 'd')}</div>
                <div className="text-2xl font-extrabold mt-1">{getHoursForDay(day)}h</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TimeTracking;
