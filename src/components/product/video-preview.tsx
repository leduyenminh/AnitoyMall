"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/i18n";
import { tiktokVideoUrl } from "@/lib/site";
import { formatViews, type VideoCard } from "@/lib/videos";
import { useI18n } from "../i18n";
import { CloseIcon, PlayIcon } from "../icons";
import { TikTokPlayer } from "./tiktok-video";

/**
 * "▶ 721.5K" badge on product cards: total TikTok views of the product's videos. Opens the most
 * viewed one in TikTok's player without leaving the page.
 */
export function VideoPreviewButton({
  video,
  totalViews,
  productTitle,
  productHref,
}: {
  video: VideoCard;
  totalViews: number;
  productTitle: string;
  productHref: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="video-badge"
        onClick={() => setOpen(true)}
        aria-label={`${t.product.watchVideo}: ${productTitle} (${fmt(t.product.views, { n: formatViews(totalViews) })})`}
      >
        <PlayIcon size={12} /> {formatViews(totalViews)}
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="video-modal window"
          aria-label={productTitle}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) dialog.current?.close();
          }}
        >
          <div className="window__titlebar">
            <span className="window__title">{productTitle}</span>
          </div>
          <div className="video-modal__body">
            <button type="button" className="icon-btn video-modal__close" onClick={() => dialog.current?.close()} aria-label={t.cart.close}>
              <CloseIcon />
            </button>
            <div className="video-modal__stage">
              <TikTokPlayer videoId={video.id} title={video.title} />
            </div>
            <div className="video-modal__footer">
              <p className="video-modal__title">{productTitle}</p>
              <p className="muted small">
                {fmt(t.product.views, { n: formatViews(video.views) })} ·{" "}
                <a href={tiktokVideoUrl(video.id)} target="_blank" rel="noopener">
                  {t.home.watchOnTikTok} ↗
                </a>
              </p>
              <Link href={productHref} className="btn btn--primary btn--block" onClick={() => dialog.current?.close()}>
                {t.product.viewProduct}
              </Link>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
