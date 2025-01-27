import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface TodoListProps {
  spaceId: string;
}

export function TodoList({ spaceId }: TodoListProps) {
  const [newTask, setNewTask] = useState('');
  const { 
    spaces, 
    todoStates, 
    setTodoStates, 
    toggleTodo,
    updateTodoList 
  } = useSpaceStore();

  const space = spaces.find(s => s.id === spaceId);
  if (!space) return null;

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const updatedTodoList = [...space.to_do_list, newTask.trim()];
    updateTodoList(spaceId, updatedTodoList);
    setNewTask('');
  };

  const handleRemoveTask = (index: number) => {
    const updatedTodoList = space.to_do_list.filter((_, i) => i !== index);
    updateTodoList(spaceId, updatedTodoList);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  return (
    <Card className="h-[calc(50vh-4rem)] bg-gradient-to-b from-background to-muted/30">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={handleAddTask} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {space.to_do_list.map((task, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-colors",
                  todoStates[spaceId]?.[index.toString()]
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                <Checkbox
                  id={`task-${index}`}
                  checked={todoStates[spaceId]?.[index.toString()] || false}
                  onCheckedChange={() => toggleTodo(spaceId, index.toString())}
                />
                <label
                  htmlFor={`task-${index}`}
                  className={cn(
                    "flex-1 text-sm cursor-pointer",
                    todoStates[spaceId]?.[index.toString()] && "line-through text-gray-500"
                  )}
                >
                  {task}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleRemoveTask(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 