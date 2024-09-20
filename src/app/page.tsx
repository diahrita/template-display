'use client';
import { useState, useEffect, useRef } from 'react';

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
  const [imageError, setImageError] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [displayedEvents, setDisplayedEvents] = useState<EventData[]>([]);
  const [displayedInformation, setDisplayedInformation] = useState<EventData[]>([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState<number>(0);
  const currentArticleRotationInterval = useRef<NodeJS.Timeout | null>(null)
  const [locations, setLocations] = useState<Lokasi[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const maxDisplayedEvents = 5;

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
      const response = await fetch(`/api/dislok/media?id_display=${id_display}&type=file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error(`Error fetching media: ${response.status} - ${response.statusText}`);
      }
  
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching media:', error);
      return null;
    }
  };  

  const isVideoFile = (url: string | null) => {
    return url ? url.endsWith(".mp4") : false;
  };
  
  const isYouTubeEmbed = (url: string | null) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url || "");
  };

   useEffect(() => {
    pollData();
    const intervalId = setInterval(pollData, 5000);
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

      if (upcomingInformation.length === 1) {
        setCurrentArticleIndex(0);
        if (currentArticleRotationInterval.current) {
          clearInterval(currentArticleRotationInterval.current);
        }
      } else if (upcomingInformation.length > 1) {
        setDisplayedInformation(upcomingInformation);
        if (currentArticleRotationInterval.current) {
          clearInterval(currentArticleRotationInterval.current);
        }
        currentArticleRotationInterval.current = setInterval(() => {
          setCurrentArticleIndex((prevIndex) => (prevIndex + 1) % upcomingInformation.length);
        }, 3000); // 1000 ms = 1 detik
      }
    }
  }, [data, selectedLocation]);

  useEffect(() => {
    return () => {
      if (currentArticleRotationInterval.current) {
        clearInterval(currentArticleRotationInterval.current);
      }
    };
  }, []);
    

  const rotateEvents = () => {
    const upcomingEvents = filterUpcomingEvents(data || []);
    const remainingEvents = upcomingEvents.slice(maxDisplayedEvents);

    if (remainingEvents.length > 0) {
      setDisplayedEvents(remainingEvents.slice(0, maxDisplayedEvents));
    }
  };

  const isEventOngoing = (event: EventData) => {
    const now = new Date();
    return now >= new Date(event.waktu_mulai) && now <= new Date(event.waktu_selesai);
  };

  const events = data?.filter(event => event.kategori === 'event') || [];
  const articles = data?.filter(event => event.kategori === 'informasi') || [];

  useEffect(() => {
    console.log("Media URL:", mediaUrls[articles[currentArticleIndex]?.id_display]);
  }, [mediaUrls, currentArticleIndex]);
  
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
                  // Tampilkan konten default saat tidak ada data
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
                {/* Jika media adalah video MP4 atau YouTube embed */}
                {
                  mediaUrls[articles[currentArticleIndex].id_display] &&
                  (
                    isVideoFile(mediaUrls[articles[currentArticleIndex].id_display]) ? (
                      <video
                        className="media"
                        src={mediaUrls[articles[currentArticleIndex].id_display] ?? undefined}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        onError={(e) => console.error("Video error:", e)}
                      />
                    ) : isYouTubeEmbed(mediaUrls[articles[currentArticleIndex].id_display]) ? (
                      <iframe
                        className="media"
                        src={`${mediaUrls[articles[currentArticleIndex].id_display]?.replace('watch?v=', 'embed/')}?autoplay=1&mute=1&loop=1`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      // Tampilan gambar default atau media lain
                      <img
                        className="media"
                        loading="lazy"
                        src={mediaUrls[articles[currentArticleIndex].id_display] ?? "/assets/image.png"}
                        onError={() => setImageError(true)}
                        alt="No media"
                      />
                    )
                  )
                }
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
