'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TooltipRenderProps } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NexoTourTooltip.module.css';

const AUTO_ADVANCE_DELAY = 6;

/**
 * Calcula la posición en la que debe aparecer Nexo según el placement del step.
 *
 *  placement 'left'   → el target está a la DERECHA → Nexo va a la IZQUIERDA
 *  placement 'right'  → el target está a la IZQUIERDA → Nexo va a la DERECHA
 *  cualquier otro     → Nexo va al CENTRO-ABAJO (NUNCA arriba)
 */
function getTooltipPosition(placement: string): 'left' | 'right' | 'bottom-center' {
  if (placement === 'left')  return 'left';
  if (placement === 'right') return 'right';
  return 'bottom-center';
}

/**
 * Aplica la posición directamente al contenedor externo de react-floater
 * (.__floater__open) usando setProperty con 'important' para superar los
 * inline styles que inyecta la librería.
 *
 * Se llama VARIAS VECES con delays crecientes para ganar siempre a los
 * re-posicionamientos tardíos de Joyride/react-floater.
 */
function applyFloaterPosition(pos: 'left' | 'right' | 'bottom-center') {
  // react-floater pone la clase .__floater__open al contenedor visible
  const el = (
    document.querySelector('.__floater__open') ??
    document.querySelector('.__floater') ??
    document.querySelector('.react-joyride__tooltip')
  ) as HTMLElement | null;

  if (!el) return;

  const set = (prop: string, val: string) =>
    el.style.setProperty(prop, val, 'important');

  set('position', 'fixed');
  set('z-index',  '999999');
  set('background', 'transparent');
  set('border',   'none');
  set('box-shadow', 'none');
  set('max-width', 'none');
  set('padding',  '0');
  set(
    'transition',
    'top .45s cubic-bezier(.34,1.56,.64,1), left .45s cubic-bezier(.34,1.56,.64,1), right .45s cubic-bezier(.34,1.56,.64,1), bottom .45s cubic-bezier(.34,1.56,.64,1), transform .45s cubic-bezier(.34,1.56,.64,1)',
  );

  if (pos === 'left') {
    // target a la DERECHA → Nexo a la IZQUIERDA
    set('left',      '1.5vw');
    set('right',     'auto');
    set('top',       '50%');
    set('bottom',    'auto');
    set('transform', 'translateY(-50%)');
  } else if (pos === 'right') {
    // target a la IZQUIERDA → Nexo a la DERECHA
    set('left',      'auto');
    set('right',     '1.5vw');
    set('top',       '50%');
    set('bottom',    'auto');
    set('transform', 'translateY(-50%)');
  } else {
    // centro / top / bottom → Nexo CENTRO-ABAJO
    set('left',      '50%');
    set('right',     'auto');
    set('top',       'auto');
    set('bottom',    '4vh');
    set('transform', 'translateX(-50%)');
  }
}

// ─── Hook typewriter ────────────────────────────────────────────────────────
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

  const rawPlacement = ((step as any).placement as string) ?? 'center';
  const nexoPos      = getTooltipPosition(rawPlacement);
  const isRight      = nexoPos === 'right';

  /**
   * Aplicar posición al floater externo múltiples veces con delays crecientes.
   * Esto garantiza que nuestros estilos siempre ganen a los re-posicionamientos
   * tardíos de react-floater (que ocurren en varios ciclos de render).
   */
  useEffect(() => {
    const timers = [0, 40, 120, 300].map((delay) =>
      setTimeout(() => applyFloaterPosition(nexoPos), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [nexoPos, step]);

  const { displayed, done, skip } = useTypewriter(contentText, 22);

  const nextBtnRef        = useRef<HTMLButtonElement>(null);
  const handleAutoAdvance = useCallback(() => { nextBtnRef.current?.click(); }, []);

  const isLastStep      = index === size - 1;
  const countdownActive = done && !isLastStep;
  const progress        = useCountdown(countdownActive, AUTO_ADVANCE_DELAY, handleAutoAdvance);
  const secondsLeft     = countdownActive
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
