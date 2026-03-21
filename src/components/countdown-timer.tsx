'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Image from 'next/image'

const TARGET_DATE = new Date('2026-08-30T00:00:00-07:00') // Aug 30, 2026 PDT (Black Rock City time)

function getTimeLeft() {
  const now = new Date()
  const diff = TARGET_DATE.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, expired: false }
}

const emptySubscribe = () => () => {}

/* Detailed street-art paste-up style rat with hoodie, sneakers & spray can */
function SprayPaintRat() {
  return (
    <div className="graffiti-rat-wrapper">
      {/* Spray mist particles coming from the can */}
      <div className="spray-mist">
        <div className="mist-particle mist-1" />
        <div className="mist-particle mist-2" />
        <div className="mist-particle mist-3" />
        <div className="mist-particle mist-4" />
        <div className="mist-particle mist-5" />
      </div>
      <svg
        viewBox="0 0 220 380"
        className="graffiti-rat"
        aria-label="Stylized rat with spray paint can"
      >
        <defs>
          {/* Fur texture filter */}
          <filter id="fur-grain" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" />
            <feComposite in="SourceGraphic" in2="noise" operator="in" result="masked" />
            <feBlend in="SourceGraphic" in2="masked" mode="multiply" />
          </filter>
          {/* Subtle shadow filter */}
          <filter id="rat-shadow">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
          </filter>
          {/* Ear inner gradient */}
          <radialGradient id="ear-inner" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#E8A87C" />
            <stop offset="60%" stopColor="#D4845A" />
            <stop offset="100%" stopColor="#B8704A" />
          </radialGradient>
          {/* Body fur gradient */}
          <linearGradient id="fur-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7A7068" />
            <stop offset="50%" stopColor="#8E857B" />
            <stop offset="100%" stopColor="#6B6158" />
          </linearGradient>
          {/* Head fur gradient */}
          <linearGradient id="fur-head" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#5C554E" />
            <stop offset="40%" stopColor="#7A7068" />
            <stop offset="100%" stopColor="#968C82" />
          </linearGradient>
          {/* Snout lighter gradient */}
          <linearGradient id="fur-snout" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B5A899" />
            <stop offset="100%" stopColor="#9A8E80" />
          </linearGradient>
          {/* Hoodie fabric gradient */}
          <linearGradient id="hoodie-fabric" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D3D3D" />
            <stop offset="50%" stopColor="#2E2E2E" />
            <stop offset="100%" stopColor="#252525" />
          </linearGradient>
        </defs>

        <g filter="url(#rat-shadow)">

        {/* ===== TAIL ===== */}
        <path
          d="M 52 330 Q 25 355, 12 335 Q 0 310, 10 290 Q 15 278, 30 282 Q 38 286, 52 318"
          fill="none"
          stroke="#9E8878"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Tail segmentation rings */}
        <path d="M 42 340 Q 38 342, 36 338" fill="none" stroke="#8A7868" strokeWidth="0.8" opacity="0.5" />
        <path d="M 30 342 Q 26 343, 25 339" fill="none" stroke="#8A7868" strokeWidth="0.8" opacity="0.5" />
        <path d="M 18 330 Q 15 332, 14 328" fill="none" stroke="#8A7868" strokeWidth="0.8" opacity="0.5" />
        <path d="M 10 312 Q 8 315, 8 310" fill="none" stroke="#8A7868" strokeWidth="0.8" opacity="0.5" />

        {/* ===== SNEAKERS ===== */}
        {/* Left sneaker */}
        <g>
          <path d="M 55 352 L 55 360 Q 55 368, 48 368 L 32 368 Q 28 368, 28 364 L 28 358 Q 28 352, 36 350 Z" fill="#e8e4e0" stroke="#bbb" strokeWidth="1" />
          {/* Sole */}
          <path d="M 28 364 Q 28 370, 32 370 L 50 370 Q 56 370, 56 364" fill="#333" stroke="#222" strokeWidth="0.8" />
          {/* Toe cap */}
          <path d="M 28 360 Q 28 364, 32 365 L 38 365 Q 34 360, 34 356" fill="#ddd" stroke="#bbb" strokeWidth="0.5" />
          {/* Lace details */}
          <line x1="42" y1="353" x2="48" y2="353" stroke="#999" strokeWidth="0.8" />
          <line x1="42" y1="356" x2="48" y2="356" stroke="#999" strokeWidth="0.8" />
          {/* Stripe */}
          <path d="M 32 358 Q 38 354, 50 356" fill="none" stroke="#b933ad" strokeWidth="1.5" opacity="0.7" />
        </g>
        {/* Right sneaker */}
        <g>
          <path d="M 118 352 L 118 360 Q 118 368, 125 368 L 142 368 Q 146 368, 146 364 L 146 358 Q 146 352, 138 350 Z" fill="#e8e4e0" stroke="#bbb" strokeWidth="1" />
          <path d="M 146 364 Q 146 370, 142 370 L 122 370 Q 116 370, 116 364" fill="#333" stroke="#222" strokeWidth="0.8" />
          <path d="M 146 360 Q 146 364, 142 365 L 136 365 Q 140 360, 140 356" fill="#ddd" stroke="#bbb" strokeWidth="0.5" />
          <line x1="126" y1="353" x2="132" y2="353" stroke="#999" strokeWidth="0.8" />
          <line x1="126" y1="356" x2="132" y2="356" stroke="#999" strokeWidth="0.8" />
          <path d="M 142 358 Q 136 354, 124 356" fill="none" stroke="#b933ad" strokeWidth="1.5" opacity="0.7" />
        </g>

        {/* ===== LEGS (baggy pants / joggers) ===== */}
        <path d="M 60 310 L 55 348 Q 54 352, 58 352 L 50 352" fill="#1a1a1a" stroke="#111" strokeWidth="1" />
        <path d="M 88 310 L 80 348 Q 79 352, 75 352" fill="#1a1a1a" />
        <rect x="50" y="308" width="40" height="48" rx="4" fill="#1a1a1a" />
        {/* Right leg */}
        <path d="M 95 310 L 100 348 Q 101 352, 105 352" fill="#1a1a1a" />
        <path d="M 120 310 L 122 348 Q 123 352, 118 352 L 126 352" fill="#1a1a1a" stroke="#111" strokeWidth="1" />
        <rect x="88" y="308" width="40" height="48" rx="4" fill="#1a1a1a" />
        {/* Pant wrinkles */}
        <path d="M 60 320 Q 65 322, 62 330" fill="none" stroke="#333" strokeWidth="0.8" />
        <path d="M 78 318 Q 75 325, 77 335" fill="none" stroke="#333" strokeWidth="0.8" />
        <path d="M 100 322 Q 105 326, 102 334" fill="none" stroke="#333" strokeWidth="0.8" />
        <path d="M 115 318 Q 118 325, 116 332" fill="none" stroke="#333" strokeWidth="0.8" />
        {/* Three stripe detail on pants */}
        <line x1="50" y1="340" x2="50" y2="352" stroke="#555" strokeWidth="1" opacity="0.4" />
        <line x1="52" y1="340" x2="52" y2="352" stroke="#555" strokeWidth="1" opacity="0.4" />
        <line x1="54" y1="340" x2="54" y2="352" stroke="#555" strokeWidth="1" opacity="0.4" />
        <line x1="124" y1="340" x2="124" y2="352" stroke="#555" strokeWidth="1" opacity="0.4" />
        <line x1="122" y1="340" x2="122" y2="352" stroke="#555" strokeWidth="1" opacity="0.4" />
        <line x1="120" y1="340" x2="120" y2="352" stroke="#555" strokeWidth="1" opacity="0.4" />

        {/* ===== BODY / HOODIE ===== */}
        {/* Main hoodie shape - puffy, oversized */}
        <path
          d="M 40 225 Q 35 215, 48 205 L 60 198 Q 88 190, 116 198 L 128 205 Q 140 215, 136 225 L 140 305 Q 138 315, 90 318 Q 42 315, 38 305 Z"
          fill="url(#hoodie-fabric)"
          stroke="#1a1a1a"
          strokeWidth="1.5"
        />
        {/* Zipper line */}
        <line x1="88" y1="205" x2="88" y2="310" stroke="#555" strokeWidth="1.5" />
        <line x1="88" y1="205" x2="88" y2="310" stroke="#444" strokeWidth="0.5" strokeDasharray="3 3" />
        {/* Zipper pull */}
        <rect x="86" y="204" width="5" height="7" rx="1" fill="#888" stroke="#666" strokeWidth="0.5" />

        {/* Hoodie pocket - kangaroo style */}
        <path
          d="M 55 265 Q 88 278, 120 265 L 122 288 Q 88 300, 54 288 Z"
          fill="#262626"
          stroke="#3a3a3a"
          strokeWidth="0.8"
        />
        {/* Pocket opening slit */}
        <path d="M 68 275 Q 88 280, 108 275" fill="none" stroke="#444" strokeWidth="1" />

        {/* Hoodie wrinkle/fold details */}
        <path d="M 50 230 Q 55 240, 48 255" fill="none" stroke="#444" strokeWidth="1" opacity="0.6" />
        <path d="M 128 230 Q 122 242, 130 258" fill="none" stroke="#444" strokeWidth="1" opacity="0.6" />
        <path d="M 60 245 Q 65 250, 58 262" fill="none" stroke="#3a3a3a" strokeWidth="0.7" />
        <path d="M 118 248 Q 114 255, 120 265" fill="none" stroke="#3a3a3a" strokeWidth="0.7" />
        <path d="M 70 298 Q 88 305, 106 298" fill="none" stroke="#444" strokeWidth="0.6" />

        {/* NYC DELI logo on hoodie chest */}
        <g transform="translate(68, 235)">
          <rect x="-2" y="-12" width="40" height="26" rx="2" fill="#1a1a1a" stroke="#fccc0a" strokeWidth="1" opacity="0.9" />
          <text x="18" y="-1" textAnchor="middle" fill="#fccc0a" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="1">NYC</text>
          <text x="18" y="9" textAnchor="middle" fill="#b933ad" fontSize="6.5" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="0.5">DELI</text>
        </g>

        {/* Hood bunched at neck */}
        <path
          d="M 55 198 Q 50 188, 60 182 Q 88 172, 116 182 Q 126 188, 120 198"
          fill="#3a3a3a"
          stroke="#2a2a2a"
          strokeWidth="1.5"
        />
        {/* Hood fold lines */}
        <path d="M 65 195 Q 88 186, 112 195" fill="none" stroke="#4a4a4a" strokeWidth="0.8" />
        <path d="M 70 192 Q 88 185, 108 192" fill="none" stroke="#454545" strokeWidth="0.6" />

        {/* ===== LEFT ARM + SPRAY CAN ===== */}
        {/* Sleeve */}
        <path
          d="M 42 225 Q 28 218, 18 208 Q 10 200, 5 192"
          fill="none"
          stroke="url(#hoodie-fabric)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M 42 225 Q 28 218, 18 208 Q 10 200, 5 192"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="18.5"
          strokeLinecap="round"
          opacity="0.3"
        />
        {/* Sleeve cuff ribbing */}
        <ellipse cx="8" cy="196" rx="10" ry="5" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.8" />

        {/* Paw holding can */}
        <circle cx="5" cy="188" r="9" fill="#8E857B" />
        {/* Fingers/toes gripping */}
        <circle cx="-2" cy="184" r="3.5" fill="#7A7068" />
        <circle cx="2" cy="181" r="3.5" fill="#7A7068" />
        <circle cx="7" cy="180" r="3.5" fill="#7A7068" />
        <circle cx="12" cy="182" r="3" fill="#7A7068" />
        {/* Claws */}
        <path d="M -4 182 L -6 179" stroke="#555" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M 1 178 L -1 175" stroke="#555" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M 7 177 L 6 174" stroke="#555" strokeWidth="0.8" strokeLinecap="round" />

        {/* Spray can */}
        <g transform="translate(-4, 170) rotate(-25)">
          <rect x="-7" y="-28" width="16" height="36" rx="3" fill="#b933ad" />
          <rect x="-7" y="-28" width="16" height="36" rx="3" fill="url(#hoodie-fabric)" opacity="0.15" />
          {/* Can highlight */}
          <rect x="-5" y="-26" width="4" height="30" rx="2" fill="#fff" opacity="0.08" />
          {/* Cap */}
          <rect x="-4" y="-36" width="10" height="9" rx="2.5" fill="#d4d4d4" />
          <rect x="-4" y="-36" width="10" height="3" rx="1" fill="#eee" />
          {/* Nozzle */}
          <rect x="0" y="-40" width="3" height="5" rx="1" fill="#aaa" />
          {/* Label */}
          <rect x="-5" y="-20" width="12" height="18" rx="1" fill="#fff" opacity="0.2" />
          <text x="1" y="-10" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="bold" fontFamily="Arial Black, sans-serif">RAT</text>
          <text x="1" y="-4" textAnchor="middle" fill="#fccc0a" fontSize="3.5" fontFamily="Arial, sans-serif">NYC</text>
          {/* Can bottom rim */}
          <ellipse cx="1" cy="9" rx="8" ry="2.5" fill="#8A2992" />
        </g>

        {/* Purple spray stream */}
        <g opacity="0.65">
          <circle cx="-12" cy="148" r="3.5" fill="#b933ad" opacity="0.5" />
          <circle cx="-18" cy="140" r="5" fill="#b933ad" opacity="0.3" />
          <circle cx="-8" cy="138" r="2.5" fill="#b933ad" opacity="0.6" />
          <circle cx="-22" cy="134" r="6" fill="#b933ad" opacity="0.15" />
          <circle cx="-15" cy="132" r="3" fill="#d04ec8" opacity="0.2" />
        </g>

        {/* ===== RIGHT ARM ===== */}
        <path
          d="M 136 225 Q 148 240, 145 260 Q 143 272, 140 280"
          fill="none"
          stroke="url(#hoodie-fabric)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 136 225 Q 148 240, 145 260 Q 143 272, 140 280"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="16.5"
          strokeLinecap="round"
          opacity="0.25"
        />
        {/* Cuff */}
        <ellipse cx="140" cy="276" rx="9" ry="4.5" fill="#3a3a3a" stroke="#2a2a2a" strokeWidth="0.8" />
        {/* Paw hanging down */}
        <circle cx="140" cy="284" r="7" fill="#8E857B" />
        <circle cx="135" cy="288" r="2.8" fill="#7A7068" />
        <circle cx="139" cy="290" r="2.8" fill="#7A7068" />
        <circle cx="144" cy="289" r="2.8" fill="#7A7068" />

        {/* ===== NECK ===== */}
        <path d="M 76 188 Q 88 195, 100 188" fill="#7A7068" stroke="none" />
        <rect x="78" y="178" width="20" height="16" rx="8" fill="#7A7068" />

        {/* ===== HEAD ===== */}
        {/* Main head shape - more angular/pointed for realism */}
        <ellipse cx="88" cy="148" rx="32" ry="30" fill="url(#fur-head)" />
        {/* Cheek / jaw area - wider */}
        <ellipse cx="88" cy="158" rx="28" ry="20" fill="#6E665E" opacity="0.5" />

        {/* Fur texture marks on head */}
        <path d="M 62 135 Q 65 140, 62 148" fill="none" stroke="#5A534C" strokeWidth="0.6" opacity="0.5" />
        <path d="M 68 130 Q 70 138, 66 145" fill="none" stroke="#5A534C" strokeWidth="0.6" opacity="0.4" />
        <path d="M 108 132 Q 106 140, 110 148" fill="none" stroke="#5A534C" strokeWidth="0.6" opacity="0.4" />
        <path d="M 100 128 Q 102 136, 98 142" fill="none" stroke="#5A534C" strokeWidth="0.5" opacity="0.3" />

        {/* Snout - elongated, pointed, lighter underside */}
        <path
          d="M 72 158 Q 68 168, 72 176 Q 78 184, 88 186 Q 98 184, 104 176 Q 108 168, 104 158"
          fill="url(#fur-snout)"
        />
        {/* Snout center ridge */}
        <path d="M 88 152 Q 88 168, 88 180" fill="none" stroke="#8A7E70" strokeWidth="0.8" opacity="0.4" />
        {/* Nose - prominent, dark, detailed */}
        <ellipse cx="88" cy="182" rx="7" ry="5.5" fill="#2a2220" />
        <ellipse cx="88" cy="181" rx="6" ry="4" fill="#3a3230" />
        {/* Nose highlight */}
        <ellipse cx="86" cy="180" rx="2" ry="1.2" fill="#4a4240" opacity="0.6" />
        {/* Nostrils */}
        <ellipse cx="85" cy="183" rx="2" ry="1.5" fill="#1a1210" />
        <ellipse cx="91" cy="183" rx="2" ry="1.5" fill="#1a1210" />
        {/* Mouth line */}
        <path d="M 82 186 Q 88 190, 94 186" fill="none" stroke="#5A4A3A" strokeWidth="0.8" />
        {/* Slight tooth showing */}
        <rect x="86" y="186" width="2" height="3" rx="0.5" fill="#e8e0d8" opacity="0.7" />

        {/* ===== EYES - detailed, angry/streetwise ===== */}
        <g>
          {/* Left eye socket shadow */}
          <ellipse cx="76" cy="148" rx="10" ry="8" fill="#4A4440" opacity="0.4" />
          {/* Left eye */}
          <ellipse cx="76" cy="148" rx="8.5" ry="6" fill="#1a1a1a" />
          <ellipse cx="76" cy="147" rx="6" ry="4.5" fill="#DAA520" />
          <ellipse cx="76" cy="147" rx="4" ry="3.5" fill="#B8860B" />
          <circle cx="77" cy="147" r="2.5" fill="#111" />
          {/* Eye highlight */}
          <circle cx="74" cy="145" r="1.2" fill="#fff" opacity="0.8" />
          <circle cx="78" cy="149" r="0.6" fill="#fff" opacity="0.4" />
          {/* Angry brow */}
          <path d="M 66 139 Q 72 136, 84 140" fill="none" stroke="#4A4340" strokeWidth="2.5" strokeLinecap="round" />

          {/* Right eye socket shadow */}
          <ellipse cx="100" cy="148" rx="10" ry="8" fill="#4A4440" opacity="0.4" />
          {/* Right eye */}
          <ellipse cx="100" cy="148" rx="8.5" ry="6" fill="#1a1a1a" />
          <ellipse cx="100" cy="147" rx="6" ry="4.5" fill="#DAA520" />
          <ellipse cx="100" cy="147" rx="4" ry="3.5" fill="#B8860B" />
          <circle cx="99" cy="147" r="2.5" fill="#111" />
          {/* Eye highlight */}
          <circle cx="98" cy="145" r="1.2" fill="#fff" opacity="0.8" />
          <circle cx="101" cy="149" r="0.6" fill="#fff" opacity="0.4" />
          {/* Angry brow */}
          <path d="M 110 140 Q 104 136, 92 140" fill="none" stroke="#4A4340" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* ===== EARS - large, detailed with warm inner color ===== */}
        {/* Left ear */}
        <ellipse cx="60" cy="122" rx="16" ry="20" fill="#6E665E" stroke="#5A534C" strokeWidth="1" />
        <ellipse cx="60" cy="122" rx="11" ry="14" fill="url(#ear-inner)" />
        {/* Ear rim highlight */}
        <path d="M 48 110 Q 46 122, 50 136" fill="none" stroke="#8A8278" strokeWidth="1" opacity="0.5" />
        {/* Inner ear detail lines */}
        <path d="M 55 114 Q 58 122, 56 130" fill="none" stroke="#C4885A" strokeWidth="0.6" opacity="0.4" />
        <path d="M 60 112 Q 62 120, 60 128" fill="none" stroke="#C4885A" strokeWidth="0.5" opacity="0.3" />

        {/* Right ear */}
        <ellipse cx="116" cy="122" rx="16" ry="20" fill="#6E665E" stroke="#5A534C" strokeWidth="1" />
        <ellipse cx="116" cy="122" rx="11" ry="14" fill="url(#ear-inner)" />
        <path d="M 128 110 Q 130 122, 126 136" fill="none" stroke="#8A8278" strokeWidth="1" opacity="0.5" />
        <path d="M 121 114 Q 118 122, 120 130" fill="none" stroke="#C4885A" strokeWidth="0.6" opacity="0.4" />
        <path d="M 116 112 Q 114 120, 116 128" fill="none" stroke="#C4885A" strokeWidth="0.5" opacity="0.3" />

        {/* ===== WHISKERS - longer, more realistic ===== */}
        <g stroke="#B8B0A8" strokeLinecap="round">
          <line x1="68" y1="172" x2="38" y2="164" strokeWidth="0.8" />
          <line x1="68" y1="176" x2="35" y2="176" strokeWidth="0.9" />
          <line x1="68" y1="180" x2="38" y2="188" strokeWidth="0.8" />
          <line x1="70" y1="168" x2="44" y2="158" strokeWidth="0.6" opacity="0.5" />
          <line x1="108" y1="172" x2="138" y2="164" strokeWidth="0.8" />
          <line x1="108" y1="176" x2="142" y2="176" strokeWidth="0.9" />
          <line x1="108" y1="180" x2="138" y2="188" strokeWidth="0.8" />
          <line x1="106" y1="168" x2="132" y2="158" strokeWidth="0.6" opacity="0.5" />
        </g>

        {/* ===== HEAD FUR TUFTS ===== */}
        <path d="M 72 120 Q 75 112, 78 118" fill="#5C554E" stroke="none" />
        <path d="M 80 118 Q 82 108, 86 116" fill="#5C554E" stroke="none" />
        <path d="M 90 116 Q 92 106, 96 114" fill="#5C554E" stroke="none" />
        <path d="M 98 118 Q 100 110, 104 118" fill="#5C554E" stroke="none" />

        </g>
      </svg>
    </div>
  )
}

