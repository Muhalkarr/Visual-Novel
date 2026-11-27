import React, { useState } from 'react';
import { RomanceCharacterId, ShaderMode } from '../types/studioGameSchema';
import {
  EmotionAlias,
  normalizeEmotionKey,
  resolvePortraitAssetUrl,
} from '../engine/VisualNovelPortraitManager';
import { TimeSlotKey } from '../engine/VisualNovelRelationshipEngine';

interface PixelCharacterSpriteProps {
  characterId: RomanceCharacterId;
  expression?: EmotionAlias;
  className?: string;
}

export const PixelCharacterSprite: React.FC<PixelCharacterSpriteProps> = ({
  characterId,
  expression = 'neutral',
  className = '',
}) => {
  const emotion = normalizeEmotionKey(expression);
  const isSmiling = emotion === 'happy';
  const isSad = emotion === 'sad';
  const isSurprised = emotion === 'surprised';
  const isAlert = emotion === 'angry';

  const renderCharacter = () => {
    switch (characterId) {
      case 'yuna_pixel':
        // Crimson hair + white criss-cross ribbon + golden-amber eyes
        return (
          <g shapeRendering="crispEdges">
            {/* Back Hair */}
            <rect x="14" y="8" width="36" height="44" fill="#991b1b" />
            <rect x="12" y="16" width="40" height="40" fill="#b91c1c" />
            <rect x="10" y="28" width="44" height="34" fill="#dc2626" />
            <rect x="16" y="6" width="32" height="10" fill="#dc2626" />
            {/* Shoulders & Dark Top */}
            <rect x="16" y="48" width="32" height="16" fill="#272030" />
            <rect x="20" y="48" width="24" height="16" fill="#3b2f45" />
            <rect x="25" y="48" width="14" height="7" fill="#fde2d2" />
            {/* Neck */}
            <rect x="28" y="42" width="8" height="8" fill="#f6cbb7" />
            {/* Face */}
            <rect x="20" y="20" width="24" height="23" fill="#fde2d2" />
            <rect x="22" y="41" width="20" height="3" fill="#f6cbb7" />
            {/* Blush */}
            {isSmiling && (
              <>
                <rect x="21" y="34" width="4" height="2" fill="#fda4af" />
                <rect x="39" y="34" width="4" height="2" fill="#fda4af" />
              </>
            )}
            {/* Golden Eyes */}
            <rect x="23" y={isSurprised ? '27' : '28'} width="6" height={isSurprised ? '7' : '6'} fill="#ffffff" />
            <rect x="35" y={isSurprised ? '27' : '28'} width="6" height={isSurprised ? '7' : '6'} fill="#ffffff" />
            <rect x="24" y="29" width="4" height="5" fill="#ca8a04" />
            <rect x="36" y="29" width="4" height="5" fill="#ca8a04" />
            <rect x="25" y="30" width="2" height="2" fill="#451a03" />
            <rect x="37" y="30" width="2" height="2" fill="#451a03" />
            <rect x="24" y="29" width="1" height="1" fill="#ffffff" />
            <rect x="36" y="29" width="1" height="1" fill="#ffffff" />
            {isSad && (
              <>
                <rect x="23" y="33" width="2" height="2" fill="#7dd3fc" />
                <rect x="39" y="33" width="2" height="2" fill="#7dd3fc" />
              </>
            )}
            {/* Brows */}
            <rect x="23" y={isSurprised ? '24' : isAlert ? '25' : '27'} width="6" height="1" fill="#7f1d1d" />
            <rect x="35" y={isSurprised ? '24' : isAlert ? '25' : '27'} width="6" height="1" fill="#7f1d1d" />
            {/* Mouth */}
            {isSmiling ? (
              <>
                <rect x="29" y="38" width="6" height="2" fill="#e11d48" />
                <rect x="30" y="39" width="4" height="1" fill="#fecdd3" />
              </>
            ) : isSurprised ? (
              <>
                <rect x="30" y="37" width="4" height="4" fill="#be123c" />
                <rect x="31" y="38" width="2" height="2" fill="#fda4af" />
              </>
            ) : isSad ? (
              <rect x="29" y="39" width="6" height="1" fill="#9f1239" />
            ) : (
              <rect x="30" y="38" width="4" height="1" fill="#b45349" />
            )}
            {/* Bangs */}
            <rect x="18" y="14" width="28" height="10" fill="#dc2626" />
            <rect x="20" y="22" width="4" height="6" fill="#dc2626" />
            <rect x="27" y="22" width="4" height="5" fill="#b91c1c" />
            <rect x="34" y="22" width="4" height="5" fill="#dc2626" />
            <rect x="40" y="21" width="5" height="7" fill="#b91c1c" />
            {/* Signature White Criss-Cross Ribbon */}
            <rect x="25" y="13" width="4" height="2" fill="#ffffff" />
            <rect x="29" y="15" width="4" height="2" fill="#ffffff" />
            <rect x="33" y="13" width="4" height="2" fill="#ffffff" />
            <rect x="29" y="13" width="4" height="2" fill="#e2e8f0" />
            <rect x="26" y="16" width="3" height="2" fill="#ffffff" />
            <rect x="33" y="16" width="3" height="2" fill="#ffffff" />
            {/* Side Locks */}
            <rect x="15" y="20" width="5" height="32" fill="#dc2626" />
            <rect x="44" y="20" width="5" height="32" fill="#b91c1c" />
          </g>
        );

      case 'kaede_lit':
        // Chestnut brown wavy hair + signature gold hoop earring + sky blue eyes
        return (
          <g shapeRendering="crispEdges">
            {/* Back Hair */}
            <rect x="14" y="8" width="36" height="38" fill="#6b3c1c" />
            <rect x="12" y="16" width="38" height="30" fill="#854d27" />
            <rect x="16" y="6" width="30" height="10" fill="#9a5b2f" />
            {/* Teal Collar Shirt */}
            <rect x="16" y="48" width="32" height="16" fill="#0f766e" />
            <rect x="22" y="48" width="20" height="16" fill="#14b8a6" />
            <rect x="26" y="48" width="12" height="6" fill="#fde2d2" />
            {/* Neck */}
            <rect x="28" y="42" width="8" height="8" fill="#f6cbb7" />
            {/* Face */}
            <rect x="20" y="20" width="24" height="23" fill="#fde2d2" />
            <rect x="22" y="41" width="20" height="3" fill="#f6cbb7" />
            {/* Ear + Signature Gold Hoop Earring */}
            <rect x="43" y="30" width="4" height="6" fill="#f6cbb7" />
            <rect x="43" y="34" width="6" height="1" fill="#fbbf24" />
            <rect x="42" y="35" width="1" height="6" fill="#fbbf24" />
            <rect x="49" y="35" width="1" height="6" fill="#fbbf24" />
            <rect x="43" y="41" width="6" height="1" fill="#f59e0b" />
            {/* Sky Blue Eyes */}
            <rect x="23" y="28" width="6" height="6" fill="#ffffff" />
            <rect x="35" y="28" width="6" height="6" fill="#ffffff" />
            <rect x="24" y="29" width="4" height="5" fill="#0284c7" />
            <rect x="36" y="29" width="4" height="5" fill="#0284c7" />
            <rect x="25" y="30" width="2" height="2" fill="#0f172a" />
            <rect x="37" y="30" width="2" height="2" fill="#0f172a" />
            <rect x="24" y="29" width="1" height="1" fill="#ffffff" />
            <rect x="36" y="29" width="1" height="1" fill="#ffffff" />
            {/* Brows */}
            <rect x="23" y={isAlert ? '25' : '27'} width="6" height="1" fill="#431407" />
            <rect x="35" y={isAlert ? '25' : '27'} width="6" height="1" fill="#431407" />
            {/* Mouth */}
            {isSmiling ? (
              <rect x="29" y="38" width="6" height="2" fill="#e11d48" />
            ) : (
              <rect x="30" y="38" width="4" height="1" fill="#b45349" />
            )}
            {/* Swept Chestnut Bangs */}
            <rect x="18" y="12" width="28" height="12" fill="#854d27" />
            <rect x="18" y="21" width="9" height="6" fill="#9a5b2f" />
            <rect x="27" y="21" width="7" height="5" fill="#854d27" />
            <rect x="35" y="19" width="7" height="5" fill="#6b3c1c" />
            <rect x="14" y="22" width="6" height="20" fill="#854d27" />
          </g>
        );

      case 'rina_romance':
        // Violet-indigo hair + pink hairclip + camera strap
        return (
          <g shapeRendering="crispEdges">
            <rect x="15" y="8" width="34" height="40" fill="#4c1d95" />
            <rect x="13" y="16" width="38" height="32" fill="#5b21b6" />
            <rect x="16" y="48" width="32" height="16" fill="#1e293b" />
            <rect x="24" y="48" width="16" height="16" fill="#334155" />
            {/* Camera Strap */}
            <rect x="22" y="48" width="3" height="16" fill="#f43f5e" />
            <rect x="39" y="48" width="3" height="16" fill="#f43f5e" />
            <rect x="28" y="42" width="8" height="8" fill="#f6cbb7" />
            <rect x="20" y="20" width="24" height="23" fill="#fde2d2" />
            {/* Rose Eyes */}
            <rect x="23" y="28" width="6" height="6" fill="#ffffff" />
            <rect x="35" y="28" width="6" height="6" fill="#ffffff" />
            <rect x="24" y="29" width="4" height="5" fill="#e11d48" />
            <rect x="36" y="29" width="4" height="5" fill="#e11d48" />
            <rect x="25" y="30" width="2" height="2" fill="#1e1b4b" />
            <rect x="37" y="30" width="2" height="2" fill="#1e1b4b" />
            <rect x="24" y="29" width="1" height="1" fill="#ffffff" />
            <rect x="36" y="29" width="1" height="1" fill="#ffffff" />
            {isSmiling ? (
              <rect x="29" y="38" width="6" height="2" fill="#fb7185" />
            ) : (
              <rect x="30" y="38" width="4" height="1" fill="#b45349" />
            )}
            <rect x="18" y="13" width="28" height="10" fill="#6d28d9" />
            <rect x="21" y="21" width="5" height="6" fill="#5b21b6" />
            <rect x="30" y="21" width="5" height="5" fill="#6d28d9" />
            <rect x="39" y="19" width="5" height="3" fill="#f472b6" />
          </g>
        );

      case 'nadia_cafe':
        // Honey-amber hair + forest green barista apron
        return (
          <g shapeRendering="crispEdges">
            <rect x="15" y="9" width="34" height="40" fill="#92400e" />
            <rect x="13" y="16" width="38" height="32" fill="#b45309" />
            {/* Cream Blouse + Green Barista Apron */}
            <rect x="16" y="48" width="32" height="16" fill="#fef3c7" />
            <rect x="20" y="51" width="24" height="13" fill="#166534" />
            <rect x="22" y="48" width="3" height="5" fill="#15803d" />
            <rect x="39" y="48" width="3" height="5" fill="#15803d" />
            <rect x="28" y="42" width="8" height="8" fill="#f6cbb7" />
            <rect x="20" y="20" width="24" height="23" fill="#fde2d2" />
            {/* Emerald Eyes */}
            <rect x="23" y="28" width="6" height="6" fill="#ffffff" />
            <rect x="35" y="28" width="6" height="6" fill="#ffffff" />
            <rect x="24" y="29" width="4" height="5" fill="#059669" />
            <rect x="36" y="29" width="4" height="5" fill="#059669" />
            <rect x="25" y="30" width="2" height="2" fill="#064e3b" />
            <rect x="37" y="30" width="2" height="2" fill="#064e3b" />
            {isSmiling ? (
              <rect x="29" y="38" width="6" height="2" fill="#e11d48" />
            ) : (
              <rect x="30" y="38" width="4" height="1" fill="#b45349" />
            )}
            <rect x="18" y="13" width="28" height="10" fill="#d97706" />
            <rect x="20" y="21" width="5" height="6" fill="#b45309" />
            <rect x="38" y="21" width="5" height="6" fill="#d97706" />
            <rect x="21" y="16" width="4" height="2" fill="#34d399" />
          </g>
        );

      case 'kaito_music':
        // Midnight blue spiky hair + headphones around neck + cyan eyes
        return (
          <g shapeRendering="crispEdges">
            <rect x="16" y="8" width="32" height="30" fill="#1e3a8a" />
            <rect x="14" y="14" width="36" height="20" fill="#1d4ed8" />
            {/* Dark Cardigan + Headphones */}
            <rect x="15" y="48" width="34" height="16" fill="#0f172a" />
            <rect x="24" y="48" width="16" height="16" fill="#334155" />
            <rect x="21" y="47" width="4" height="7" fill="#38bdf8" />
            <rect x="39" y="47" width="4" height="7" fill="#38bdf8" />
            <rect x="28" y="42" width="8" height="8" fill="#f1c6af" />
            <rect x="20" y="20" width="24" height="23" fill="#fbd8c5" />
            {/* Cyan Eyes */}
            <rect x="23" y="28" width="6" height="5" fill="#ffffff" />
            <rect x="35" y="28" width="6" height="5" fill="#ffffff" />
            <rect x="24" y="29" width="4" height="4" fill="#0284c7" />
            <rect x="36" y="29" width="4" height="4" fill="#0284c7" />
            <rect x="25" y="30" width="2" height="2" fill="#082f49" />
            <rect x="37" y="30" width="2" height="2" fill="#082f49" />
            {isSmiling ? (
              <rect x="29" y="38" width="6" height="2" fill="#c2410c" />
            ) : (
              <rect x="30" y="38" width="4" height="1" fill="#9a3412" />
            )}
            <rect x="18" y="12" width="28" height="11" fill="#1d4ed8" />
            <rect x="20" y="21" width="5" height="6" fill="#1e40af" />
            <rect x="28" y="20" width="6" height="7" fill="#1d4ed8" />
            <rect x="38" y="21" width="5" height="6" fill="#1e3a8a" />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 64 64"
      className={`pixelated select-none ${className}`}
      style={{
        filter:
          'drop-shadow(2px 0 0 #ffffff) drop-shadow(-2px 0 0 #ffffff) drop-shadow(0 -2px 0 #ffffff)',
      }}
    >
      {renderCharacter()}
    </svg>
  );
};

interface ManagedPixelPortraitProps {
  characterId: RomanceCharacterId;
  expression?: EmotionAlias;
  assetUrl?: string;
  alt?: string;
  className?: string;
}

export const ManagedPixelPortrait: React.FC<ManagedPixelPortraitProps> = ({
  characterId,
  expression = 'neutral',
  assetUrl,
  alt,
  className = '',
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const resolvedUrl = assetUrl || resolvePortraitAssetUrl(characterId, expression);

  if (failedUrl === resolvedUrl) {
    return (
      <PixelCharacterSprite
        characterId={characterId}
        expression={expression}
        className={className}
      />
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt ?? `${characterId} ${normalizeEmotionKey(expression)} portrait`}
      referrerPolicy="no-referrer"
      onError={() => setFailedUrl(resolvedUrl)}
      className={`pixelated select-none object-contain ${className}`}
      style={{
        filter:
          'drop-shadow(2px 0 0 #ffffff) drop-shadow(-2px 0 0 #ffffff) drop-shadow(0 -2px 0 #ffffff)',
      }}
    />
  );
};

interface PixelSceneBackdropProps {
  roomId: string;
  slotKey: TimeSlotKey;
  shaderEnabled: boolean;
  shaderMode: ShaderMode;
  vfxEnabled: boolean;
}

export const PixelSceneBackdrop: React.FC<PixelSceneBackdropProps> = ({
  roomId,
  slotKey,
  shaderEnabled,
  shaderMode,
  vfxEnabled,
}) => {
  const skyPalette: Record<TimeSlotKey, { top: string; mid: string; horizon: string; light: string }> = {
    morning: { top: '#6366f1', mid: '#c084fc', horizon: '#fdba74', light: '#fde68a' },
    afternoon: { top: '#0284c7', mid: '#38bdf8', horizon: '#bae6fd', light: '#fef9c3' },
    evening: { top: '#4c1d95', mid: '#db2777', horizon: '#fb923c', light: '#fcd34d' },
    night: { top: '#090d16', mid: '#1e1b4b', horizon: '#312e81', light: '#93c5fd' },
  };
  const sky = skyPalette[slotKey];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0c0a12]">
      <svg
        viewBox="0 0 320 128"
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="crispEdges"
        className="w-full h-full pixelated"
      >
        {/* Sky Band */}
        <rect x="0" y="0" width="320" height="44" fill={sky.top} />
        <rect x="0" y="36" width="320" height="36" fill={sky.mid} />
        <rect x="0" y="64" width="320" height="32" fill={sky.horizon} />

        {/* Stars at night */}
        {slotKey === 'night' && (
          <>
            <rect x="34" y="14" width="2" height="2" fill="#fef08a" />
            <rect x="86" y="22" width="2" height="2" fill="#e0f2fe" />
            <rect x="144" y="10" width="2" height="2" fill="#fef08a" />
            <rect x="210" y="18" width="2" height="2" fill="#fda4af" />
            <rect x="275" y="12" width="2" height="2" fill="#fef08a" />
          </>
        )}

        {/* Distant City Skyline (visible outside windows / terraces) */}
        <rect x="12" y="42" width="24" height="54" fill="#475569" opacity="0.6" />
        <rect x="44" y="32" width="28" height="64" fill="#334155" opacity="0.7" />
        <rect x="82" y="48" width="22" height="48" fill="#475569" opacity="0.55" />
        <rect x="116" y="28" width="30" height="68" fill="#334155" opacity="0.65" />
        <rect x="158" y="38" width="26" height="58" fill="#475569" opacity="0.6" />
        <rect x="202" y="24" width="32" height="72" fill="#1e293b" opacity="0.7" />
        <rect x="248" y="40" width="26" height="56" fill="#334155" opacity="0.65" />
        <rect x="284" y="34" width="24" height="62" fill="#1e293b" opacity="0.7" />

        {/* Room-specific Pixel Scenery */}
        {roomId === 'campus_dorm' && (
          <g>
            {/* Bedroom Window Frame */}
            <rect x="0" y="0" width="28" height="128" fill="#1e2230" />
            <rect x="240" y="0" width="80" height="128" fill="#252a3a" />
            <rect x="28" y="0" width="212" height="10" fill="#1e2230" />
            <rect x="28" y="80" width="212" height="48" fill="#2c2420" />
            {/* Window Panes */}
            <rect x="92" y="10" width="4" height="70" fill="#3b322c" />
            <rect x="164" y="10" width="4" height="70" fill="#3b322c" />
            <rect x="28" y="76" width="212" height="5" fill="#78350f" />
            {/* Sunlit Curtain */}
            <rect x="206" y="10" width="30" height="74" fill="#d97706" opacity="0.85" />
            <rect x="212" y="10" width="8" height="74" fill="#fbbf24" opacity="0.6" />
            {/* Bookshelf on right */}
            <rect x="252" y="22" width="42" height="72" fill="#451a03" />
            <rect x="255" y="26" width="36" height="16" fill="#271408" />
            <rect x="257" y="30" width="6" height="12" fill="#ef4444" />
            <rect x="264" y="31" width="5" height="11" fill="#38bdf8" />
            <rect x="270" y="29" width="7" height="13" fill="#eab308" />
            <rect x="255" y="48" width="36" height="16" fill="#271408" />
            <rect x="258" y="51" width="8" height="13" fill="#34d399" />
            <rect x="268" y="52" width="6" height="12" fill="#f472b6" />
            {/* Desk & Monitor on left */}
            <rect x="24" y="74" width="64" height="28" fill="#5c3a21" />
            <rect x="18" y="44" width="22" height="26" fill="#0f172a" />
            <rect x="20" y="46" width="18" height="22" fill="#1e293b" />
            {/* Sunlit Bed on bottom right */}
            <rect x="148" y="88" width="136" height="36" fill="#fef08a" />
            <rect x="148" y="98" width="136" height="26" fill="#eab308" opacity="0.7" />
            <rect x="244" y="82" width="34" height="14" fill="#fef9c3" />
            {/* Diagonal Golden Light Beams */}
            <polygon
              points="40,10 140,10 220,128 96,128"
              fill={sky.light}
              opacity={slotKey === 'night' ? '0.07' : '0.18'}
            />
          </g>
        )}

        {roomId === 'campus_park' && (
          <g>
            <rect x="0" y="82" width="320" height="46" fill="#1e3a2f" />
            <rect x="0" y="96" width="320" height="32" fill="#334155" />
            {/* Sakura Trees */}
            <rect x="34" y="42" width="10" height="48" fill="#451a03" />
            <rect x="12" y="16" width="54" height="32" fill="#f472b6" />
            <rect x="20" y="10" width="38" height="14" fill="#fbcfe8" />
            <rect x="246" y="40" width="12" height="50" fill="#451a03" />
            <rect x="220" y="12" width="66" height="34" fill="#fb7185" />
            <rect x="232" y="6" width="44" height="14" fill="#fda4af" />
            {/* Park Bench */}
            <rect x="122" y="84" width="68" height="14" fill="#78350f" />
            <rect x="122" y="80" width="68" height="4" fill="#b45309" />
          </g>
        )}

        {roomId === 'campus_cafe' && (
          <g>
            <rect x="0" y="0" width="320" height="18" fill="#2c1810" />
            <rect x="0" y="78" width="320" height="50" fill="#3e2418" />
            {/* Hanging Warm Lamps */}
            <rect x="66" y="0" width="2" height="24" fill="#1c1917" />
            <rect x="60" y="24" width="14" height="8" fill="#f59e0b" />
            <rect x="160" y="0" width="2" height="24" fill="#1c1917" />
            <rect x="154" y="24" width="14" height="8" fill="#fbbf24" />
            <rect x="254" y="0" width="2" height="24" fill="#1c1917" />
            <rect x="248" y="24" width="14" height="8" fill="#f59e0b" />
            {/* Barista Counter & Espresso Machine */}
            <rect x="22" y="68" width="150" height="34" fill="#5c3118" />
            <rect x="22" y="65" width="150" height="4" fill="#b45309" />
            <rect x="44" y="48" width="28" height="17" fill="#64748b" />
            <rect x="48" y="52" width="8" height="8" fill="#34d399" />
            <rect x="110" y="57" width="12" height="8" fill="#fef3c7" />
          </g>
        )}

        {roomId === 'campus_library' && (
          <g>
            <rect x="0" y="0" width="320" height="128" fill="#1b1526" />
            <rect x="18" y="10" width="76" height="88" fill="#3b2114" />
            <rect x="226" y="10" width="76" height="88" fill="#3b2114" />
            {[16, 36, 56, 76].map((y) => (
              <g key={y}>
                <rect x="24" y={y} width="64" height="14" fill="#1f110a" />
                <rect x="28" y={y + 2} width="8" height="12" fill="#ef4444" />
                <rect x="38" y={y + 3} width="7" height="11" fill="#38bdf8" />
                <rect x="48" y={y + 2} width="9" height="12" fill="#fbbf24" />
                <rect x="60" y={y + 4} width="6" height="10" fill="#a78bfa" />
                <rect x="232" y={y} width="64" height="14" fill="#1f110a" />
                <rect x="236" y={y + 2} width="8" height="12" fill="#34d399" />
                <rect x="248" y={y + 3} width="7" height="11" fill="#fb7185" />
                <rect x="260" y={y + 2} width="9" height="12" fill="#f59e0b" />
              </g>
            ))}
            {/* Tall Arched Center Window */}
            <rect x="116" y="12" width="88" height="72" fill={sky.mid} />
            <rect x="158" y="12" width="4" height="72" fill="#3b2114" />
            <rect x="116" y="46" width="88" height="4" fill="#3b2114" />
            {/* Reading Desk */}
            <rect x="68" y="92" width="184" height="36" fill="#4c2818" />
            <rect x="136" y="84" width="24" height="8" fill="#fef3c7" />
          </g>
        )}

        {roomId === 'campus_observatory' && (
          <g>
            {/* Rooftop Railing & Telescope */}
            <rect x="0" y="92" width="320" height="36" fill="#1e293b" />
            <rect x="0" y="78" width="320" height="4" fill="#475569" />
            {[20, 60, 100, 140, 180, 220, 260, 300].map((x) => (
              <rect key={x} x={x} y="78" width="3" height="16" fill="#334155" />
            ))}
            {/* Telescope */}
            <rect x="46" y="64" width="28" height="7" fill="#e2e8f0" />
            <rect x="58" y="71" width="4" height="24" fill="#64748b" />
          </g>
        )}

        {/* Ambient Pixel VFX Particles */}
        {vfxEnabled && (
          <g>
            <rect
              x="64"
              y="26"
              width="3"
              height="3"
              fill={slotKey === 'night' ? '#fde047' : '#fda4af'}
              opacity="0.85"
            />
            <rect
              x="132"
              y="44"
              width="2"
              height="2"
              fill={slotKey === 'night' ? '#fde047' : '#fbcfe8'}
              opacity="0.8"
            />
            <rect
              x="212"
              y="30"
              width="3"
              height="3"
              fill={slotKey === 'night' ? '#fef08a' : '#fda4af'}
              opacity="0.85"
            />
          </g>
        )}
      </svg>

      {/* Studio Shader Overlay */}
      {shaderEnabled && shaderMode === 'night_vision' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, rgba(16,185,129,0.14) 0 2px, rgba(6,78,59,0.28) 2px 4px)',
          }}
        />
      )}
      {shaderEnabled && shaderMode === 'thermal' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(251,146,60,0.12) 20%, rgba(49,46,129,0.45) 100%)',
          }}
        />
      )}
      {shaderEnabled && shaderMode === 'crt_vignette' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px), radial-gradient(circle, transparent 55%, rgba(0,0,0,0.6) 100%)',
          }}
        />
      )}
    </div>
  );
};
