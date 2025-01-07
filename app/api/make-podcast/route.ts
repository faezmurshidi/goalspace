import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

export async function POST(req: Request) {
  try {
    // Validate API keys
    if (!process.env.OPENAI_API_KEY || !ELEVEN_LABS_API_KEY) {
      console.error('API Keys:', {
        openai: !!process.env.OPENAI_API_KEY,
        elevenlabs: !!ELEVEN_LABS_API_KEY
      });
      throw new Error('Missing API keys');
    }

    const { spaceDetails } = await req.json();
    
    if (!spaceDetails) {
      throw new Error('Missing space details');
    }

    console.log('Space details:', {
      title: spaceDetails.title,
      description: spaceDetails.description,
      objectives: spaceDetails.objectives
    });

    // Generate podcast script using OpenAI
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a podcast script writer. Create a 30-minute podcast script that covers the topic in an engaging and educational way."
          },
          {
            role: "user",
            content: `Create a podcast script about: ${spaceDetails.title}\n\nContext:\n${spaceDetails.description}\n\nObjectives:\n${spaceDetails.objectives.join('\n')}`
          }
        ]
      });

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No script generated');
      }

      const script = completion.choices[0].message.content;
      console.log('Script generated successfully, length:', script.length);

      // Convert script to audio using Eleven Labs
      const response = await fetch(`${ELEVEN_LABS_API_URL}/text-to-speech/${ELEVEN_LABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Eleven Labs Error:', errorData);
        throw new Error('Failed to generate audio');
      }

      const audioBuffer = await response.arrayBuffer();
      console.log('Audio generated successfully, size:', audioBuffer.byteLength);
      
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString()
        }
      });
    } catch (error: any) {
      console.error('OpenAI Error Details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause
      });
      throw new Error(`Failed to generate script: ${error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error in make-podcast:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate podcast'
    }, { status: 500 });
  }
} 