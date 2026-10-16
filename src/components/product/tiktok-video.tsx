"use client";

import Image from "next/image";
import { useState } from "react";
import { fmt } from "@/i18n";
import { site, tiktokVideoUrl } from "@/lib/site";
import { formatViews, tiktokPlayerUrl, type VideoCard } from "@/lib/videos";
import { useI18n } from "../i18n";
import { PlayIcon, TikTokIcon } from "../icons";

/** TikTok's official player in an iframe (plays are served and counted by TikTok, not by us). */
export function TikTokPlayer({ videoId, title, className = "" }: { videoId: string; title: string; className?: string }) {
  return (
    <iframe
      className={`tiktok-player ${className}`}
      src={tiktokPlayerUrl(videoId)}
      title={title}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}

/**
 * The real cover with TikTok's view count; a click swaps in TikTok's player. The player
 * (≈1 MB of script) only loads when a shopper asks for the video, keeping pages fast.
 */
export function TikTokVideo({ video, sizes = "(min-width: 900px) 280px, 45vw" }: { video: VideoCard; sizes?: string }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="tiktok-video window">
      <div className="tiktok-video__stage">
        {playing ? (
          <TikTokPlayer videoId={video.id} title={video.title} className="tiktok-video__frame" />
        ) : (
          <button
            type="button"
            className="tiktok-video__facade"
            onClick={() => setPlaying(true)}
            aria-label={`${t.product.playVideo}: ${video.title}`}
          >
            <Image src={video.cover} alt="" fill sizes={sizes} className="tiktok-video__poster" />
            <span className="tiktok-video__play" aria-hidden="true">
              <PlayIcon size={26} />
            </span>
            <span className="tiktok-video__views">
              <PlayIcon size={12} /> {fmt(t.product.views, { n: formatViews(video.views) })}
            </span>
            <span className="tiktok-video__caption">
              <TikTokIcon size={13} /> @{site.tiktok.handle}
            </span>
          </button>
        )}
      </div>
      <figcaption className="tiktok-video__meta">
        <span className="tiktok-video__title">{video.title}</span>
        <a className="tiktok-video__link" href={tiktokVideoUrl(video.id)} target="_blank" rel="noopener">
          {t.home.watchOnTikTok} ↗
        </a>
      </figcaption>
    </figure>
  );
}
