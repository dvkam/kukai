import { Profiler, StrictMode, type ProfilerOnRenderCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AccountPreview } from './AccountPreview';

const recordRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  performance.measure(id, {
    start: startTime,
    end: commitTime,
    detail: { phase, actualDuration, baseDuration }
  });
};

const root = document.getElementById('root');
if (!root) {
  throw new Error('Account preview mount point is missing');
}

const preview = <AccountPreview accountName="Demo account" />;
createRoot(root).render(
  <StrictMode>
    {import.meta.env.MODE === 'profiling' ? (
      <Profiler id="Account preview render" onRender={recordRender}>
        {preview}
      </Profiler>
    ) : (
      preview
    )}
  </StrictMode>
);
