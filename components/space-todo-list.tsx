'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, CheckCircle2, Circle, XCircle, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  order_index: number;
  dependencies?: string[];
}

interface SpaceTodoListProps {
  spaceId: string;
}

export default function SpaceTodoList({ spaceId }: SpaceTodoListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    status: 'pending',
    priority: 'medium',
    order_index: 0,
  });

  const statusIcons = {
    pending: <Circle className="h-5 w-5 text-gray-400" />,
    in_progress: <Circle className="h-5 w-5 text-blue-400" />,
    completed: <CheckCircle2 className="h-5 w-5 text-green-400" />,
    blocked: <XCircle className="h-5 w-5 text-red-400" />,
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-red-100 text-red-700',
  };

  const handleAddTask = async () => {
    if (!newTask.title) return;

    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title,
      description: newTask.description,
      status: newTask.status as Task['status'],
      priority: newTask.priority as Task['priority'],
      due_date: newTask.due_date,
      order_index: tasks.length,
      dependencies: [],
    };

    // TODO: Add API call to save task
    setTasks([...tasks, task]);
    setNewTask({
      title: '',
      status: 'pending',
      priority: 'medium',
      order_index: tasks.length + 1,
    });
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    // TODO: Add API call to update task
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold">Tasks</h3>
        
        {/* Add new task form */}
        <div className="flex flex-col space-y-2 p-4 border rounded-lg">
          <Input
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
          <Textarea
            placeholder="Description (optional)"
            value={newTask.description || ''}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <div className="flex space-x-2">
            <Select
              value={newTask.priority}
              onValueChange={(value) => setNewTask({ ...newTask, priority: value as Task['priority'] })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !newTask.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newTask.due_date ? format(newTask.due_date, "PPP") : <span>Pick a due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newTask.due_date}
                  onSelect={(date) => setNewTask({ ...newTask, due_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleAddTask}>Add Task</Button>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <button onClick={() => {
                  const statusOrder = ['pending', 'in_progress', 'completed', 'blocked'];
                  const currentIndex = statusOrder.indexOf(task.status);
                  const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
                  updateTaskStatus(task.id, nextStatus as Task['status']);
                }}>
                  {statusIcons[task.status]}
                </button>
                <div>
                  <h4 className="font-medium">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-500">{task.description}</p>
                  )}
                  {task.due_date && (
                    <p className="text-sm text-gray-500">
                      Due: {format(task.due_date, "PPP")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "px-2 py-1 rounded text-sm",
                  priorityColors[task.priority]
                )}>
                  {task.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 