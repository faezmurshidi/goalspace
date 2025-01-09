import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Headphones, Loader2, Pause, Play } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface CustomPodcastProps {
  spaceId: string;
  className?: string;
}

export function CustomPodcast({ spaceId, className }: CustomPodcastProps) {
  const { spaces } = useSpaceStore();
  const space = spaces.find(s => s.id === spaceId);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastReady, setPodcastReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup audio URL when component unmounts
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handlePodcastClick = async () => {
    if (podcastReady) {
      handlePlayPause();
      return;
    }

    if (isGeneratingPodcast) return;

    setIsGeneratingPodcast(true);
    try {
      // Get the space details
      if (!space) {
        throw new Error('Space not found');
      }

      const response = await fetch('/api/make-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceDetails: space }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate podcast');
      }

      // Get the audio data as a blob
      const audioBlob = await response.blob();
      const newAudioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(newAudioUrl);
      
      // Create and setup audio element
      const audio = new Audio(newAudioUrl);
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });

      audioRef.current = audio;
      setPodcastReady(true);
      audio.play();
    } catch (err) {
      console.error('Error generating podcast:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate podcast');
      setPodcastReady(false);
      setIsPlaying(false);
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  if (!space) return null;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Headphones className="h-5 w-5" style={{ color: space.space_color?.main }} />
          Podcast Player
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handlePodcastClick}
          className={cn(
            "w-full justify-start gap-2 relative overflow-hidden transition-all duration-300",
            isGeneratingPodcast && "text-red-500 hover:text-red-600 animate-pulse",
            podcastReady && !isPlaying && "text-green-500 hover:text-green-600",
            isPlaying && "text-amber-500 hover:text-amber-600 animate-bounce",
            space.space_color && !isGeneratingPodcast && !podcastReady && `hover:text-[${space.space_color.main}]`
          )}
          style={space.space_color && !isGeneratingPodcast && !podcastReady ? {
            '--hover-text': space.space_color.main,
          } as any : undefined}
          disabled={isGeneratingPodcast}
        >
          {isGeneratingPodcast ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="animate-pulse">Generating Podcast...</span>
            </>
          ) : podcastReady ? (
            <>
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Pause Podcast</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Play Podcast</span>
                </>
              )}
            </>
          ) : (
            <>
              <Headphones className="h-4 w-4" />
              <span>Generate Podcast</span>
            </>
          )}
        </Button>
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </CardContent>
    </Card>
  );
} 