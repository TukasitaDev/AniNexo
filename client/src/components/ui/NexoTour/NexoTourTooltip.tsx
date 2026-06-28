'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TooltipRenderProps } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NexoTourTooltip.module.css';

const AUTO_ADVANCE_DELAY = 6;

// ─── Posición según placement ────────────────────────────────────────────────
function getPosition(placement: string): 'left' | 'right' | 'bottom-center' {
  if (placement === 'left')  return 'left';   // target a la DERECHA → Nexo izquierda
  if (placement === 'right') return 'right';  // target a la IZQUIERDA → Nexo derecha
  return 'bottom-center';                      // resto → centro abajo, NUNCA arriba
}

function positionStyle(pos: 'left' | 'right' | 'bottom-center'): React.CSSProperties {
  const base: React.CSSProperties = { position: 'fixed', zIndex: 999999 };
  if (pos === 'left')  return { ...base, left: '1.5vw',  top: '50%', transform: 'translateY(-50%)' };
  if (pos === 'right') return { ...base, right: '1.5vw', top: '50%', transform: 'translateY(-50%)' };
  return { ...base, left: '50%', bottom: '4vh', transform: 'translateX(-50%)' };
}

// ─── Hook typewriter ─────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 22) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone]           = useState(false);
  const idRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const safeText = typeof text === 'string' ? text : '';

  useEffect(() => {
    if (idRef.current) clearInterval(idRef.current);
    setDisplayed('');
    setDone(false);
    let i = 0;
    idRef.current = setInterval(() => {
      i += 1;
      setDisplayed(safeText.slice(0, i));
      if (i >= safeText.length) { clearInterval(idRef.current!); setDone(true); }
    }, speed);
    return () => { if (idRef.current) clearInterval(idRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeText]);

  const skip = () => {
    if (idRef.current) clearInterval(idRef.current);
    setDisplayed(safeText);
    setDone(true);
  };
  return { displayed, done, skip };
}

// ─── Hook countdown ──────────────────────────────────────────────────────────
function useCountdown(active: boolean, seconds: number, onExpire: () => void) {
  const [progress, setProgress] = useState(0);
  const startRef  = useRef<number | null>(null);
  const rafRef    = useRef<number | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setProgress(0); startRef.current = null; calledRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    calledRef.current = false;
    startRef.current  = performance.now();
    const tick = (now: number) => {
      if (!startRef.current) return;
      const p = Math.min((now - startRef.current) / 1000 / seconds, 1);
      setProgress(p);
      if (p >= 1) { if (!calledRef.current) { calledRef.current = true; onExpire(); } return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return progress;
}

// ─── Tooltip component ───────────────────────────────────────────────────────
export const NexoTourTooltip: React.FC<TooltipRenderProps> = ({
  continuous, index, size, step,
  backProps, closeProps, primaryProps, skipProps,
  tooltipProps,   // ← necesario para aria + ref interno de Joyride
}) => {
  // Solo montamos el portal en el cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const emotion: string = (step as any).emotion ?? 'happy';
  const contentText: string =
    typeof step.content === 'string' ? step.content
    : React.isValidElement(step.content) ? ''
    : String(step.content ?? '');

  const rawPlacement = ((step as any).placement as string) ?? 'center';
  const pos      = getPosition(rawPlacement);
  const isRight  = pos === 'right';
  const wrapStyle = positionStyle(pos);

  const { displayed, done, skip } = useTypewriter(contentText, 22);

  const nextBtnRef        = useRef<HTMLButtonElement>(null);
  const handleAutoAdvance = useCallback(() => { nextBtnRef.current?.click(); }, []);

  const isLastStep      = index === size - 1;
  const countdownActive = done && !isLastStep;
  const progress        = useCountdown(countdownActive, AUTO_ADVANCE_DELAY, handleAutoAdvance);
  const secondsLeft     = countdownActive
    ? Math.ceil(AUTO_ADVANCE_DELAY * (1 - progress))
    : AUTO_ADVANCE_DELAY;

  // ── Diálogo que se inyectará como portal ──────────────────────────────────
  const dialog = (
    <div
      style={{
        ...wrapStyle,
        display: 'flex',
        flexDirection: isRight ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 16,
        maxWidth: 580,
        pointerEvents: 'auto',
      }}
    >
      {/* Avatar de Nexo */}
      <motion.img
        key={emotion}
        src={`/nexo-tour/${emotion}.png`}
        alt={`Nexo (${emotion})`}
        className={styles.avatar}
        initial={{ opacity: 0, scale: 0.85, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        draggable={false}
      />

      {/* Globo de diálogo */}
      <motion.div
        className={`${styles.dialogBox} ${isRight ? styles.dialogBoxRight : ''}`}
        onClick={!done ? skip : undefined}
        style={{ cursor: done ? 'default' : 'pointer' }}
        initial={{ opacity: 0, x: isRight ? -24 : 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28 }}
      >
        <div className={styles.speakerName}>NEXO · IA</div>

        {step.title && (
          <h3 className={styles.stepTitle}>{step.title as React.ReactNode}</h3>
        )}

        <div className={styles.content}>
          {displayed}
          {!done && <span className={styles.typewriterCursor} />}
        </div>

        {!done && (
          <div className={styles.clickHint}>Haz clic para saltar el texto →</div>
        )}

        {/* Barra de cuenta regresiva */}
        <AnimatePresence>
          {done && !isLastStep && (
            <motion.div
              className={styles.autoAdvanceBar}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.autoAdvanceLabel}>Continúa solo en {secondsLeft}s</div>
              <div className={styles.autoAdvanceTrack}>
                <motion.div
                  className={styles.autoAdvanceFill}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.footer}>
          <button {...skipProps} className={styles.skipButton}>Saltar guía</button>
          <span className={styles.stepCounter}>{index + 1} / {size}</span>
          <div className={styles.controls}>
            {index > 0 && (
              <button {...backProps} className={styles.backButton}>← Atrás</button>
            )}
            {continuous ? (
              <button {...primaryProps} ref={nextBtnRef} className={styles.nextButton}>
                {isLastStep ? '🎉 Finalizar' : 'Siguiente →'}
              </button>
            ) : (
              <button {...closeProps} className={styles.nextButton}>Cerrar</button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <>
      {/*
       * Div mínimo con tooltipProps: Joyride necesita su ref para tracking
       * interno (foco, aria). Lo ocultamos visualmente pero está en el DOM.
       */}
      <div
        {...tooltipProps}
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0,
        }}
      />

      {/*
       * El diálogo real se renderiza como PORTAL directo a document.body.
       * De esta forma nunca tiene ancestros con transform y position:fixed
       * funciona exactamente como esperamos (relativo al viewport).
       */}
      {mounted && createPortal(dialog, document.body)}
    </>
  );
};
