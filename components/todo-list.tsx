import { useEffect } from 'react';
import { useSpaceStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, XCircle, MessageSquareMore } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface TodoListProps {
  spaceId: string;
}

export function TodoList({ spaceId }: TodoListProps) {
  const { tasks, fetchTasks, updateTaskStatus } = useSpaceStore();
  const router = useRouter();
  const spaceTasks = tasks[spaceId] || [];

  useEffect(() => {
    fetchTasks(spaceId);
  }, [spaceId, fetchTasks]);

  const handleStatusChange = async (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      await updateTaskStatus(taskId, status);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleAssist = (task: { title: string; description: string }) => {
    // Format the task content for the chat in a more conversational way
    const taskContent = `I need help with this task:
Title: ${task.title}
Description: ${task.description}

Can you help me break this down into smaller steps and provide guidance on how to complete it effectively?`;
    
    // Store the task content in localStorage to be picked up by the chat component
    localStorage.setItem('assistWithTask', taskContent);
    
    // Navigate to the chat window
    router.push(`/chat/${spaceId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Circle className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <Circle className="h-5 w-5 text-gray-400" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Card className="h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/30">
      <CardContent className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <div className="space-y-2">
            {spaceTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-start gap-3 p-3 rounded-lg transition-colors",
                  task.status === 'completed' ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 h-5 w-5 p-0"
                  onClick={() => {
                    const nextStatus = {
                      pending: 'in_progress',
                      in_progress: 'completed',
                      completed: 'pending'
                    }[task.status] as 'pending' | 'in_progress' | 'completed';
                    handleStatusChange(task.id, nextStatus);
                  }}
                >
                  {getStatusIcon(task.status)}
                </Button>
                <div className="flex-1">
                  <h4 className={cn(
                    "text-sm font-medium",
                    task.status === 'completed' && "line-through text-gray-500"
                  )}>
                    {task.title}
                  </h4>
                  <p className={cn(
                    "text-sm text-muted-foreground",
                    task.status === 'completed' && "line-through"
                  )}>
                    {task.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleAssist(task)}
                >
                  <MessageSquareMore className="h-4 w-4 mr-2" />
                  Assist
                </Button>
              </div>
            ))}
            {spaceTasks.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No tasks yet. Select a module to generate tasks.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 