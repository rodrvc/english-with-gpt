import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Correction } from '@english-practice/shared';
import { buildSegments } from './segments';

interface Props {
  text: string;
  onChange: (text: string) => void;
  corrections: Correction[];
  showMarks: boolean;
  activeId: string | null;
  onActivate: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Editor de texto plano: un textarea transparente sobre una capa de resaltado.
 * El estado es un string; las marcas se derivan de los rangos del servidor.
 * La corrección NUNCA se aplica al texto desde aquí.
 */
export function HighlightEditor({ text, onChange, corrections, showMarks, activeId, onActivate, disabled, placeholder }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const segments = useMemo(() => buildSegments(text, showMarks ? corrections : []), [text, corrections, showMarks]);

  const syncScroll = useCallback(() => {
    if (layerRef.current && inputRef.current) {
      layerRef.current.scrollTop = inputRef.current.scrollTop;
      layerRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }, []);

  // Altura del textarea = contenido (sin scroll interno) para que ambas capas midan igual.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 400)}px`;
  }, [text]);

  // Al colocar el cursor sobre un tramo marcado, se activa su corrección (resaltado recíproco).
  const handleSelect = useCallback(() => {
    const el = inputRef.current;
    if (!el || !showMarks) return;
    const pos = el.selectionStart;
    if (el.selectionEnd !== pos) return;
    const hit = corrections.find((c) => pos >= c.start && pos <= c.end);
    onActivate(hit ? hit.id : null);
  }, [corrections, onActivate, showMarks]);

  useEffect(() => {
    if (!activeId || !inputRef.current) return;
    const mark = layerRef.current?.querySelector<HTMLElement>(`[data-correction-id="${activeId}"]`);
    mark?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  return (
    <div className="editor-stack">
      <div className="editor-layer editor-text" ref={layerRef} aria-hidden="true">
        {segments.map((s, i) =>
          s.correction ? (
            <span
              key={i}
              data-correction-id={s.correction.id}
              className={`mark ${s.correction.severity === 'style' ? 'style' : ''} ${activeId === s.correction.id ? 'active' : ''}`}
            >
              {s.text}
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
        {/* Salto final para que la capa mida igual que el textarea cuando el texto termina en \n */}
        {'\n'}
      </div>
      <textarea
        ref={inputRef}
        className="editor-input editor-text"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onClick={handleSelect}
        onKeyUp={handleSelect}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="Tu texto"
      />
    </div>
  );
}
