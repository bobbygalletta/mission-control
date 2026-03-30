import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, width: '100vw', height: '100vh' }}>
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, var(--bg-top, #0a1a1f) 0%, var(--bg-bottom, #1a0a2e) 100%)',
        }}
      />

      {/* Orb 1 */}
      <div
        className="absolute rounded-full"
        style={{
          width: '70vw', height: '70vw', maxWidth: '900px', maxHeight: '900px',
          top: '-30%', left: '-20%',
          background: 'radial-gradient(circle, var(--orb-1, rgba(88,28,135,0.55)) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Orb 2 */}
      <div
        className="absolute rounded-full"
        style={{
          width: '60vw', height: '60vw', maxWidth: '700px', maxHeight: '700px',
          top: '10%', right: '-15%',
          background: 'radial-gradient(circle, var(--orb-2, rgba(30,30,100,0.6)) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Orb 3 */}
      <div
        className="absolute rounded-full"
        style={{
          width: '55vw', height: '55vw', maxWidth: '650px', maxHeight: '650px',
          bottom: '-20%', left: '20%',
          background: 'radial-gradient(circle, var(--orb-3, rgba(10,60,60,0.55)) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Orb 4 */}
      <div
        className="absolute rounded-full"
        style={{
          width: '40vw', height: '40vw', maxWidth: '500px', maxHeight: '500px',
          top: '-10%', right: '10%',
          background: 'radial-gradient(circle, var(--orb-4, rgba(109,40,217,0.45)) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Orb 5 */}
      <div
        className="absolute rounded-full"
        style={{
          width: '35vw', height: '35vw', maxWidth: '450px', maxHeight: '450px',
          bottom: '5%', right: '-5%',
          background: 'radial-gradient(circle, var(--orb-5, rgba(88,28,135,0.4)) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Orb 6 */}
      <div
        className="absolute rounded-full"
        style={{
          width: '30vw', height: '30vw', maxWidth: '380px', maxHeight: '380px',
          top: '35%', left: '5%',
          background: 'radial-gradient(circle, var(--orb-6, rgba(55,65,160,0.5)) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(8,8,14,0.6) 100%)',
        }}
      />
    </div>
  );
};
