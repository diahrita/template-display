'use client';
import { useState, useEffect, useRef, MutableRefObject } from 'react';

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
  // const currentArticleRotationInterval = useRef<NodeJS.Timeout | null>(null)
  const [locations, setLocations] = useState<Lokasi[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const maxDisplayedEvents = 5;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentArticleRotationInterval: MutableRefObject<number | null> = useRef<number | null>(null);

  useEffect(() => {
    setCurrentTime(formatCurrentTime(new Date()));
    setCurrentDate(formatDate(new Date()));

    const updateCurrentTime = () => {
      setCurrentTime(formatCurrentTime(new Date()));
      setCurrentDate(formatDate(new Date()));
    };

    const intervalId = setInterval(updateCurrentTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

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
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({lokasi: selectedLocation}),
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
        for (const item of filteredData) {
          const url = await getMediaUrl(item.id_display);
          urls[item.id_display] = url;
        }
        setMediaUrls(urls);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    }
  };

  const getMediaUrl = async (id_display: number): Promise<string | null> => {
    try {
      // Fetch media type file
      const fileTypeResponse = await fetch(`/api/dislok/media?id_display=${id_display}&type=file`, {
        method: 'GET',  // Changed to GET
      });
    
      const contentType = fileTypeResponse.headers.get('Content-Type');
    
      if (contentType?.includes("video") || contentType?.includes("image")) {
        // Handle media file (video or image)
        const blob = await fileTypeResponse.blob();
        const url = URL.createObjectURL(blob);
        setMediaUrls(prev => ({ ...prev, [id_display]: url }));
        setMediaTypes(prev => ({ ...prev, [id_display]: contentType }));
        return url;
      } else {
        // Handle media embed (YouTube)
        const embedResponse = await fetch(`/api/dislok/media?id_display=${id_display}&type=embed`, {
          method: 'GET',  // Changed to GET
        });
    
        // Ensure the response is JSON
        if (embedResponse.headers.get('Content-Type')?.includes('application/json')) {
          const embedData = await embedResponse.json();
          const youtubeUrl = embedData.embed_url;
          setMediaUrls(prev => ({ ...prev, [id_display]: youtubeUrl }));
          setMediaTypes(prev => ({ ...prev, [id_display]: "youtube" }));
          return youtubeUrl;
        } else {
          console.error('Error: Received non-JSON response for embed media');
          return null;
        }
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      return null;
    }
  };  

   useEffect(() => {
    pollData();
    const intervalId = setInterval(pollData, 60000);
    return () => clearInterval(intervalId);
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

    const handleLoadedData = () => {
      if (videoRef.current) {
        console.log("Video loaded:", videoRef.current.duration);
      }
    };

    useEffect(() => {
      const currentMediaType = mediaTypes[displayedInformation[currentArticleIndex]?.id_display];
    
      if (currentArticleRotationInterval.current !== null) {
        window.clearTimeout(currentArticleRotationInterval.current);
        currentArticleRotationInterval.current = null;
      }
    
      if (currentMediaType?.includes("video")) {
        const videoElement = videoRef.current;
        if (videoElement) {
          videoElement.play();
        }
      } else if (currentMediaType === "youtube") {
        // Tentukan durasi tampilan YouTube (misal: 60 detik)
        currentArticleRotationInterval.current = window.setTimeout(() => {
          setCurrentArticleIndex((prev) => (prev + 1) % displayedInformation.length);
        }, 60000); // Set 60 detik untuk tampilan YouTube
      } else {
        currentArticleRotationInterval.current = window.setTimeout(() => {
          setCurrentArticleIndex((prev) => (prev + 1) % displayedInformation.length);
        }, 10000); // Durasi default 10 detik
      }
    
      return () => {
        if (currentArticleRotationInterval.current !== null) {
          window.clearTimeout(currentArticleRotationInterval.current);
          currentArticleRotationInterval.current = null;
        }
      };
    }, [currentArticleIndex, mediaTypes, displayedInformation.length, displayedInformation]);    
  
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
      // Fallback durasi default (misalnya 10 detik)
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

  const events = data?.filter(event => event.kategori === 'event') || [];
  const articles = data?.filter(event => event.kategori === 'informasi') || [];
  
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
                  <iframe
                    className="media"
                    width="560"
                    height="315"
                    src={mediaUrls[displayedInformation[currentArticleIndex]?.id_display] ?? undefined}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
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
