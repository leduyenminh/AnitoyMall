"use client";

import { useState } from "react";
import { site, tiktokVideoUrl } from "@/lib/site";
import { useI18n } from "../i18n";
import { PlayIcon, TikTokIcon } from "../icons";

/**
 * Click-to-play facade for a TikTok video. The TikTok player (≈1 MB of script) and its cookies
 * load only when the shopper asks for the video, keeping product pages fast.
 */
export function TikTokVideo({ videoId, poster, title }: { videoId: string; poster?: string; title: string }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="tiktok-video window">
        <iframe
          className="tiktok-video__frame"
          src={`https://www.tiktok.com/player/v1/${videoId}?autoplay=1&music_info=1&description=1&rel=0`}
          title={title}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="tiktok-video window">
      <button
        type="button"
        className="tiktok-video__facade"
        onClick={() => setPlaying(true)}
        aria-label={`${t.product.playVideo}: ${title}`}
        style={poster ? { backgroundImage: `url(${poster})` } : undefined}
      >
        <span className="tiktok-video__play" aria-hidden="true">
          <PlayIcon size={28} />
        </span>
        <span className="tiktok-video__caption">
          <TikTokIcon size={14} /> @{site.tiktok.handle}
        </span>
      </button>
      <a className="tiktok-video__link" href={tiktokVideoUrl(videoId)} target="_blank" rel="noopener">
        {t.home.watchOnTikTok} ↗
      </a>
    </div>
  );
}
