'use client';
import { MutableRefObject, useEffect, useRef, useState } from 'react';

type Lokasi = {
  id_lokasi: number;
  lokasi: string;
  image: string;
};

type EventData = {
  id_display: number;
  judul: string;
  deskripsi: string;
  media: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: string;
  kategori: 'event' | 'informasi';
  createdAt: string;
  updatedAt: string;
  modifiedAt: string;
  lokasi: Lokasi[];
};

const formatDate = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  };
  return date.toLocaleDateString('id-ID', options).replace(',', '');
};

const formatCurrentTime = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  return date.toLocaleTimeString('id-ID', options);
};

const formatEventTime = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  return date.toLocaleTimeString('id-ID', options);
};

const Display = () => {
  const [data, setData] = useState<EventData[] | null>(null);
  const [mediaUrls, setMediaUrls] = useState<{ [key: number]: string | null }>({});
  const [mediaTypes, setMediaTypes] = useState<{ [key: number]: string | null }>({});
  const [imageError, setImageError] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [displayedEvents, setDisplayedEvents] = useState<EventData[]>([]);
  const [displayedInformation, setDisplayedInformation] = useState<EventData[]>([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState<number>(0);
  const [locations, setLocations] = useState<Lokasi[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const maxDisplayedEvents = 5;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const currentArticleRotationInterval: MutableRefObject<number | null> = useRef<number | null>(null);
  const youtubeEmbedRef = useRef<HTMLDivElement | null>(null);

  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  


  // update tanggal dan waktu
  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(formatCurrentTime(new Date()));
      setCurrentDate(formatDate(new Date()));
    };

    updateCurrentTime();
    const intervalId = setInterval(updateCurrentTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // mengambil data lokasi
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/lokasi/find', {
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error(`Error fetching locations: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Response from API:', result);
        setLocations(result.data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, []);

  const pollData = async () => {
    if (!selectedLocation) {
      return;
    }
    try {
      const response = await fetch('/api/dislok/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lokasi: selectedLocation }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      const newData = result.data;

      const filteredData = newData.filter((item: EventData) =>
        item.lokasi.some((loc) => loc.id_lokasi === selectedLocation)
      );

      if (JSON.stringify(filteredData) !== JSON.stringify(data)) {
        setData(filteredData);

        const urls: { [key: number]: string | null } = {};
        const types: { [key: number]: string | null } = {};
        for (const item of filteredData) {
          const { url, type } = await classifyMedia(item.media, item.id_display);
          urls[item.id_display] = url;
          types[item.id_display] = type;
        }
        setMediaUrls(urls);
        setMediaTypes(types);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    }
  };

  const classifyMedia = async (media: string, id_display: number): Promise<{ url: string | null; type: string }> => {
    const fileExtension = media.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
      const imageUrl = `http://localhost:3333/api/dislok/media?id_display=${id_display}&type=file`;
      return { url: imageUrl, type: 'image' };
    } else if (fileExtension === 'mp4') {
      const videoUrl = `http://localhost:3333/api/dislok/media?id_display=${id_display}&type=file`;
      return { url: videoUrl, type: 'video' };
    } else {
      const embedUrl = `http://localhost:3333/api/dislok/media?id_display=${id_display}&type=embed`;
      return { url: embedUrl, type: 'youtube' };
    }
  };


  

  useEffect(() => {
    const id_display = displayedInformation[currentArticleIndex]?.id_display;

    const fetchEmbedCode = async () => {
      try {
        const response = await fetch(`/api/dislok/media?id_display=${id_display}&type=embed`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Gagal mengambil embed code');
        }

        const result = await response.text();
        setEmbedHtml(result);
      } catch (error) {
        console.error('Error fetching embed code:', error);
      }
    };

    if (id_display && mediaTypes[id_display] === 'youtube') {
      fetchEmbedCode();
    }
  }, [currentArticleIndex, displayedInformation, mediaTypes]);

  useEffect(() => {
    pollData();
    // const intervalId = setInterval(pollData, 60000);
    // return () => clearInterval(intervalId);
  }, [selectedLocation]);


  const filterUpcomingEvents = (events: EventData[]) => {
    const now = new Date();
    return events
      .filter(event => new Date(event.waktu_mulai).toDateString() === now.toDateString())
      .sort((a, b) => new Date(a.waktu_mulai).getTime() - new Date(b.waktu_mulai).getTime());
  };

  useEffect(() => {
    if (data) {
      const upcomingEvents = filterUpcomingEvents(data).filter(event => {
        const now = new Date();
        const endTime = new Date(event.waktu_selesai);
        return now <= endTime && event.kategori === 'event';
      });

      setDisplayedEvents(upcomingEvents.slice(0, maxDisplayedEvents));

      const upcomingInformation = filterUpcomingEvents(data).filter(info => {
        const now = new Date();
        const endTime = new Date(info.waktu_selesai);
        return now <= endTime && info.kategori === 'informasi';
      });

      setDisplayedInformation(upcomingInformation);
    }
  }, [data, selectedLocation]);


  useEffect(() => {
    console.log('Selected Location:', selectedLocation);
    console.log('Data:', data);
  }, [selectedLocation, data]);

  useEffect(() => {
    if (data) {
      const upcomingEvents = filterUpcomingEvents(data).filter(event => {
        const now = new Date();
        const endTime = new Date(event.waktu_selesai);
        return now <= endTime && event.kategori === 'event';
      });

      setDisplayedEvents(upcomingEvents.slice(0, maxDisplayedEvents));

      const upcomingInformation = filterUpcomingEvents(data).filter(info => {
        const now = new Date();
        const endTime = new Date(info.waktu_selesai);
        return now <= endTime && info.kategori === 'informasi';
      });

      if (upcomingInformation.length > 0) {
        setDisplayedInformation(upcomingInformation);
        if (upcomingInformation.length === 1) {
          setCurrentArticleIndex(0);
        } else {
          setCurrentArticleIndex(prev => (prev + 1) % upcomingInformation.length);
        }
      }
    }
  }, [data, selectedLocation]);

  useEffect(() => {
    const id_display = displayedInformation[currentArticleIndex]?.id_display;
    const currentMediaType = mediaTypes[id_display];
  
    if (youtubeEmbedRef.current && currentMediaType === 'youtube') {
      const embedHtml = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
     <iframe
            src="http://localhost:3333/api/dislok/media?id_display=${id_display}&type=embed"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            style="width:100%; height:100%; padding-left:10%;"
          ></iframe>
        </div>`;
      youtubeEmbedRef.current.innerHTML = embedHtml;
  
      // Extract the video ID and fetch its duration
      const videoId = extractVideoId(embedHtml);
      if (videoId) {
        const storedDuration = sessionStorage.getItem(`videoDuration_${videoId}`);
        console.log("Stored duration for video session:", storedDuration);
  
        const timeoutDuration = storedDuration 
          ? parseInt(storedDuration, 10) * 1000 
          : 10000;  // Default to 10 seconds if no stored duration
  
        console.log("Timeout Durationssss:", timeoutDuration);
  
        // Set timeout for article rotation
        currentArticleRotationInterval.current = window.setTimeout(() => {
          setCurrentArticleIndex((prev) => (prev + 1) % displayedInformation.length);
        }, timeoutDuration);
  
        // Fetch and save video duration if not already in sessionStorage
        if (!storedDuration) {
          fetchVideoDuration(videoId);
        }
      }
    }
  
    if (currentArticleRotationInterval.current !== null) {
      window.clearTimeout(currentArticleRotationInterval.current);
      currentArticleRotationInterval.current = null;
    }
  
    return () => {
      if (currentArticleRotationInterval.current !== null) {
        window.clearTimeout(currentArticleRotationInterval.current);
        currentArticleRotationInterval.current = null;
      }
    };
  }, [currentArticleIndex, mediaTypes, displayedInformation.length]);
  
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
      console.log('Video Duration:', parsedDuration);
      
      // Simpan durasi ke session storage dengan kunci yang sesuai dengan videoId
      sessionStorage.setItem(`videoDuration_${videoId}`, parsedDuration.toString());
  
      setVideoDuration(parsedDuration);
    } catch (error) {
      console.error('Error fetching video duration:', error);
    }
  };
  
  const parseYouTubeDuration = (duration: string): number => {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);
    const hours = parseInt(matches?.[1] || '0', 10);
    const minutes = parseInt(matches?.[2] || '0', 10);
    const seconds = parseInt(matches?.[3] || '0', 10);
  
    // Hitung total detik
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    return totalSeconds; // Return sebagai number
  };
  

  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = event.currentTarget;
    console.log("Video duration:", videoElement.duration);

    if (videoElement.duration && !isNaN(videoElement.duration)) {
      if (currentArticleRotationInterval.current) {
        window.clearTimeout(currentArticleRotationInterval.current);
      }

      currentArticleRotationInterval.current = window.setTimeout(() => {
        setCurrentArticleIndex((prev) => (prev + 1) % displayedInformation.length);
      }, videoElement.duration * 1000);
    } else {
      console.warn("Duration is NaN or undefined");
      currentArticleRotationInterval.current = window.setTimeout(() => {
        setCurrentArticleIndex((prev) => (prev + 1) % displayedInformation.length);
      }, 10000);
    }
  };




  useEffect(() => {
    return () => {
      if (currentArticleRotationInterval.current) {
        clearInterval(currentArticleRotationInterval.current);
      }
    };
  }, []);

  const isEventOngoing = (event: EventData) => {
    const now = new Date();
    return now >= new Date(event.waktu_mulai) && now <= new Date(event.waktu_selesai);
  };

  return (
    <>
      <link rel="stylesheet" href="/styles/global.css" />
      <link rel="stylesheet" href="/styles/style.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,500;0,700;0,800&display=swap"
      />

      <div className="tv-1">
        <main className="footer">
          <header className="footer-child" />
          <div className="rectangle-parent">
            <div className="frame-child" />
            <div className="location">
              <select
                onChange={(e) => setSelectedLocation(Number(e.target.value))}
                value={selectedLocation ?? ""}
              >
                <option value="">Default</option>
                {locations.map((loc) => (
                  <option key={loc.id_lokasi} value={loc.id_lokasi}>
                    {loc.lokasi}
                  </option>
                ))}
              </select>
            </div>
            <footer className="running-teks">
              {data && data.some(event => {
                const now = new Date();
                const startTime = new Date(event.waktu_mulai);
                const endTime = new Date(event.waktu_selesai);
                return event.kategori === 'event' && now >= startTime && now <= endTime;
              }) ? (
                data
                  .filter(event => {
                    const now = new Date();
                    const startTime = new Date(event.waktu_mulai);
                    const endTime = new Date(event.waktu_selesai);
                    return event.kategori === 'event' && now >= startTime && now <= endTime;
                  })
                  .map((event, index) => (
                    <div key={index} className="marquee">{event.deskripsi}</div>
                  ))
              ) : (
                <div className="marquee">
                  Tidak ada event yang sedang berlangsung
                </div>
              )}
            </footer>
          </div>
        </main>

        <div className="content">
          <div className="left-panel">
            <div className="header">
              <div className="header-bg" />
              <h1 className="header-title">TPS INFORMATION</h1>
            </div>

            {/* Information */}
            <div className="article-preview">
              {
                displayedInformation.length > 0 && displayedInformation[currentArticleIndex] ? (
                  <div className="article-content">
                    {mediaTypes[displayedInformation[currentArticleIndex]?.id_display]?.includes("video") ? (
                      <video
                        ref={videoRef}
                        className="media"
                        src={mediaUrls[displayedInformation[currentArticleIndex]?.id_display] ?? undefined}
                        autoPlay
                        loop
                        muted
                        onLoadedMetadata={handleLoadedMetadata}
                      />
                    ) : mediaTypes[displayedInformation[currentArticleIndex]?.id_display]?.includes("youtube") ? (
                      <div ref={youtubeEmbedRef} className="media"></div>
                      
                    ) 
                    : (
                      <img
                        className="media"
                        src={mediaUrls[displayedInformation[currentArticleIndex]?.id_display] ?? undefined}
                        onError={() => setImageError(true)}
                        alt={displayedInformation[currentArticleIndex]?.judul || 'Media'}
                      />
                    )}
                    <b className="judul">{displayedInformation[currentArticleIndex].judul}</b>
                    <div className="deskripsi">{displayedInformation[currentArticleIndex].deskripsi}</div>
                  </div>
                ) : (
                  <div>No information today...</div>
                )
              }
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="panel">
            <a id="current-time" className="a">{currentTime}</a>
            <div className="icon-tag">
              <img
                className="icon"
                loading="lazy"
                alt="TPS Logo"
                src="/assets/tps-logo.png"
              />
            </div>
          </div>

          {/* Events */}
          <div className="events">
            <div className="events-title">
              <h3 className="upcoming-events">Upcoming Events</h3>
              <div className="events-list">
                <div className="events-list-child"></div>
                <a className="date">{currentDate}</a>
              </div>
            </div>

            {displayedEvents.length > 0 ? (
              displayedEvents.map((event, index) => (
                <div key={index} className={isEventOngoing(event) ? "events-title1" : "rectangle-group"}>
                  {isEventOngoing(event) ? (
                    <>
                      <div className="events-title-child"></div>
                      <div className="rectangle-container">
                        <div className="frame-inner"></div>
                        <div className="waktu-mulai">{formatEventTime(new Date(event.waktu_mulai))}</div>
                      </div>
                      <div className="on-title-wrapper">
                        <b className="on-title-event">{event.judul}</b>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="frame-item"></div>
                      <div className="chart-grid">
                        <div className="chart-grid-child"></div>
                        <div className="waktu-mulai">{formatEventTime(new Date(event.waktu_mulai))}</div>
                      </div>
                      <div className="title-wrapper">
                        <div className="title-event">{event.judul}</div>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div>No events today...</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Display;