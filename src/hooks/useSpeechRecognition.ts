import { useEffect, useRef, useState } from "react";

// Minimal Web Speech API typing
type SR = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor() as SR;
}

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    const r = getRecognition();
    if (!r) {
      setSupported(false);
      return;
    }
    r.lang = navigator.language || "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recRef.current = r;
    return () => {
      try {
        r.abort();
      } catch (_e) {
        /* noop */
      }
    };
  }, []);

  function start() {
    if (!recRef.current) return;
    setTranscript("");
    setListening(true);
    try {
      recRef.current.start();
    } catch (_e) {
      setListening(false);
    }
  }

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  return { supported, listening, transcript, start, stop, setTranscript };
}