'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Wifi,
  Shield,
  Globe,
  HardDrive,
  Lock,
  ArrowRight,
  Smartphone,
  Laptop,
  Monitor,
  HelpCircle,
} from 'lucide-react';
import {
  AgentConnectionSettings,
  type saveAgentConnection,
} from '@/components/AgentConnectionSettings';
import { cn } from '@/lib/utils';

interface NoConnectionViewProps {
  modalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
  onConnectionSaved: (connection: ReturnType<typeof saveAgentConnection>) => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Giant 247 Background Typography
function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-[120px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-[150px]"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.2, 0.4],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Giant 247 Typography */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="relative select-none"
        >
          <motion.span
            className="font-display text-[20vw] font-black leading-none tracking-tighter text-white/[0.03] sm:text-[25vw] lg:text-[30vw]"
            animate={{
              opacity: [0.03, 0.05, 0.03],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            247
          </motion.span>

          {/* Glow layer */}
          <motion.span
            className="font-display absolute inset-0 text-[20vw] font-black leading-none tracking-tighter text-orange-500/[0.02] blur-xl sm:text-[25vw] lg:text-[30vw]"
            animate={{
              opacity: [0.02, 0.04, 0.02],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            247
          </motion.span>
        </motion.div>
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

// Orbital Visualization
function OrbitalVisualization() {
  const rings = [
    { radius: 80, duration: 20, delay: 0 },
    { radius: 110, duration: 30, delay: 0.2 },
    { radius: 140, duration: 25, delay: 0.4 },
  ];

  const devices = [
    { angle: 45, icon: Smartphone, ringIndex: 0 },
    { angle: 165, icon: Laptop, ringIndex: 1 },
    { angle: 285, icon: Monitor, ringIndex: 2 },
  ];

  return (
    <div className="relative mx-auto flex h-[320px] w-[320px] items-center justify-center">
      {/* Background Glows */}
      <div className="absolute inset-0 rounded-full bg-orange-500/5 blur-3xl" />

      {/* Rings */}
      {rings.map((ring, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-white/[0.03] shadow-[inset_0_0_20px_rgba(255,255,255,0.01)]"
          style={{
            width: ring.radius * 2,
            height: ring.radius * 2,
          }}
        />
      ))}

      {/* Rotating Particles on Rings */}
      {rings.map((ring, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute"
          style={{
            width: ring.radius * 2,
            height: ring.radius * 2,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: ring.duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <div className="absolute left-1/2 top-0 -ml-[1px] h-2 w-[2px] bg-gradient-to-b from-orange-400/0 via-orange-400 to-orange-400/0 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
        </motion.div>
      ))}

      {/* Center Hub */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-20 flex h-16 w-16 items-center justify-center rounded-full bg-[#0a0a10] shadow-2xl shadow-black/50 ring-1 ring-white/10"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 to-transparent opacity-50" />
        <HardDrive className="relative h-6 w-6 text-orange-200" />
        {/* Breathing Ring */}
        <motion.div
          className="absolute -inset-2 rounded-full border border-orange-500/20"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.div>

      {/* Connected Devices */}
      {devices.map((device, i) => {
        const ring = rings[device.ringIndex];
        const radius = ring.radius;
        const x = Math.cos((device.angle * Math.PI) / 180) * radius;
        const y = Math.sin((device.angle * Math.PI) / 180) * radius;
        const Icon = device.icon;

        return (
          <React.Fragment key={i}>
            {/* Connection Line (SVG) */}
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
              <motion.line
                x1="160" // Center 320/2
                y1="160"
                x2={160 + x}
                y2={160 + y}
                stroke="url(#gradient-line)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.2 }}
                transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
              />
              <defs>
                <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="1" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Device Node */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 200 }}
              className="absolute z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0a0a10] text-white/60 shadow-lg transition-colors hover:border-orange-500/50 hover:text-orange-400"
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              <Icon className="h-4 w-4" />
            </motion.div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Status Badge Component
function StatusBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 backdrop-blur-sm"
    >
      <motion.div
        className="h-2 w-2 rounded-full bg-orange-400"
        animate={{
          opacity: [1, 0.4, 1],
          scale: [1, 0.9, 1],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className="font-mono text-xs font-medium tracking-wide text-orange-400">
        READY TO CONNECT
      </span>
    </motion.div>
  );
}

// Value proposition cards data
const valueProps = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: "Zero tracking. No analytics. We don't collect any information. Period.",
    gradient: 'from-emerald-500 to-green-600',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Globe,
    title: '24/7 Access',
    description: 'From your phone, tablet, or any browser. Claude Code is always available.',
    gradient: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: HardDrive,
    title: 'Runs Locally',
    description: 'Everything stays on YOUR machine. No cloud servers. Full control.',
    gradient: 'from-orange-500 to-amber-500',
    iconBg: 'bg-orange-500/10 border-orange-500/20',
    iconColor: 'text-orange-400',
  },
];

// Value Proposition Card
function ValueCard({
  icon: Icon,
  title,
  description,
  iconBg,
  iconColor,
  index,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  gradient: string;
  index: number;
}) {
  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className={cn('mb-4 inline-flex rounded-xl border p-3', iconBg)}>
        <Icon className={cn('h-6 w-6', iconColor)} />
      </div>

      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/50">{description}</p>
    </motion.div>
  );
}

// CTA Button
function CTAButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl px-10 py-5 font-semibold transition-all',
        'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
        'shadow-xl shadow-orange-500/25',
        'hover:shadow-2xl hover:shadow-orange-500/30'
      )}
    >
      {/* Animated shine */}
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
        animate={{ translateX: ['-100%', '200%'] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      />

      {/* Glow ring */}
      <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-50 blur-lg transition-opacity group-hover:opacity-75" />

      <Wifi className="h-5 w-5" />
      <span className="text-lg">Connect Your Agent</span>
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
    </motion.button>
  );
}

// Main Component
export function NoConnectionView({
  modalOpen,
  onModalOpenChange,
  onConnectionSaved,
}: NoConnectionViewProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a10] selection:bg-orange-500/20">
      <HeroBackground />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 lg:py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* Status Badge */}
          <motion.div variants={itemVariants}>
            <StatusBadge />
          </motion.div>

          {/* Hero Headline */}
          <motion.div variants={itemVariants} className="mt-8 text-center">
            <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Claude Code.
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                Anywhere. Anytime.
              </span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-2xl text-balance text-center text-lg leading-relaxed text-white/60 sm:text-xl"
          >
            Access your local Claude Code sessions securely from any device,{' '}
            <span className="text-white/80">24 hours a day, 7 days a week</span>.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={itemVariants} className="mt-10 flex flex-col items-center gap-4">
            <CTAButton onClick={() => onModalOpenChange(true)} />

            <button
              onClick={() => window.open('https://tailscale.com', '_blank')}
              className="group flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/40 transition-all hover:bg-white/5 hover:text-white/60"
            >
              <HelpCircle className="h-4 w-4" />
              <span>How does this work?</span>
            </button>
          </motion.div>

          {/* Security Badge */}
          <motion.div
            variants={itemVariants}
            className="mt-8 flex items-center gap-2 text-sm text-white/40"
          >
            <Lock className="h-4 w-4" />
            <span>End-to-end encrypted. Your data never leaves your machine.</span>
          </motion.div>

          {/* Orbital Visualization */}
          <motion.div variants={itemVariants} className="mt-12 lg:mt-16">
            <OrbitalVisualization />
          </motion.div>

          {/* Value Props */}
          <motion.div
            variants={itemVariants}
            className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {valueProps.map((prop, index) => (
              <ValueCard key={prop.title} {...prop} index={index} />
            ))}
          </motion.div>

          {/* Bottom Explanation */}
          <motion.div
            variants={itemVariants}
            className="mt-16 max-w-2xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center backdrop-blur-sm"
          >
            <p className="mb-3 font-mono text-sm text-orange-400/80">Why 24x7?</p>
            <p className="text-balance text-white/60">
              <span className="font-semibold text-white">24</span> hours a day.{' '}
              <span className="font-semibold text-white">7</span> days a week.
              <br />
              <span className="text-white/40">
                Always-on access to Claude Code from anywhere in the world.
              </span>
            </p>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="mt-12 text-center font-mono text-xs text-white/30"
          >
            Built for developers who value privacy and control.
          </motion.p>
        </motion.div>
      </div>

      {/* Connection Settings Modal */}
      <AgentConnectionSettings
        open={modalOpen}
        onOpenChange={onModalOpenChange}
        onSave={onConnectionSaved}
      />
    </main>
  );
}
