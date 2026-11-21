"use client";

import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";

type ProcessResult = {
  job_id: string;
  output_url: string;
  faces_detected: number;
  plates_detected: number;
  processed_frames: number;
  total_frames: number;
  processing_seconds: number;
  plate_protection: boolean;
};

const API_URL =
  process.env.NEXT_PUBLIC_PIXORA_API_URL ?? "http://localhost:5000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [status, setStatus] = useState("");
  const [processing, setProcessing] = useState(false);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setOutputUrl("");
    setResult(null);
    setStatus("");
    if (selected) {
      setOriginalUrl(URL.createObjectURL(selected));
    }
  };

  const processVideo = async () => {
    if (!file) return;

    setProcessing(true);
    setOutputUrl("");
    setResult(null);
    setStatus("Analyzing and protecting faces...");

    const form = new FormData();
    form.append("video", file);

    try {
      const response = await fetch(`${API_URL}/api/process-video`, {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Processing failed");

      setResult(data);
      setOutputUrl(`${API_URL}${data.output_url}`);
      setStatus("Your protected video is ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-12">
      <section className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
          P
        </div>
        <h1 className="text-4xl font-bold">Pixora Shield</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Upload a video and automatically blur identifiable faces before you
          share it.
        </p>
      </section>

      <section className="mb-8 rounded-2xl bg-indigo-50 p-6 text-left dark:bg-indigo-950/30">
        <h2 className="mb-2 font-bold text-indigo-950 dark:text-indigo-100">
          How Pixora protects privacy
        </h2>
        <p className="text-sm leading-6 text-indigo-900 dark:text-indigo-200">
          Pixora scans each video frame, identifies visible faces, and replaces
          those regions with a Gaussian blur. The original upload is deleted
          after processing; the protected MP4 is retained only for download.
          Detection is not a guarantee of perfect anonymization.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 p-6 shadow-sm dark:border-gray-800">
        <label className="mb-3 block text-sm font-semibold">Choose a video</label>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          onChange={selectFile}
          className="block w-full rounded-lg border border-gray-300 p-3 dark:border-gray-700"
        />
        <Button
          className="mt-4 w-full bg-indigo-600 py-5 text-lg text-white hover:bg-indigo-700"
          onClick={processVideo}
          disabled={!file || processing}
        >
          {processing ? "Protecting video..." : "Protect video"}
        </Button>
        {status && (
          <p className="mt-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {status}
          </p>
        )}
      </section>

      {(originalUrl || outputUrl) && (
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          {originalUrl && (
            <div>
              <h2 className="mb-3 font-semibold">Original</h2>
              <video
                src={originalUrl}
                controls
                className="w-full rounded-xl border"
              />
            </div>
          )}
          {outputUrl && (
            <div>
              <h2 className="mb-3 font-semibold">Pixora protected</h2>
              <video
                src={outputUrl}
                controls
                className="w-full rounded-xl border"
              />
              <a
                href={outputUrl}
                download
                className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-3 font-semibold text-white"
              >
                Download protected video
              </a>
            </div>
          )}
        </section>
      )}

      {result && (
        <section className="mt-6 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-2xl font-bold">{result.faces_detected}</p>
            <p className="text-sm text-gray-500">Face detections</p>
          </div>
          {result.plate_protection && (
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-2xl font-bold">{result.plates_detected}</p>
              <p className="text-sm text-gray-500">Plate detections</p>
            </div>
          )}
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-2xl font-bold">{result.processed_frames}</p>
            <p className="text-sm text-gray-500">
              of {result.total_frames} frames
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-2xl font-bold">
              {result.processing_seconds}s
            </p>
            <p className="text-sm text-gray-500">Processing time</p>
          </div>
        </section>
      )}
    </main>
  );
}
