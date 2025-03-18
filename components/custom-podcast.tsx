import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Headphones, Loader2, Pause, Play, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Podcast } from '@/lib/store';
import { Slider } from './ui/slider';

interface CustomPodcastProps {
  spaceId: string;
  content: string;
  className?: string;
}

export function CustomPodcast({ spaceId, content, className }: CustomPodcastProps) {
  const { spaces, savePodcast, fetchPodcasts, podcasts } = useSpaceStore();
  const space = spaces.find(s => s.id === spaceId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const spacePodcasts = podcasts[spaceId] || [];

  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastReady, setPodcastReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Fetch podcasts on mount
  useEffect(() => {
    fetchPodcasts(spaceId);
  }, [spaceId, fetchPodcasts]);

  // Setup audio visualization - wrapped in useCallback to stabilize its identity
  const setupAudioVisualization = useCallback(() => {
    if (!audioRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Create source node only if it hasn't been created for this audio element
      if (!sourceNodeRef.current) {
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      } else {
        // If source exists, disconnect it from previous nodes
        sourceNodeRef.current.disconnect();
      }

      // Create new analyser
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      analyserRef.current = audioContextRef.current.createAnalyser();

      // Connect nodes
      sourceNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      // Setup analyser
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!analyserRef.current || !ctx || !canvas) return;

        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.fillStyle = space?.space_color?.secondary || '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = space?.space_color?.main || '#000000';
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };

      draw();
    } catch (err) {
      console.error('Error setting up audio visualization:', err);
    }
  }, [space?.space_color?.secondary, space?.space_color?.main]);

  // Effect for audio visualization
  useEffect(() => {
    setupAudioVisualization();
    
    // Inline cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [space?.space_color, audioUrl, setupAudioVisualization]);

  // Cleanup on unmount - separate effect for actual unmounting
  useEffect(() => {
    return () => {
      // Cleanup audio contexts and refs on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Time update handler
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgress = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = (value[0] / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolume = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0] / 100;
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    setIsMuted(!isMuted);
    audioRef.current.muted = !isMuted;
  };

  // Function to clean up audio resources
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
    }
    if (audioContextRef.current) {
      // Close is not used here as we might reuse the audio context
      // but we ensure all connections are cleaned up
    }
  };

  const handlePlayPause = (podcast?: Podcast) => {
    if (podcast && (!currentPodcast || currentPodcast.id !== podcast.id)) {
      cleanup(); // Cleanup previous audio context
      audioRef.current?.pause();
      setCurrentPodcast(podcast);
      const audio = new Audio(podcast.audio_url);
      audioRef.current = audio;
      
      // Reset source node when changing audio element
      sourceNodeRef.current = null;
      
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration)); // Ensure duration is set
      
      // Setup visualization after a short delay to ensure audio element is ready
      setTimeout(() => {
        setupAudioVisualization();
        audio.play();
      }, 100);
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePodcastClick = async () => {
    if (podcastReady && audioRef.current) {
      handlePlayPause();
      return;
    }

    if (isGeneratingPodcast) return;

    setIsGeneratingPodcast(true);
    try {
      if (!space) throw new Error('Space not found');

      const response = await fetch('/api/make-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceDetails: space,
          content: content 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate podcast');
      }

      const audioBlob = await response.blob();
      const newAudioUrl = URL.createObjectURL(audioBlob);
      
      const savedPodcast = await savePodcast(spaceId, {
        space_id: spaceId,
        title: `Podcast - ${new Date().toLocaleString()}`,
        audio_url: newAudioUrl,
      });

      setAudioUrl(newAudioUrl);
      setCurrentPodcast(savedPodcast);
      
      const audio = new Audio(newAudioUrl);
      audioRef.current = audio;
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration)); // Ensure duration is set

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

  const mainColor = space.space_color?.main || '#000000';
  const secondaryColor = space.space_color?.secondary || '#f3f4f6';

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <Card className="border-4 p-8 rounded-none" style={{ 
        borderColor: mainColor,
        backgroundColor: secondaryColor 
      }}>
        {/* Cassette Design */}
        <div className="relative mb-8 aspect-[3/2] border-2 rounded-sm p-4" style={{ borderColor: mainColor }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/2 aspect-square border-2 rounded-full" style={{ borderColor: mainColor }}>
              <div className="w-full h-full animate-spin-slow relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1/4 aspect-square bg-current rounded-full" style={{ backgroundColor: mainColor }} />
                </div>
                <div className="absolute inset-0 border-t-2" style={{ borderColor: mainColor }} />
              </div>
            </div>
          </div>
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Audio Element */}
        <audio ref={audioRef} />

        {/* Track Info */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: mainColor }}>
            {currentPodcast?.title || 'No Podcast Selected'}
          </h2>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-[auto,1fr,auto] gap-4 items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {/* Handle previous */}}
            className="rounded-none hover:bg-transparent"
            style={{ color: mainColor }}
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            onClick={handlePodcastClick}
            className={cn(
              "w-16 h-16 mx-auto rounded-none transition-colors",
              isGeneratingPodcast && "animate-pulse"
            )}
            style={{ 
              backgroundColor: mainColor,
              color: secondaryColor
            }}
            disabled={isGeneratingPodcast}
          >
            {isGeneratingPodcast ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 translate-x-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {/* Handle next */}}
            className="rounded-none hover:bg-transparent"
            style={{ color: mainColor }}
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-6">
          <Slider
            value={[currentTime ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleProgress}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-sm font-mono" style={{ color: mainColor }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="rounded-none hover:bg-transparent"
            style={{ color: mainColor }}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={handleVolume}
            className="w-32 cursor-pointer"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-4">{error}</p>
        )}

        {/* Playlist */}
        {spacePodcasts.length > 0 && (
          <div className="mt-8 border-t-2" style={{ borderColor: mainColor }}>
            <h3 className="font-medium my-4" style={{ color: mainColor }}>Saved Podcasts</h3>
            <div className="space-y-2">
              {spacePodcasts.map((podcast) => (
                <Button
                  key={podcast.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 rounded-none hover:bg-transparent",
                    currentPodcast?.id === podcast.id && "bg-black/5"
                  )}
                  style={{ color: mainColor }}
                  onClick={() => handlePlayPause(podcast)}
                >
                  {currentPodcast?.id === podcast.id && isPlaying ? (
                    <Pause className="h-4 w-4 shrink-0" />
                  ) : (
                    <Play className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{podcast.title}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 