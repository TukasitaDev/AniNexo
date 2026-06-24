'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TooltipRenderProps } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NexoTourTooltip.module.css';

/** Segundos de espera tras terminar de escribir antes de avanzar automáticamente */
const AUTO_ADVANCE_DELAY = 6; // segundos

/**
 * Hook typewriter — sin bug de "undefined".
 * Usa slice en lugar de acceso por índice para evitar caracteres fantasma.
 */
function useTypewriter(text: string, speed = 22) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safeText = typeof text === 'string' ? text : '';

  useEffect(() => {
    // Cancelar intervalo anterior
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

    return () => {
      if (idRef.current) clearInterval(idRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeText]);

  const skip = () => {
    if (idRef.current) clearInterval(idRef.current);
    setDisplayed(safeText);
    setDone(true);
  };

  return { displayed, done, skip };
}

/**
 * Hook de cuenta regresiva para auto-avance.
 * Devuelve el progreso (0→1) y si ya expiró.
 */
function useCountdown(active: boolean, seconds: number, onExpire: () => void) {
  const [progress, setProgress] = useState(0); // 0 = inicio, 1 = expirado
  const startRef = useRef<number | null>(null);
  const rafRef   = useRef<number | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!active) {
      // Resetear cuando no está activo
      setProgress(0);
      startRef.current = null;
      calledRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    calledRef.current = false;
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (!startRef.current) return;
      const elapsed = (now - startRef.current) / 1000;
      const p = Math.min(elapsed / seconds, 1);
      setProgress(p);

      if (p >= 1) {
        if (!calledRef.current) {
          calledRef.current = true;
          onExpire();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return progress;
}

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
  // Propiedades extra que guardamos en el step (cast seguro)
  const emotion: string = (step as any).emotion ?? 'happy';
  // Extraer el contenido como string de forma segura
  const contentText: string =
    typeof step.content === 'string'
      ? step.content
      : React.isValidElement(step.content)
      ? ''
      : String(step.content ?? '');

  const { displayed, done, skip } = useTypewriter(contentText, 22);

  // Ref al botón de siguiente para poder dispararlo programáticamente
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const handleAutoAdvance = useCallback(() => {
    nextBtnRef.current?.click();
  }, []);

  // La cuenta regresiva solo corre cuando el texto ya terminó de escribirse
  const isLastStep = index === size - 1;
  // No auto-avanzar en el último paso (el usuario debe decidir finalizar)
  const countdownActive = done && !isLastStep;
  const progress = useCountdown(countdownActive, AUTO_ADVANCE_DELAY, handleAutoAdvance);

  // Segundos restantes visibles
  const secondsLeft = countdownActive
    ? Math.ceil(AUTO_ADVANCE_DELAY * (1 - progress))
    : AUTO_ADVANCE_DELAY;

  return (
    <div {...tooltipProps} className={styles.tooltipContainer}>
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
        className={styles.dialogBox}
        onClick={!done ? skip : undefined}
        style={{ cursor: done ? 'default' : 'pointer' }}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28 }}
      >
        {/* Nombre del hablante */}
        <div className={styles.speakerName}>NEXO · IA</div>

        {/* Título del paso */}
        {step.title && (
          <h3 className={styles.stepTitle}>
            {step.title as React.ReactNode}
          </h3>
        )}

        {/* Texto animado */}
        <div className={styles.content}>
          {displayed}
          {!done && <span className={styles.typewriterCursor} />}
        </div>

        {/* Hint click-to-skip mientras escribe */}
        {!done && (
          <div className={styles.clickHint}>Haz clic para saltar el texto →</div>
        )}

        {/* Barra de cuenta regresiva (solo cuando done y no es el último paso) */}
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

        {/* Footer */}
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
