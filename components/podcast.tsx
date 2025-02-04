import { CustomPodcast } from './custom-podcast';
import { useSpaceStore } from '@/lib/store';

interface PodcastProps {
  spaceId: string;
}

export function Podcast({ spaceId }: PodcastProps) {
  const { getCurrentModule } = useSpaceStore();
  const currentModule = getCurrentModule(spaceId);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Space Podcast</h2>
      <CustomPodcast 
        spaceId={spaceId} 
        content={currentModule?.description || currentModule?.content || ''}
      />
    </div>
  );
} 