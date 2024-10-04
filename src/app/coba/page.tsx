"use client";
import { useEffect, useState } from 'react';

export default function DisplayMedia() {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const id_display = 163;

  useEffect(() => {
    const fetchEmbedCode = async () => {
      try {
        const response = await fetch(`/api/dislok/media?id_display=${id_display}&type=embed`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Gagal mengambil embed code');
        }

        const result = await response.text(); // Mendapatkan embed code sebagai string HTML
        setEmbedHtml(result); // Menyimpan embed code di state
      } catch (error) {
        console.error('Error fetching embed code:', error);
      }
    };

    fetchEmbedCode(); // Memanggil fungsi fetch ketika komponen dimount
  }, [id_display]);



  if (!embedHtml) {
    return <p>Loading embed code...</p>;
  }

  
  return (
    <div>
      <h1>Try to Embedded YouTube Video</h1>
      {/* Menggunakan dangerouslySetInnerHTML untuk render embed code */}
      <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
    </div>
  );
}