function CountdownDisplay({ values, placeholder }: {
  values?: { days: number; hours: number; minutes: number; seconds: number };
  placeholder?: boolean;
}) {
  const items = values
    ? [
        { value: values.days, label: 'DAYS' },
        { value: values.hours, label: 'HRS' },
        { value: values.minutes, label: 'MIN' },
        { value: values.seconds, label: 'SEC' },
      ]
    : [
        { value: '--', label: 'DAYS' },
        { value: '--', label: 'HRS' },
        { value: '--', label: 'MIN' },
        { value: '--', label: 'SEC' },
      ]

  return (
    <section className="countdown-brick-wall relative overflow-hidden border-b-4 border-black">
      {/* Black background with spray paint texture */}
      <div className="absolute inset-0 bg-black">
        {/* Subtle concrete/asphalt texture via CSS noise */}
        <div className="absolute inset-0 nyc-grime" />
        {/* Spray paint ambient glow patches */}
        <div className="absolute inset-0" style={{
          background: [
            'radial-gradient(ellipse 400px 250px at 8% 40%, rgba(185,51,173,0.08) 0%, transparent 70%)',
            'radial-gradient(ellipse 300px 200px at 90% 60%, rgba(185,51,173,0.06) 0%, transparent 70%)',
            'radial-gradient(ellipse 250px 180px at 50% 15%, rgba(252,204,10,0.04) 0%, transparent 70%)',
            'radial-gradient(ellipse 350px 200px at 70% 80%, rgba(57,255,20,0.03) 0%, transparent 70%)',
            'radial-gradient(ellipse 200px 300px at 20% 85%, rgba(255,99,25,0.04) 0%, transparent 70%)',
          ].join(', ')
        }} />
      </div>

      <div className="relative z-10 py-4 md:py-5 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Single-line: title + countdown + rat */}
          <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap md:flex-nowrap">
            {/* Graffiti title */}
            <h2 className="graffiti-title shrink-0">
              <span className="graffiti-text-compact">
                💣 SELF-DESTRUCT IN:
              </span>
            </h2>

            {/* Countdown numbers */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
              {items.map(({ value, label }, i) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="graffiti-number-block-compact">
                    <span className="graffiti-number-compact">
                      {typeof value === 'number' ? String(value).padStart(2, '0') : value}
                    </span>
                  </div>
                  <span className="graffiti-label-compact">{label}</span>
                </div>
              ))}
            </div>

            {/* Rat next to countdown */}
            <div className="hidden sm:block relative shrink-0">
              <SprayPaintRat />
            </div>
          </div>

          {/* Spray paint splatter accents */}
          <div className="spray-splatters" aria-hidden="true">
            <div className="splatter splatter-1" />
            <div className="splatter splatter-2" />
            <div className="splatter splatter-3" />
            <div className="splatter splatter-4" />
            <div className="splatter splatter-5" />
            <div className="splatter splatter-6" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) {
    return <CountdownDisplay placeholder />
  }

  if (timeLeft.expired) {
    return (
      <section className="countdown-brick-wall relative overflow-hidden border-b-4 border-black">
        <div className="absolute inset-0 bg-black">
          <div className="absolute inset-0 nyc-grime" />
        </div>
        <div className="relative z-10 py-4 md:py-5 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="graffiti-text-main text-2xl md:text-4xl animate-pulse">
              💥 BOOM. SEE YOU ON THE PLAYA. 💥
            </h2>
          </div>
        </div>
      </section>
    )
  }

  return <CountdownDisplay values={timeLeft} />
}
