'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TooltipRenderProps } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NexoTourTooltip.module.css';

/** Segundos de espera tras terminar de escribir antes de avanzar automáticamente */
const AUTO_ADVANCE_DELAY = 6;

/**
 * Calcula la posición en la que debe aparecer Nexo según el placement del step.
 *
 *  placement 'left'   → el target está a la DERECHA → Nexo va a la IZQUIERDA
 *  placement 'right'  → el target está a la IZQUIERDA → Nexo va a la DERECHA
 *  cualquier otro     → Nexo va al CENTRO-ABAJO (nunca arriba)
 */
function getTooltipPosition(placement: string): 'left' | 'right' | 'bottom-center' {
  if (placement === 'left')  return 'left';
  if (placement === 'right') return 'right';
  return 'bottom-center';
}

/**
 * Aplica directamente los estilos al wrapper .react-joyride__tooltip que
 * Joyride inserta por encima de nuestro componente.
 */
function applyWrapperPosition(pos: 'left' | 'right' | 'bottom-center') {
  const el = document.querySelector('.react-joyride__tooltip') as HTMLElement | null;
  if (!el) return;

  el.style.position  = 'fixed';
  el.style.zIndex    = '999999';
  el.style.background = 'transparent';
  el.style.border    = 'none';
  el.style.boxShadow = 'none';
  el.style.maxWidth  = 'none';
  el.style.padding   = '0';
  // Suave transición al moverse entre pasos
  el.style.transition = 'top 0.45s cubic-bezier(.34,1.56,.64,1), left 0.45s cubic-bezier(.34,1.56,.64,1), right 0.45s cubic-bezier(.34,1.56,.64,1), bottom 0.45s cubic-bezier(.34,1.56,.64,1), transform 0.45s cubic-bezier(.34,1.56,.64,1)';

  if (pos === 'left') {
    // Nexo en el LADO IZQUIERDO de la pantalla
    el.style.left      = '1.5vw';
    el.style.right     = 'auto';
    el.style.top       = '50%';
    el.style.bottom    = 'auto';
    el.style.transform = 'translateY(-50%)';
  } else if (pos === 'right') {
    // Nexo en el LADO DERECHO de la pantalla
    el.style.left      = 'auto';
    el.style.right     = '1.5vw';
    el.style.top       = '50%';
    el.style.bottom    = 'auto';
    el.style.transform = 'translateY(-50%)';
  } else {
    // Nexo CENTRO-ABAJO (nunca arriba)
    el.style.left      = '50%';
    el.style.right     = 'auto';
    el.style.top       = 'auto';
    el.style.bottom    = '4vh';
    el.style.transform = 'translateX(-50%)';
  }
}

// ─── Hook typewriter ────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 22) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone]           = useState(false);
  const idRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const safeText = typeof text === 'string' ? text : '';

  useEffect(() => {
    if (idRef.current) clearInterval(idRef.current);
    setDisplayed('');
    setDone(false);

    let i = 0;
    idRef.current = setInterval(() => {
      i += 1;
      setDisplayed(safeText.slice(0, i));
      if (i >= safeText.length) {
        clearInterval(idRef.current!);
        setDone(true);
      }
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

// ─── Hook countdown ─────────────────────────────────────────────────────────
function useCountdown(active: boolean, seconds: number, onExpire: () => void) {
  const [progress, setProgress] = useState(0);
  const startRef  = useRef<number | null>(null);
  const rafRef    = useRef<number | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      startRef.current  = null;
      calledRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    calledRef.current = false;
    startRef.current  = performance.now();

    const tick = (now: number) => {
      if (!startRef.current) return;
      const elapsed = (now - startRef.current) / 1000;
      const p = Math.min(elapsed / seconds, 1);
      setProgress(p);
      if (p >= 1) {
        if (!calledRef.current) { calledRef.current = true; onExpire(); }
        return;
      }
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
  continuous,
  index,
  size,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}) => {
  const emotion: string = (step as any).emotion ?? 'happy';
  const contentText: string =
    typeof step.content === 'string'
      ? step.content
      : React.isValidElement(step.content)
      ? ''
      : String(step.content ?? '');

  // Placement del step actual
  const rawPlacement = (step as any).placement as string ?? 'center';
  const nexoPos      = getTooltipPosition(rawPlacement);
  const isRight      = nexoPos === 'right'; // layout invertido

  // Posicionar el wrapper de Joyride cada vez que cambia el step
  useEffect(() => {
    // Pequeño delay para que el DOM de Joyride esté listo
    const t = setTimeout(() => applyWrapperPosition(nexoPos), 30);
    return () => clearTimeout(t);
  }, [nexoPos, step]);

  const { displayed, done, skip } = useTypewriter(contentText, 22);

  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const handleAutoAdvance = useCallback(() => { nextBtnRef.current?.click(); }, []);

  const isLastStep       = index === size - 1;
  const countdownActive  = done && !isLastStep;
  const progress         = useCountdown(countdownActive, AUTO_ADVANCE_DELAY, handleAutoAdvance);
  const secondsLeft      = countdownActive
    ? Math.ceil(AUTO_ADVANCE_DELAY * (1 - progress))
    : AUTO_ADVANCE_DELAY;

  return (
    <div
      {...tooltipProps}
      className={`${styles.tooltipContainer} ${isRight ? styles.tooltipContainerRight : ''}`}
    >
      {/* ---- Avatar de Nexo ---- */}
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

      {/* ---- Globo de diálogo ---- */}
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
          <h3 className={styles.stepTitle}>
            {step.title as React.ReactNode}
          </h3>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.autoAdvanceLabel}>
                Continúa solo en {secondsLeft}s
              </div>
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
          <button {...skipProps} className={styles.skipButton}>
            Saltar guía
          </button>

          <span className={styles.stepCounter}>
            {index + 1} / {size}
          </span>

          <div className={styles.controls}>
            {index > 0 && (
              <button {...backProps} className={styles.backButton}>
                ← Atrás
              </button>
            )}

            {continuous ? (
              <button
                {...primaryProps}
                ref={nextBtnRef}
                className={styles.nextButton}
              >
                {isLastStep ? '🎉 Finalizar' : 'Siguiente →'}
              </button>
            ) : (
              <button {...closeProps} className={styles.nextButton}>
                Cerrar
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
