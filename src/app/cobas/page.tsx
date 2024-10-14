"use client";
import { useEffect, useState } from 'react';

export default function DisplayMedia() {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<string>('');


  const id_display = 182;

  useEffect(() => {
    const fetchEmbedCode = async () => {
      try {
        const response = await fetch(`/api/dislok/media?id_display=${id_display}&type=embed`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Gagal mengambil embed code');
        }

        const result = await response.text();
        console.log("Embed HTML yang diambil yahh:", result);
        setEmbedHtml(result);

        const videoId = extractVideoId(result);
        if (videoId) {
          fetchVideoDuration(videoId);
        }
      } catch (error) {
        console.error('Error fetching embed code:', error);
      }
    };

    fetchEmbedCode();
  }, [id_display]);


  const extractVideoId = (embedHtml: string): string | null => {
    const regex = /(?:youtube\.com\/embed\/|youtu\.be\/)([^?&/]+)/;
    const match = embedHtml.match(regex);
    return match ? match[1] : null;
  };

  const fetchVideoDuration = async (videoId: string) => {
    const youtubeApiKey = 'AIzaSyAQ1R7IzcNk70379BxWp58PHJ3hw0o8UA8';
    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${youtubeApiKey}`;

    try {
      const response = await fetch(youtubeApiUrl);
      const youtubeData = await response.json();
      const duration = youtubeData.items[0].contentDetails.duration;

      const parsedDuration = parseYouTubeDuration(duration);
      setVideoDuration(parsedDuration);
    } catch (error) {
      console.error('Error fetching video duration:', error);
    }
  };


  const parseYouTubeDuration = (duration: string): string => {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);
    const hours = parseInt(matches?.[1] || '0', 10);
    const minutes = parseInt(matches?.[2] || '0', 10);
    const seconds = parseInt(matches?.[3] || '0', 10);

    return `${hours ? hours + ':' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!embedHtml) {
    return <p>Loading embed code...</p>;
  }

  return (
    <div>
      <h1>Try to Embed YouTube Video</h1>
      <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
      <h2>Durasi Video: {videoDuration || 'Loading...'}</h2>
    </div>
  );
}
