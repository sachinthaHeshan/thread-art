"use client";

import { useEffect, useState } from "react";
import {
  darknessFromPixels,
  planThreads,
  type ThreadSegment,
  type ThreadTune,
} from "@/lib/thread-pattern";

const SAMPLE_SIZE = 500;

export function useThreadArt(
  imageUrl: string,
  pinCount: number | null,
  lineCount: number | null,
  tune: ThreadTune,
) {
  const [plan, setPlan] = useState<ThreadPlan>({ key: "", threads: [], progress: null });
  const ready = pinCount !== null && lineCount !== null;
  const { weight, minDistance, memory } = tune;
  const key = ready ? `${imageUrl}|${pinCount}|${lineCount}|${weight}|${minDistance}|${memory}` : "";

  useEffect(() => {
    if (pinCount === null || lineCount === null) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setPlan({ key, threads: [], progress: 0 });

        try {
          const darkness = await sampleCircle(imageUrl, SAMPLE_SIZE);
          if (cancelled) return;

          const segments = await planThreads({
            darkness,
            size: SAMPLE_SIZE,
            pinCount,
            lineCount,
            tune: { weight, minDistance, memory },
            isCancelled: () => cancelled,
            onProgress: (done, partial) => {
              if (cancelled) return;
              setPlan((current) => ({
                key,
                threads: done % 120 === 0 ? partial : current.key === key ? current.threads : [],
                progress: done,
              }));
            },
          });

          if (!cancelled) setPlan({ key, threads: segments, progress: null });
        } catch {
          if (!cancelled) setPlan({ key, threads: [], progress: null });
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [imageUrl, key, lineCount, memory, minDistance, pinCount, weight]);

  const current = plan.key === key ? plan : null;

  return {
    threads: current?.threads ?? [],
    progress: current?.progress ?? null,
  };
}

type ThreadPlan = {
  key: string;
  threads: ThreadSegment[];
  progress: number | null;
};

async function sampleCircle(url: string, size: number) {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable.");

  context.clearRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);
  return darknessFromPixels(context.getImageData(0, 0, size, size).data, size);
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be read."));
    image.src = url;
  });
}
