import { useEffect, useRef } from "react";
import type { PlayEditorSurfaceProps } from "./model";
import { PlayEditorEngine } from "./engine/PlayEditorEngine";

export function PlayEditorSurface(props: PlayEditorSurfaceProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PlayEditorEngine | null>(null);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    engineRef.current = new PlayEditorEngine(hostRef.current, props);
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.update(props);
  }, [props]);

  return <div ref={hostRef} className="play-editor-surface" />;
}
