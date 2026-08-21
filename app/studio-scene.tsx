'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const BLUE = '#58705f';
const INK = '#262620';
const PAPER = '#f4f0e6';
const PALE = '#e7e2d6';
const CLAY = '#c86f53';

function StudioPainting({ phase }: { phase: number }) {
  return (
    <group position={[0.82, 0.56, -0.45]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.55, 1.28, 0.08]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh>
        <boxGeometry args={[1.42, 1.15, 0.1]} />
        <meshStandardMaterial color={PAPER} />
      </mesh>
      <mesh position={[0.51, 0.02, 0.07]} rotation={[0, 0, 0.25]}>
        <circleGeometry args={[0.22, 18]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
      {phase >= 1 && (
        <group>
          <mesh position={[-0.25, 0.2, 0.075]} rotation={[0, 0, -0.58]}>
            <boxGeometry args={[0.08, 0.58, 0.035]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[-0.08, -0.08, 0.075]} rotation={[0, 0, 0.72]}>
            <boxGeometry args={[0.07, 0.42, 0.035]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        </group>
      )}
      {phase >= 2 && (
        <group>
          <mesh position={[0.05, 0.3, 0.08]} rotation={[0, 0, 0.18]}>
            <circleGeometry args={[0.17, 3]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          <mesh position={[-0.42, -0.33, 0.08]} rotation={[0, 0, -0.35]}>
            <torusGeometry args={[0.2, 0.035, 10, 28, Math.PI * 1.35]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0.58, -0.47, 0.15]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.34, 0.045, 0.04]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ThreadCurve({
  points,
  color,
  radius = 0.018,
}: {
  points: Array<[number, number, number]>;
  color: string;
  radius?: number;
}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );

  return (
    <mesh>
      <tubeGeometry args={[curve, 36, radius, 8, false]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function ThreadingObject({ phase }: { phase: number }) {
  const loop = phase === 0
    ? {
        top: [[-1.05, 0.43, 0.08], [-0.66, 0.57, 0.08], [-0.2, 0.43, 0.08]] as Array<[number, number, number]>,
        bottom: [[-1.05, 0.43, 0.08], [-0.66, 0.29, 0.08], [-0.2, 0.43, 0.08]] as Array<[number, number, number]>,
      }
    : {
        top: [[-0.62, 0.43, 0.08], [0.26, 0.55, 0.08], [1.03, 0.43, 0.08]] as Array<[number, number, number]>,
        bottom: [[-0.62, 0.43, 0.08], [0.26, 0.31, 0.08], [1.03, 0.43, 0.08]] as Array<[number, number, number]>,
      };

  return (
    <group position={[0.72, -0.15, -0.4]}>
      <group position={[0.22, 0, 0]}>
        <mesh position={[0, -0.29, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 1.25, 12]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0, 0.43, 0]} scale={[0.5, 1, 1]}>
          <torusGeometry args={[0.2, 0.052, 12, 36]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0, -1.02, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.075, 0.25, 12]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>

      <ThreadCurve points={loop.top} color={BLUE} />
      <ThreadCurve points={loop.bottom} color={BLUE} />

      <mesh position={[phase === 0 ? -1.12 : -0.7, 0.43, 0.08]}>
        <boxGeometry args={[0.18, 0.3, 0.08]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>

      {phase >= 2 && (
        <ThreadCurve
          points={[
            [-1.28, -0.05, 0.04],
            [-0.72, 0.02, 0.04],
            [-0.2, 0.35, 0.04],
            [0.22, 0.43, 0.04],
            [0.7, 0.42, 0.04],
            [1.14, 0.18, 0.04],
          ]}
          color={INK}
          radius={0.035}
        />
      )}

      {phase === 0 && (
        <mesh position={[-0.05, 0.43, 0.04]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.055, 0.15, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      )}
    </group>
  );
}

function MemoryRecordObject({ phase }: { phase: number }) {
  const recalledMarkPositions: Array<[number, number, number]> = [
    [-0.12, 0.12, 0.11],
    [0.08, 0.22, 0.11],
    [-0.02, -0.02, 0.11],
  ];
  const recalledMark = recalledMarkPositions[phase] ?? recalledMarkPositions[2];

  return (
    <group position={[0.74, -0.08, -0.42]}>
      <group position={[-0.42, 0.08, 0]}>
        {[-1, 0, 1].map((layer) => (
          <mesh
            key={layer}
            position={[layer * 0.07, layer * 0.035, layer * -0.035]}
            rotation={[0, 0, layer * 0.09 + (phase - 1) * 0.035]}
          >
            <boxGeometry args={[0.82, 1.0, 0.045]} />
            <meshStandardMaterial
              color={layer === 0 ? '#dfe7ff' : PAPER}
              transparent
              opacity={layer === 0 ? 0.66 : 0.48}
            />
          </mesh>
        ))}
        <mesh position={recalledMark}>
          <circleGeometry args={[0.13, 20]} />
          <meshStandardMaterial color={BLUE} transparent opacity={0.82} />
        </mesh>
        {phase >= 1 && (
          <mesh position={[recalledMarkPositions[phase - 1][0], recalledMarkPositions[phase - 1][1], 0.08]}>
            <circleGeometry args={[0.13, 20]} />
            <meshStandardMaterial color={BLUE} transparent opacity={0.15} />
          </mesh>
        )}
        <mesh position={[-0.15, -0.25, 0.1]} rotation={[0, 0, 0.18]}>
          <torusGeometry args={[0.23, 0.022, 8, 24, Math.PI * 1.45]} />
          <meshStandardMaterial color={INK} transparent opacity={0.34} />
        </mesh>
      </group>

      <group position={[0.68, 0.07, 0]}>
        {[0, 1, 2].map((layer) => (
          <mesh key={layer} position={[layer * 0.035, -layer * 0.065, layer * -0.03]}>
            <boxGeometry args={[0.86, 1.06, 0.055]} />
            <meshStandardMaterial color={layer === 0 ? INK : PALE} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.07]}>
          <boxGeometry args={[0.76, 0.94, 0.055]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.2, 0.22, 0.11]}>
          <circleGeometry args={[0.105, 20]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        {[0.12, -0.04, -0.2].map((y, index) => (
          <mesh key={y} position={[index === 2 ? 0.08 : 0.14, y, 0.11]}>
            <boxGeometry args={[index === 1 ? 0.28 : 0.36, 0.028, 0.018]} />
            <meshStandardMaterial color={index === 2 ? BLUE : INK} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ParallaxObject({ phase }: { phase: number }) {
  const apparentX = phase === 0 ? 0.28 : phase === 1 ? -0.28 : 0;
  const observerX = phase === 0 ? -0.66 : phase === 1 ? 0.66 : 0;
  const backgroundStars: Array<[number, number, number]> = [
    [-0.58, 0.34, 0.08],
    [-0.18, 0.5, 0.08],
    [0.22, 0.38, 0.08],
    [0.58, 0.56, 0.08],
    [0.48, 0.12, 0.08],
    [-0.5, 0.02, 0.08],
  ];

  return (
    <group position={[0.78, -0.08, -0.42]}>
      <mesh position={[0, 0.14, -0.05]}>
        <boxGeometry args={[1.72, 1.36, 0.06]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[1.62, 1.26, 0.06]} />
        <meshStandardMaterial color={PAPER} />
      </mesh>

      {backgroundStars.map(([x, y, z], index) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} rotation={[0, 0, index * 0.32]}>
          <circleGeometry args={[index % 2 === 0 ? 0.035 : 0.025, 10]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}

      {phase === 2 && [-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.3, 0.095]}>
          <circleGeometry args={[0.095, 18]} />
          <meshStandardMaterial color={BLUE} transparent opacity={0.15} />
        </mesh>
      ))}
      <mesh position={[apparentX, 0.3, 0.11]} rotation={[0, 0, Math.PI / 4]}>
        <circleGeometry args={[0.095, 4]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>

      <mesh position={[-0.66, -0.39, 0.1]}>
        <circleGeometry args={[0.075, 18]} />
        <meshStandardMaterial color={phase === 0 || phase === 2 ? BLUE : PALE} />
      </mesh>
      <mesh position={[0.66, -0.39, 0.1]}>
        <circleGeometry args={[0.075, 18]} />
        <meshStandardMaterial color={phase === 1 || phase === 2 ? BLUE : PALE} />
      </mesh>
      <mesh position={[0, -0.39, 0.1]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      {phase < 2 ? (
        <ThreadCurve
          points={[[observerX, -0.31, 0.09], [(observerX + apparentX) / 2, -0.02, 0.09], [apparentX, 0.25, 0.09]]}
          color={BLUE}
          radius={0.011}
        />
      ) : (
        <>
          <ThreadCurve points={[[-0.66, -0.31, 0.09], [-0.34, -0.02, 0.09], [0, 0.25, 0.09]]} color={BLUE} radius={0.011} />
          <ThreadCurve points={[[0.66, -0.31, 0.09], [0.34, -0.02, 0.09], [0, 0.25, 0.09]]} color={BLUE} radius={0.011} />
        </>
      )}
    </group>
  );
}

function MeanderObject({ phase }: { phase: number }) {
  const paths: Array<Array<[number, number, number]>> = [
    [[-0.86, 0.22, 0.09], [-0.48, 0.4, 0.09], [-0.06, 0.16, 0.09], [0.36, -0.18, 0.09], [0.82, -0.02, 0.09]],
    [[-0.86, 0.2, 0.09], [-0.5, 0.5, 0.09], [-0.04, 0.26, 0.09], [0.34, -0.34, 0.09], [0.82, -0.04, 0.09]],
    [[-0.86, 0.18, 0.09], [-0.52, 0.57, 0.09], [-0.02, 0.35, 0.09], [0.36, -0.47, 0.09], [0.82, -0.06, 0.09]],
  ];
  const path = paths[phase] ?? paths[2];
  const sediment = [
    [-0.22, 0.23, 0.13],
    [0.13, -0.24, 0.13],
    [0.25, -0.31, 0.13],
  ] as Array<[number, number, number]>;
  const erodingBank = [
    [-0.55, 0.48, 0.11],
    [0.44, -0.38, 0.11],
    [0.54, -0.3, 0.11],
  ] as Array<[number, number, number]>;

  return (
    <group position={[0.76, -0.03, -0.42]}>
      <mesh position={[0, 0.06, -0.03]}>
        <boxGeometry args={[1.95, 1.3, 0.055]} />
        <meshStandardMaterial color={PAPER} />
      </mesh>
      <ThreadCurve points={path} color={PALE} radius={0.2} />
      <ThreadCurve points={path} color={BLUE} radius={0.115} />

      {sediment.slice(0, phase + 1).map(([x, y, z], index) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} rotation={[0, 0, index * 0.7]}>
          <circleGeometry args={[0.06 - index * 0.008, 9]} />
          <meshStandardMaterial color={index === 0 ? PAPER : PALE} />
        </mesh>
      ))}

      {erodingBank.slice(phase, 3).map(([x, y, z], index) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} rotation={[0, 0, 0.35 + index * 0.4]}>
          <boxGeometry args={[0.09, 0.045, 0.035]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}

      {[
        [-0.62, 0.29, 0.15, -0.72],
        [0.1, -0.02, 0.15, -0.98],
        [0.63, -0.1, 0.15, 1.18],
      ].slice(0, phase + 1).map(([x, y, z, rotation]) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} rotation={[0, 0, rotation]}>
          <coneGeometry args={[0.045, 0.13, 8]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
      ))}
    </group>
  );
}

function CoolingColumnsObject({ phase }: { phase: number }) {
  const columns = [
    { x: -0.54, z: 0.02, sides: 6, lift: 0.08 },
    { x: -0.28, z: -0.18, sides: 5, lift: 0.18 },
    { x: -0.16, z: 0.16, sides: 6, lift: 0.28 },
    { x: 0.12, z: -0.08, sides: 7, lift: 0.12 },
    { x: 0.25, z: 0.2, sides: 6, lift: 0.24 },
    { x: 0.48, z: -0.13, sides: 5, lift: 0.04 },
    { x: 0.58, z: 0.18, sides: 6, lift: 0.16 },
  ];

  if (phase === 0) {
    return (
      <group position={[0.76, 0.02, -0.42]}>
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[1.72, 1.12, 0.08]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <ThreadCurve points={[[0, 0.5, 0.08], [-0.08, 0.14, 0.08], [0.16, -0.08, 0.08], [0.02, -0.48, 0.08]]} color={BLUE} radius={0.018} />
        <ThreadCurve points={[[-0.08, 0.14, 0.08], [-0.42, 0.02, 0.08], [-0.66, -0.2, 0.08]]} color={BLUE} radius={0.018} />
      </group>
    );
  }

  return (
    <group position={[0.76, -0.48, -0.48]}>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[1.72, 0.07, 1.05]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
      {columns.map((column, index) => {
        const height = phase === 1 ? 0.16 + column.lift * 0.2 : 0.48 + column.lift;
        return (
          <mesh
            key={`${column.x}-${column.z}`}
            position={[column.x, height / 2 + 0.07, column.z]}
            rotation={[0, index * 0.16, 0]}
          >
            <cylinderGeometry args={[0.2, 0.2, height, column.sides]} />
            <meshStandardMaterial color={index % 2 === 0 ? PAPER : PALE} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function CapillaryObject({ phase }: { phase: number }) {
  const rise = [0.28, 0.58, 0.88];
  const radii = [0.16, 0.1, 0.06];
  const phaseFactor = [0.35, 0.7, 1][phase] ?? 1;

  return (
    <group position={[0.76, -0.08, -0.42]}>
      <mesh position={[0, -0.52, 0]}>
        <boxGeometry args={[1.72, 0.18, 0.58]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
      {radii.map((radius, index) => {
        const x = (index - 1) * 0.5;
        const waterHeight = rise[index] * phaseFactor;
        const waterBottom = -0.45;

        return (
          <group key={radius} position={[x, 0, 0]}>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[radius, radius, 1.12, 24]} />
              <meshStandardMaterial color={PALE} transparent opacity={0.28} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.59, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius, 0.018, 8, 24]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <mesh position={[0, waterBottom + waterHeight / 2, 0]}>
              <cylinderGeometry args={[radius * 0.72, radius * 0.72, waterHeight, 20]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
            <mesh position={[0, waterBottom + waterHeight, 0]} scale={[radius * 0.72, 0.025, radius * 0.72]}>
              <sphereGeometry args={[1, 16, 8]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function TranspirationObject({ phase }: { phase: number }) {
  const waterPath: [number, number, number][] = [
    [-0.32, -0.46, 0.08],
    [0.22, -0.42, 0.08],
    [0, -0.18, 0.08],
    [0, 0.08, 0.08],
    [0.24, 0.32, 0.08],
    [0.38, 0.6, 0.08],
    [-0.3, 0.68, 0.08],
    [0.08, 0.88, 0.08],
  ];
  const visibleWater = [2, 5, 8][phase] ?? 8;

  return (
    <group position={[0.76, -0.1, -0.42]}>
      <mesh position={[0, -0.52, 0]}>
        <boxGeometry args={[1.6, 0.22, 0.64]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <ThreadCurve points={[[0, -0.46, 0], [0, -0.12, 0], [0, 0.2, 0], [0, 0.5, 0]]} color={INK} radius={0.075} />
      <ThreadCurve points={[[0, -0.4, 0.01], [-0.28, -0.5, 0.01], [-0.48, -0.44, 0.01]]} color={PALE} radius={0.035} />
      <ThreadCurve points={[[0, -0.4, 0.01], [0.24, -0.51, 0.01], [0.48, -0.45, 0.01]]} color={PALE} radius={0.035} />
      <ThreadCurve points={[[0, 0.14, 0], [-0.28, 0.32, 0]]} color={INK} radius={0.04} />
      <ThreadCurve points={[[0, 0.28, 0], [0.3, 0.42, 0]]} color={INK} radius={0.04} />

      {[
        [-0.4, 0.36, -0.02, -0.28],
        [0.42, 0.46, -0.02, 0.32],
        [0.02, 0.57, -0.01, 0.05],
      ].map(([x, y, z, rotation], index) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} rotation={[0, 0, rotation]} scale={[index === 2 ? 0.28 : 0.34, 0.14, 0.055]}>
          <sphereGeometry args={[1, 18, 10]} />
          <meshStandardMaterial color={index === 1 ? PAPER : PALE} />
        </mesh>
      ))}

      {waterPath.slice(0, visibleWater).map(([x, y, z], index) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} scale={[0.055, 0.075, 0.055]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={BLUE} transparent opacity={index >= 5 ? 0.62 : 1} />
        </mesh>
      ))}

      {phase === 2 && [0.31, 0.42, 0.53].map((x, index) => (
        <mesh key={x} position={[x, 0.46, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.025 + index * 0.008, 0.009, 7, 18]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      ))}
    </group>
  );
}

function EntropyObject({ phase }: { phase: number }) {
  const ordered: [number, number, number][] = [-0.54, -0.18, 0.18, 0.54].flatMap((x) =>
    [-0.32, 0, 0.32].map((y) => [x, y, 0.08] as [number, number, number]),
  );
  const changing: [number, number, number][] = [
    [-0.62, -0.34, 0.08], [-0.23, -0.28, 0.08], [0.16, -0.36, 0.08], [0.55, -0.2, 0.08],
    [-0.48, 0.02, 0.08], [-0.08, 0.12, 0.08], [0.28, -0.02, 0.08], [0.63, 0.18, 0.08],
    [-0.58, 0.34, 0.08], [-0.12, 0.42, 0.08], [0.32, 0.29, 0.08], [0.52, 0.48, 0.08],
  ];
  const scattered: [number, number, number][] = [
    [-0.7, -0.42, 0.08], [-0.41, 0.37, 0.08], [-0.16, -0.2, 0.08], [0.1, 0.48, 0.08],
    [0.36, -0.39, 0.08], [0.69, 0.18, 0.08], [-0.63, 0.05, 0.08], [-0.28, 0.12, 0.08],
    [0.02, -0.47, 0.08], [0.25, 0.05, 0.08], [0.52, 0.42, 0.08], [0.73, -0.18, 0.08],
  ];
  const positions = [ordered, changing, scattered][phase] ?? scattered;

  return (
    <group position={[0.76, -0.06, -0.42]}>
      <mesh position={[0, 0.02, -0.04]}>
        <boxGeometry args={[1.72, 1.14, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      {[
        [0, -0.57, 1.82, 0.045],
        [0, 0.61, 1.82, 0.045],
        [-0.88, 0.02, 0.045, 1.18],
        [0.88, 0.02, 0.045, 1.18],
      ].map(([x, y, width, height]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0.03]}>
          <boxGeometry args={[width, height, 0.05]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}
      {positions.map(([x, y, z], index) => (
        <mesh
          key={index}
          position={[x, y, z]}
          rotation={[0, 0, phase === 0 ? 0 : ((index % 5) - 2) * 0.18]}
        >
          <boxGeometry args={[0.13, 0.13, 0.08]} />
          <meshStandardMaterial color={index % 3 === 0 ? BLUE : index % 3 === 1 ? PAPER : INK} />
        </mesh>
      ))}
    </group>
  );
}

function LocalOrderObject({ phase }: { phase: number }) {
  const ordered: [number, number, number][] = [-0.22, 0, 0.22].flatMap((x) =>
    [-0.22, 0, 0.22].map((y) => [x, y, 0.1] as [number, number, number]),
  );
  const loose: [number, number, number][] = [
    [-0.34, 0.34, 0.1], [0.3, -0.35, 0.1], [0.36, 0.22, 0.1],
    [-0.38, -0.18, 0.1], [0.08, 0.37, 0.1], [-0.12, -0.38, 0.1],
    [0.39, -0.06, 0.1], [-0.3, 0.08, 0.1], [0.18, -0.3, 0.1],
  ];
  const assembled = [2, 5, 9][phase] ?? 9;
  const positions = ordered.map((position, index) => index < assembled ? position : loose[index]);
  const exhaust: [number, number, number][] = [
    [0.57, -0.34, 0.1], [0.68, -0.14, 0.1], [0.57, 0.08, 0.1],
    [0.77, 0.28, 0.1], [0.62, 0.43, 0.1], [0.84, -0.36, 0.1],
    [0.86, 0.02, 0.1], [0.75, 0.48, 0.1],
  ];
  const visibleExhaust = [2, 5, 8][phase] ?? 8;

  return (
    <group position={[0.76, -0.05, -0.42]}>
      <ThreadCurve points={[[-0.8, 0, 0.03], [-0.42, 0, 0.03], [0, 0, 0.03], [0.42, 0, 0.03], [0.82, 0.1, 0.03]]} color={BLUE} radius={0.018} />
      <mesh position={[-0.76, 0, 0.06]}>
        <sphereGeometry args={[0.14, 18, 12]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.92, 0.92, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      {[
        [0, -0.47, 0.98, 0.035], [0, 0.47, 0.98, 0.035],
        [-0.47, 0, 0.035, 0.98], [0.47, 0, 0.035, 0.98],
      ].map(([x, y, width, height]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0.04]}>
          <boxGeometry args={[width, height, 0.04]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}
      {positions.map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[0, 0, index < assembled ? 0 : ((index % 3) - 1) * 0.3]}>
          <boxGeometry args={[0.14, 0.14, 0.07]} />
          <meshStandardMaterial color={index % 3 === 0 ? BLUE : index % 3 === 1 ? PAPER : INK} />
        </mesh>
      ))}
      {exhaust.slice(0, visibleExhaust).map(([x, y, z], index) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} scale={[0.025 + index * 0.004, 0.025 + index * 0.004, 0.025]}>
          <sphereGeometry args={[1, 10, 7]} />
          <meshStandardMaterial color={index % 2 === 0 ? BLUE : PALE} transparent opacity={0.82 - index * 0.06} />
        </mesh>
      ))}
    </group>
  );
}

function EnergyBudgetObject({ phase }: { phase: number }) {
  const lowEnergy = phase >= 1;
  const recycling = phase >= 2;
  const chargeDots = [-0.18, -0.06, 0.06, 0.18];

  return (
    <group position={[0.74, -0.06, -0.42]}>
      <mesh position={[0.08, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>

      <ThreadCurve
        points={[[-0.84, 0, 0.04], [-0.58, 0, 0.04], [-0.34, 0, 0.04]]}
        color={BLUE}
        radius={0.018}
      />
      {[-0.8, -0.64, -0.48].map((x, index) => (
        <mesh key={x} position={[x, 0, 0.09]}>
          <sphereGeometry args={[0.055 - index * 0.008, 12, 8]} />
          <meshStandardMaterial color={index === 0 ? BLUE : PAPER} />
        </mesh>
      ))}

      <mesh position={[-0.25, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.028, 10, 30]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      {chargeDots.map((y, index) => (
        <mesh key={y} position={[-0.25, y, 0.1]}>
          <boxGeometry args={[0.065, 0.065, 0.05]} />
          <meshStandardMaterial color={index < (lowEnergy ? 1 : 3) ? BLUE : PAPER} />
        </mesh>
      ))}

      <ThreadCurve
        points={[[-0.04, 0.06, 0.04], [0.18, 0.28, 0.04], [0.48, 0.32, 0.04], [0.72, 0.32, 0.04]]}
        color={lowEnergy ? PAPER : BLUE}
        radius={0.016}
      />
      <mesh position={[0.2, 0.25, 0.1]} rotation={[0, 0, lowEnergy ? -0.72 : 0.5]}>
        <boxGeometry args={[0.035, 0.28, 0.05]} />
        <meshStandardMaterial color={lowEnergy ? BLUE : INK} />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <mesh key={index} position={[0.48 + (index % 2) * 0.17, 0.25 + Math.floor(index / 2) * 0.16, 0.09]}>
          <boxGeometry args={[0.12, 0.12, 0.06]} />
          <meshStandardMaterial color={!lowEnergy && index < 3 ? BLUE : index === 0 ? INK : PAPER} />
        </mesh>
      ))}

      <ThreadCurve
        points={[[-0.04, -0.06, 0.04], [0.18, -0.27, 0.04], [0.42, -0.31, 0.04]]}
        color={lowEnergy ? BLUE : PAPER}
        radius={0.016}
      />
      <mesh position={[0.48, -0.3, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.035, 10, 32, Math.PI * 1.72]} />
        <meshStandardMaterial color={lowEnergy ? BLUE : INK} />
      </mesh>
      {[[-0.02, 0.03], [0.08, -0.05], [-0.08, -0.08]].map(([x, y], index) => (
        <mesh key={`${x}-${y}`} position={[0.48 + x, -0.3 + y, 0.1]} rotation={[0, 0, index * 0.48]}>
          <boxGeometry args={[0.08, index === 1 ? 0.13 : 0.08, 0.05]} />
          <meshStandardMaterial color={index === 1 ? INK : PAPER} />
        </mesh>
      ))}
      {recycling && [0.7, 0.82, 0.92].map((x, index) => (
        <mesh key={x} position={[x, -0.3 + (index - 1) * 0.09, 0.1]}>
          <sphereGeometry args={[0.045 - index * 0.005, 10, 7]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      ))}
    </group>
  );
}

function CargoTagObject({ phase }: { phase: number }) {
  const tagged = phase >= 1;
  const enclosed = phase >= 2;
  const cargoX = enclosed ? 0.38 : 0.02;

  return (
    <group position={[0.75, -0.04, -0.42]}>
      <mesh position={[0.02, 0, -0.03]}>
        <boxGeometry args={[1.7, 1.02, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>

      <group position={[-0.55, -0.04, 0.08]}>
        <mesh>
          <sphereGeometry args={[0.18, 16, 10]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[0.02, 0.02, 0.13]}>
          <sphereGeometry args={[0.055, 10, 7]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, y]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.02]}>
            <boxGeometry args={[Math.abs(x) > 0.2 ? 0.16 : 0.04, Math.abs(y) > 0.2 ? 0.04 : 0.16, 0.035]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        ))}
      </group>

      <group position={[cargoX, 0.03, 0.09]} rotation={[0, 0, 0.18]}>
        {[[-0.11, 0.03], [0.04, 0.09], [0.1, -0.07], [-0.06, -0.1]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0]} rotation={[0, 0, index * 0.3]}>
            <boxGeometry args={[0.13, index % 2 === 0 ? 0.09 : 0.14, 0.06]} />
            <meshStandardMaterial color={index === 2 ? INK : PAPER} />
          </mesh>
        ))}
        {tagged && (
          <mesh position={[-0.14, 0.17, 0.03]}>
            <boxGeometry args={[0.075, 0.075, 0.045]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        )}
      </group>

      {tagged && !enclosed && (
        <>
          <ThreadCurve
            points={[[-0.12, 0.2, 0.1], [0.08, 0.32, 0.1], [0.28, 0.25, 0.1]]}
            color={BLUE}
            radius={0.018}
          />
          <mesh position={[0.08, 0.32, 0.11]}>
            <sphereGeometry args={[0.055, 10, 7]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0.28, 0.25, 0.11]}>
            <sphereGeometry args={[0.05, 10, 7]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </>
      )}

      <mesh position={[0.42, 0, 0.05]} rotation={[Math.PI / 2, 0, enclosed ? 0.05 : 0.65]}>
        <torusGeometry args={[0.38, 0.035, 10, 42, enclosed ? Math.PI * 1.94 : Math.PI * 1.45]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
      <mesh position={[0.23, 0.26, 0.11]}>
        <sphereGeometry args={[0.045, 10, 7]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
      {enclosed && [0.19, 0.42, 0.65].map((x, index) => (
        <mesh key={x} position={[x, -0.4 + index * 0.035, 0.08]}>
          <sphereGeometry args={[0.025 + index * 0.006, 9, 6]} />
          <meshStandardMaterial color={index === 1 ? BLUE : PAPER} />
        </mesh>
      ))}
    </group>
  );
}

function DamageSignalObject({ phase }: { phase: number }) {
  const pink1Visible = phase >= 1;
  const parkinVisible = phase >= 2;
  const chargePositions = [-0.18, -0.06, 0.06, 0.18];

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.025, 0.86, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[-0.43, 0.02, 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.45, 0.92, 1]}>
          <torusGeometry args={[0.25, 0.035, 10, 34]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <ThreadCurve points={[[-0.22, 0.08, 0.02], [-0.1, -0.08, 0.02], [0.02, 0.08, 0.02], [0.16, -0.06, 0.02]]} color={BLUE} radius={0.018} />
        {chargePositions.map((x) => (
          <mesh key={x} position={[x, -0.28, 0.04]}>
            <sphereGeometry args={[0.035, 10, 7]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        ))}
        {[[-0.18, 0.28], [0.04, 0.29], [0.22, 0.2]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.04]}>
            <boxGeometry args={[0.055, 0.055, 0.04]} />
            <meshStandardMaterial color={index === 2 ? PAPER : BLUE} />
          </mesh>
        ))}
      </group>

      <group position={[0.43, 0.02, 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.45, 0.92, 1]}>
          <torusGeometry args={[0.25, 0.035, 10, 34, Math.PI * 1.88]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <ThreadCurve points={[[-0.2, 0.08, 0.02], [-0.08, -0.02, 0.02], [0.02, 0.04, 0.02], [0.12, -0.11, 0.02], [0.2, -0.04, 0.02]]} color={PAPER} radius={0.016} />
        {chargePositions.map((x, index) => (
          <mesh key={x} position={[x, -0.28, 0.04]}>
            <sphereGeometry args={[0.035, 10, 7]} />
            <meshStandardMaterial color={index === 0 ? BLUE : PAPER} />
          </mesh>
        ))}
        {pink1Visible && [[-0.23, 0.24], [-0.04, 0.3], [0.17, 0.23]].map(([x, y]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.055]}>
            <boxGeometry args={[0.065, 0.065, 0.045]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        ))}
        {parkinVisible && [[-0.3, 0.08], [0.3, 0.04], [0.22, -0.18]].map(([x, y], index) => (
          <group key={`${x}-${y}`} position={[x, y, 0.07]}>
            <mesh>
              <sphereGeometry args={[0.055, 10, 7]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <mesh position={[0.07, 0.04, 0.02]}>
              <boxGeometry args={[0.045, 0.045, 0.035]} />
              <meshStandardMaterial color={index === 1 ? PAPER : BLUE} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function StressFilterObject({ phase }: { phase: number }) {
  const spread = [0.62, 0.88, 1.18][phase] ?? 1.18;
  const plungerHeight = [0.62, 0.42, 0.25][phase] ?? 0.25;
  const trailCount = [0, 2, 5][phase] ?? 5;

  return (
    <group position={[0.72, -0.82, -0.34]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.82, 0.94, 0.15, 32]} />
        <meshStandardMaterial color="#687b69" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.7, 0.74, 0.06, 32]} />
        <meshStandardMaterial color="#d7ded1" roughness={0.9} />
      </mesh>
      <mesh position={[0.08 + (spread - 0.62) * 0.16, 0.18, 0]} scale={[spread, 0.28, 0.72]}>
        <sphereGeometry args={[0.42, 22, 14]} />
        <meshStandardMaterial color={CLAY} roughness={0.92} flatShading />
      </mesh>

      {[-0.42, -0.2, 0.02, 0.24, 0.46].slice(0, trailCount).map((x, index) => (
        <mesh key={x} position={[x + 0.28, 0.16, 0.08 - index * 0.02]} scale={[0.2 + index * 0.06, 0.08, 0.16]}>
          <sphereGeometry args={[0.25, 12, 8]} />
          <meshStandardMaterial color={CLAY} roughness={1} flatShading />
        </mesh>
      ))}

      <group position={[-0.68, 0, 0]}>
        <mesh position={[0, 0.52, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.92, 10]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
        <mesh position={[0.28, 0.94, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.56, 10]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
        <mesh position={[0.53, plungerHeight + 0.2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.56, 10]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
        <mesh position={[0.53, plungerHeight - 0.07, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 18]} />
          <meshStandardMaterial color={BLUE} roughness={0.9} />
        </mesh>
      </group>

      {[-0.42, 0, 0.42].map((z, index) => (
        <group key={z} position={[0.96, 0, z]}>
          <mesh position={[0, 0.13 + index * 0.09, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.26 + index * 0.18, 8]} />
            <meshStandardMaterial color={index <= phase ? PAPER : BLUE} />
          </mesh>
          <mesh position={[0, 0.28 + index * 0.18, 0]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color={index <= phase ? CLAY : "#819483"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FusionRepairObject({ phase }: { phase: number }) {
  const leftPosition = [-0.42, -0.24, -0.08][phase] ?? -0.08;
  const rightPosition = [0.42, 0.24, 0.08][phase] ?? 0.08;
  const mixed = phase === 2;

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.34, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      {!mixed && (
        <>
          <group position={[leftPosition, 0.08, 0.06]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.38, 0.88, 1]}>
              <torusGeometry args={[0.22, 0.03, 10, 32]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <ThreadCurve points={[[-0.17, 0.03, 0.02], [-0.07, -0.06, 0.02], [0.04, 0.05, 0.02], [0.15, -0.04, 0.02]]} color={phase === 0 ? PAPER : BLUE} radius={0.014} />
            {[-0.09, 0.02].map((x) => (
              <mesh key={x} position={[x, -0.24, 0.03]}>
                <sphereGeometry args={[0.028, 9, 6]} />
                <meshStandardMaterial color={phase === 0 ? PAPER : BLUE} />
              </mesh>
            ))}
          </group>
          <group position={[rightPosition, 0.08, 0.06]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.38, 0.88, 1]}>
              <torusGeometry args={[0.22, 0.03, 10, 32]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
            <ThreadCurve points={[[-0.17, -0.02, 0.02], [-0.06, 0.06, 0.02], [0.05, -0.05, 0.02], [0.16, 0.04, 0.02]]} color={PAPER} radius={0.014} />
            {[-0.08, 0.04, 0.14].map((x) => (
              <mesh key={x} position={[x, -0.24, 0.03]}>
                <sphereGeometry args={[0.028, 9, 6]} />
                <meshStandardMaterial color={BLUE} />
              </mesh>
            ))}
          </group>
          {phase === 1 && (
            <mesh position={[0, 0.08, 0.075]}>
              <boxGeometry args={[0.22, 0.08, 0.06]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          )}
        </>
      )}

      {mixed && (
        <group position={[0, 0.08, 0.06]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[2.35, 0.9, 1]}>
            <torusGeometry args={[0.25, 0.03, 10, 38]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          <ThreadCurve points={[[-0.46, 0.02, 0.02], [-0.27, -0.07, 0.02], [-0.08, 0.05, 0.02], [0.1, -0.05, 0.02], [0.28, 0.06, 0.02], [0.45, -0.02, 0.02]]} color={PAPER} radius={0.015} />
          {[[-0.33, 0.14], [-0.13, -0.1], [0.08, 0.12], [0.31, -0.08]].map(([x, y], index) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.04]}>
              {index % 2 === 0 ? <sphereGeometry args={[0.035, 9, 6]} /> : <boxGeometry args={[0.055, 0.055, 0.035]} />}
              <meshStandardMaterial color={index === 1 ? INK : PAPER} />
            </mesh>
          ))}
          {[-0.18, -0.06, 0.06, 0.18].map((x) => (
            <mesh key={x} position={[x, -0.28, 0.03]}>
              <sphereGeometry args={[0.03, 9, 6]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function FissionTriageObject({ phase }: { phase: number }) {
  const damageMarks: [number, number][] = [[-0.34, 0.12], [-0.27, -0.02], [-0.39, -0.13]];
  const healthyMarks: [number, number][] = [[0.2, 0.11], [0.34, -0.02], [0.25, -0.14]];

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.34, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      {phase === 0 && (
        <group position={[0, 0.07, 0.06]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[2.25, 0.9, 1]}>
            <torusGeometry args={[0.25, 0.03, 10, 38]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <ThreadCurve points={[[-0.45, 0.03, 0.02], [-0.28, -0.06, 0.02], [-0.09, 0.05, 0.02], [0.1, -0.05, 0.02], [0.28, 0.06, 0.02], [0.44, -0.02, 0.02]]} color={PAPER} radius={0.015} />
          {damageMarks.map(([x, y], index) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.04]} rotation={[0, 0, index * 0.4]}>
              <boxGeometry args={[0.06, 0.06, 0.04]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          ))}
          {healthyMarks.map(([x, y]) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.04]}>
              <sphereGeometry args={[0.034, 9, 6]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          ))}
        </group>
      )}

      {phase === 1 && (
        <group position={[0, 0.07, 0.06]}>
          {[-0.22, 0.22].map((x, index) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.55, 0.9, 1]}>
              <torusGeometry args={[0.22, 0.03, 10, 32]} />
              <meshStandardMaterial color={index === 0 ? INK : BLUE} />
            </mesh>
          ))}
          <mesh>
            <boxGeometry args={[0.12, 0.055, 0.05]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          {damageMarks.slice(0, 2).map(([x, y]) => (
            <mesh key={`${x}-${y}`} position={[x + 0.1, y, 0.04]}>
              <boxGeometry args={[0.055, 0.055, 0.04]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          ))}
          {healthyMarks.slice(0, 2).map(([x, y]) => (
            <mesh key={`${x}-${y}`} position={[x - 0.08, y, 0.04]}>
              <sphereGeometry args={[0.032, 9, 6]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          ))}
        </group>
      )}

      {phase === 2 && (
        <group position={[0, 0.07, 0.06]}>
          <group position={[-0.38, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.25, 0.88, 1]}>
              <torusGeometry args={[0.22, 0.03, 10, 30]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            {[[-0.08, 0.08], [0.04, -0.05], [-0.02, -0.14]].map(([x, y], index) => (
              <mesh key={`${x}-${y}`} position={[x, y, 0.04]} rotation={[0, 0, index * 0.45]}>
                <boxGeometry args={[0.058, 0.058, 0.04]} />
                <meshStandardMaterial color={INK} />
              </mesh>
            ))}
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.65, 1.18, 1]}>
              <torusGeometry args={[0.24, 0.018, 8, 32, Math.PI * 1.65]} />
              <meshStandardMaterial color={BLUE} transparent opacity={0.78} />
            </mesh>
          </group>
          <group position={[0.38, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.35, 0.88, 1]}>
              <torusGeometry args={[0.22, 0.03, 10, 30]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
            <ThreadCurve points={[[-0.17, 0.03, 0.02], [-0.06, -0.06, 0.02], [0.05, 0.05, 0.02], [0.16, -0.03, 0.02]]} color={PAPER} radius={0.014} />
            {[-0.12, 0, 0.12].map((x) => (
              <mesh key={x} position={[x, -0.24, 0.03]}>
                <sphereGeometry args={[0.03, 9, 6]} />
                <meshStandardMaterial color={BLUE} />
              </mesh>
            ))}
          </group>
        </group>
      )}
    </group>
  );
}

function SharedPowerObject({ phase }: { phase: number }) {
  const nodePositions: [number, number][] = [[0, 0.34], [-0.48, -0.2], [0.48, -0.2]];
  const visibleNodes = [1, 2, 3][phase] ?? 3;

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.42, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      {phase >= 1 && (
        <>
          <ThreadCurve points={[[0, 0.29, 0.03], [-0.43, -0.15, 0.03]]} color={INK} radius={0.014} />
          {phase === 2 && (
            <>
              <ThreadCurve points={[[0, 0.29, 0.03], [0.43, -0.15, 0.03]]} color={INK} radius={0.014} />
              <ThreadCurve points={[[-0.41, -0.2, 0.03], [0.41, -0.2, 0.03]]} color={BLUE} radius={0.014} />
              {[[-0.22, 0.08], [0.22, 0.08], [0, -0.2]].map(([x, y], index) => (
                <mesh key={`${x}-${y}`} position={[x, y, 0.06]} rotation={[0, 0, index * 0.55]}>
                  <boxGeometry args={[0.11, 0.035, 0.035]} />
                  <meshStandardMaterial color={index === 2 ? INK : BLUE} />
                </mesh>
              ))}
            </>
          )}
        </>
      )}

      {nodePositions.slice(0, visibleNodes).map(([x, y], index) => (
        <group key={`${x}-${y}`} position={[x, y, 0.07]}>
          {index === 0 && (
            <>
              <mesh>
                <boxGeometry args={[0.34, 0.22, 0.08]} />
                <meshStandardMaterial color={PAPER} />
              </mesh>
              {[-0.07, 0, 0.07].map((lineY) => (
                <mesh key={lineY} position={[0, lineY, 0.055]}>
                  <boxGeometry args={[0.2, 0.018, 0.018]} />
                  <meshStandardMaterial color={index === phase ? BLUE : INK} />
                </mesh>
              ))}
            </>
          )}
          {index === 1 && (
            <>
              <mesh>
                <cylinderGeometry args={[0.13, 0.15, 0.23, 12]} />
                <meshStandardMaterial color={BLUE} />
              </mesh>
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.13, 10]} />
                <meshStandardMaterial color={INK} />
              </mesh>
            </>
          )}
          {index === 2 && (
            <>
              <mesh position={[0, -0.08, 0]}>
                <boxGeometry args={[0.38, 0.045, 0.08]} />
                <meshStandardMaterial color={INK} />
              </mesh>
              {[-0.12, 0, 0.12].map((columnX) => (
                <mesh key={columnX} position={[columnX, 0.04, 0]}>
                  <boxGeometry args={[0.045, 0.22, 0.06]} />
                  <meshStandardMaterial color={PAPER} />
                </mesh>
              ))}
              <mesh position={[0, 0.18, 0]}>
                <boxGeometry args={[0.38, 0.045, 0.08]} />
                <meshStandardMaterial color={BLUE} />
              </mesh>
            </>
          )}
        </group>
      ))}

      <mesh position={[0, -0.02, 0.08]}>
        <sphereGeometry args={[0.09, 14, 10]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
    </group>
  );
}

function SelfModelObject({ phase }: { phase: number }) {
  const traceDots: [number, number][] = [[-0.4, 0.22], [-0.25, 0.08], [-0.08, 0.2], [0.1, 0.04], [0.27, 0.2]];

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[-0.5, -0.03, 0.06]}>
        {[0, 1, 2].map((card) => (
          <group key={card} position={[card * 0.055, card * 0.055, card * 0.012]} rotation={[0, 0, -0.05 + card * 0.035]}>
            <mesh>
              <boxGeometry args={[0.36, 0.46, 0.035]} />
              <meshStandardMaterial color={card === 2 ? PAPER : PALE} />
            </mesh>
            {card === 2 && [-0.11, -0.02, 0.07].map((lineY, index) => (
              <mesh key={lineY} position={[0, lineY, 0.025]}>
                <boxGeometry args={[index === 2 ? 0.17 : 0.23, 0.018, 0.014]} />
                <meshStandardMaterial color={index === phase ? BLUE : INK} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {phase >= 1 && (
        <>
          <ThreadCurve points={[[-0.29, 0.02, 0.04], [-0.08, 0.18, 0.04], [0.14, 0.05, 0.04], [0.32, 0.22, 0.04]]} color={INK} radius={0.012} />
          {traceDots.slice(0, phase === 1 ? 3 : 5).map(([x, y], index) => (
            <mesh key={`${x}-${y}`} position={[x + 0.18, y, 0.065]}>
              <sphereGeometry args={[0.028 + index * 0.003, 9, 6]} />
              <meshStandardMaterial color={index % 2 === 0 ? BLUE : INK} />
            </mesh>
          ))}
        </>
      )}

      {phase === 2 && (
        <group position={[0.4, 0.02, 0.07]}>
          <ThreadCurve points={[[0, 0.36, 0], [0.38, -0.3, 0], [-0.38, -0.3, 0], [0, 0.36, 0]]} color={BLUE} radius={0.022} />
          <mesh position={[0, -0.02, 0.02]}>
            <circleGeometry args={[0.115, 20]} />
            <meshStandardMaterial color={PAPER} />
          </mesh>
          <mesh position={[-0.015, -0.02, 0.04]}>
            <circleGeometry args={[0.038, 16]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          {[[-0.18, 0.16], [0.17, 0.13], [-0.15, -0.18], [0.16, -0.16]].map(([x, y], index) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.035]}>
              {index % 2 === 0 ? <sphereGeometry args={[0.028, 9, 6]} /> : <boxGeometry args={[0.05, 0.05, 0.03]} />}
              <meshStandardMaterial color={index === 3 ? INK : BLUE} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function OtherMindsObject({ phase }: { phase: number }) {
  const traces: [number, number][] = [[-0.42, 0.2], [-0.27, 0.06], [-0.39, -0.13]];

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <mesh position={[0.08, 0, 0.04]}>
        <boxGeometry args={[0.1, 0.82, 0.08]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      {traces.slice(0, phase + 1).map(([x, y], index) => (
        <group key={`${x}-${y}`} position={[x, y, 0.07]}>
          <mesh>
            {index === 1 ? <boxGeometry args={[0.09, 0.09, 0.035]} /> : <sphereGeometry args={[0.045, 10, 7]} />}
            <meshStandardMaterial color={index === phase ? BLUE : INK} />
          </mesh>
          {index > 0 && (
            <ThreadCurve points={[[0.04, 0.03, 0], [0.13, 0.1, 0], [0.18, 0.04, 0]]} color={BLUE} radius={0.01} />
          )}
        </group>
      ))}

      <group position={[0.45, 0.01, 0.06]}>
        <ThreadCurve
          points={[[0, 0.34, 0], [0.31, -0.28, 0], [-0.31, -0.28, 0], [0, 0.34, 0]]}
          color={phase === 2 ? BLUE : INK}
          radius={phase === 2 ? 0.022 : 0.012}
        />
        <mesh position={[0, -0.02, 0.02]}>
          <circleGeometry args={[0.1, 20]} />
          <meshStandardMaterial color={PAPER} transparent opacity={phase === 0 ? 0.38 : 1} />
        </mesh>
        {phase >= 1 && (
          <mesh position={[phase === 1 ? 0.025 : -0.015, -0.02, 0.04]}>
            <circleGeometry args={[0.032, 16]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        )}
        {phase < 2 && (
          <ThreadCurve points={[[0.13, 0.22, 0.025], [0.22, 0.05, 0.025], [0.15, -0.12, 0.025]]} color={BLUE} radius={0.01} />
        )}
      </group>

      {phase === 2 && (
        <ThreadCurve points={[[-0.31, 0.2, 0.04], [-0.12, 0.28, 0.04], [0.03, 0.16, 0.04]]} color={BLUE} radius={0.012} />
      )}
    </group>
  );
}

function JointAttentionObject({ phase }: { phase: number }) {
  const observers: [number, number][] = [[-0.48, 0.12], [0.48, 0.12]];

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      {observers.map(([x, y], index) => (
        <group key={x} position={[x, y, 0.06]}>
          <mesh>
            <circleGeometry args={[0.13, 24]} />
            <meshStandardMaterial color={PAPER} />
          </mesh>
          <mesh position={[index === 0 ? 0.035 : -0.035, -0.005, 0.025]}>
            <circleGeometry args={[0.04, 16]} />
            <meshStandardMaterial color={index === 0 ? BLUE : INK} />
          </mesh>
        </group>
      ))}

      <group position={[0, -0.18, 0.07]}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0, -0.12, -0.01]}>
          <cylinderGeometry args={[0.025, 0.045, 0.16, 10]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>

      <ThreadCurve points={[[-0.37, 0.08, 0.04], [-0.19, -0.03, 0.04], [-0.07, -0.12, 0.04]]} color={BLUE} radius={0.012} />
      {phase >= 1 && (
        <ThreadCurve points={[[0.37, 0.08, 0.04], [0.19, -0.03, 0.04], [0.07, -0.12, 0.04]]} color={INK} radius={0.012} />
      )}
      {phase === 2 && (
        <>
          <ThreadCurve points={[[-0.35, 0.2, 0.04], [0, 0.32, 0.04], [0.35, 0.2, 0.04]]} color={BLUE} radius={0.012} />
          {[[-0.25, 0.27], [0, 0.32], [0.25, 0.27]].map(([x, y], index) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.065]}>
              <sphereGeometry args={[0.025, 9, 6]} />
              <meshStandardMaterial color={index === 1 ? INK : BLUE} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

function WordReferenceObject({ phase }: { phase: number }) {
  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[0.48, 0.23, 0.06]}>
        <mesh>
          <circleGeometry args={[0.13, 24]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.04, -0.025, 0.025]}>
          <circleGeometry args={[0.04, 16]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>

      <mesh position={[-0.4, -0.2, 0.07]} rotation={[0.1, 0.18, -0.1]}>
        <boxGeometry args={[0.18, 0.18, 0.16]} />
        <meshStandardMaterial color={INK} transparent opacity={phase === 2 ? 0.35 : 1} />
      </mesh>
      <group position={[0, -0.19, 0.07]}>
        <mesh>
          <sphereGeometry args={[0.12, 16, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        {phase === 2 && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.016, 8, 32]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        )}
      </group>
      <group position={[0.4, -0.2, 0.07]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.12, 0.2, 12]} />
          <meshStandardMaterial color={PAPER} transparent opacity={phase === 2 ? 0.45 : 1} />
        </mesh>
      </group>

      {phase >= 1 && (
        <ThreadCurve points={[[0.38, 0.18, 0.04], [0.2, 0.04, 0.04], [0.06, -0.12, 0.04]]} color={BLUE} radius={0.012} />
      )}
      {phase === 2 && (
        <>
          {[0, 1, 2, 3].map((index) => (
            <mesh key={index} position={[-0.34 + index * 0.12, 0.17 - index * 0.065, 0.07]}>
              <sphereGeometry args={[0.025 + index * 0.003, 9, 6]} />
              <meshStandardMaterial color={index === 3 ? INK : BLUE} />
            </mesh>
          ))}
          <ThreadCurve points={[[-0.36, 0.17, 0.04], [-0.22, 0.1, 0.04], [-0.08, -0.08, 0.04]]} color={INK} radius={0.01} />
        </>
      )}
    </group>
  );
}

function CrossSituationalObject({ phase }: { phase: number }) {
  const scenes = [
    { x: -0.4, distractor: 'cube' as const },
    { x: 0.4, distractor: 'cone' as const },
  ];

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      {scenes.map((scene, index) => (
        <group
          key={scene.x}
          position={[scene.x, -0.02, 0.04]}
          visible={index === 0 || phase >= 1}
        >
          <mesh position={[0, 0, -0.01]}>
            <boxGeometry args={[0.62, 0.62, 0.035]} />
            <meshStandardMaterial color={PAPER} />
          </mesh>
          <mesh position={[-0.13, -0.12, 0.055]}>
            <sphereGeometry args={[0.095, 16, 10]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          <mesh position={[0.15, -0.12, 0.055]} rotation={[0.08, 0.12, -0.06]}>
            {scene.distractor === 'cube'
              ? <boxGeometry args={[0.15, 0.15, 0.12]} />
              : <coneGeometry args={[0.09, 0.18, 12]} />}
            <meshStandardMaterial color={INK} transparent opacity={phase === 2 ? 0.22 : 0.8} />
          </mesh>
          {[0, 1, 2].map((dot) => (
            <mesh key={dot} position={[-0.08 + dot * 0.08, 0.19, 0.055]}>
              <sphereGeometry args={[0.025, 9, 6]} />
              <meshStandardMaterial color={dot === 1 ? BLUE : INK} />
            </mesh>
          ))}
        </group>
      ))}

      {phase === 2 && (
        <>
          <ThreadCurve points={[[-0.53, -0.14, 0.1], [-0.13, 0.3, 0.1], [0.27, -0.14, 0.1]]} color={BLUE} radius={0.014} />
          <mesh position={[-0.13, 0.3, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.075, 0.014, 8, 24]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        </>
      )}
    </group>
  );
}

function ShapeBiasObject({ phase }: { phase: number }) {
  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[0, 0.2, 0.07]} rotation={[0.06, 0.12, 0]}>
        <mesh>
          <coneGeometry args={[0.13, 0.26, 12]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        {[0, 1, 2].map((dot) => (
          <mesh key={dot} position={[-0.08 + dot * 0.08, 0.19, 0]}>
            <sphereGeometry args={[0.022, 9, 6]} />
            <meshStandardMaterial color={dot === 1 ? BLUE : INK} />
          </mesh>
        ))}
      </group>

      {phase >= 1 && (
        <>
          <group position={[-0.34, -0.2, 0.07]} rotation={[0.06, -0.12, 0]}>
            <mesh>
              <coneGeometry args={[0.13, 0.26, 12]} />
              <meshStandardMaterial color={PAPER} />
            </mesh>
            <mesh position={[0, 0, -0.025]}>
              <coneGeometry args={[0.15, 0.29, 12]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <mesh position={[0, 0, 0.005]}>
              <coneGeometry args={[0.12, 0.25, 12]} />
              <meshStandardMaterial color={PAPER} />
            </mesh>
          </group>
          <mesh position={[0.36, -0.2, 0.07]}>
            <sphereGeometry args={[0.13, 16, 10]} />
            <meshStandardMaterial color={BLUE} transparent opacity={phase === 2 ? 0.24 : 1} />
          </mesh>
        </>
      )}

      {phase === 2 && (
        <>
          <ThreadCurve points={[[-0.02, 0.1, 0.08], [-0.18, -0.02, 0.08], [-0.31, -0.13, 0.08]]} color={BLUE} radius={0.014} />
          <mesh position={[-0.34, -0.2, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.19, 0.014, 8, 28]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </>
      )}
    </group>
  );
}

function MaterialBiasObject({ phase }: { phase: number }) {
  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[-0.34, 0.08, 0.06]}>
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.13, 0.16, 0.34, 16]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[0, 0.02, 0.045]} scale={[0.82, 1.25, 0.7]}>
          <sphereGeometry args={[0.12, 16, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0, 0.15, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.012, 8, 24]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>

      {phase >= 1 && (
        <>
          <group position={[-0.08, -0.24, 0.06]}>
            <mesh>
              <cylinderGeometry args={[0.22, 0.25, 0.11, 18]} />
              <meshStandardMaterial color={PAPER} />
            </mesh>
            <mesh position={[0, 0.055, 0.045]} scale={[1.6, 0.45, 0.9]}>
              <sphereGeometry args={[0.12, 16, 10]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
            <mesh position={[0, 0.06, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.22, 0.012, 8, 28]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          </group>
          <mesh position={[0.42, 0.08, 0.07]} scale={[0.82, 1.25, 0.7]}>
            <sphereGeometry args={[0.12, 16, 10]} />
            <meshStandardMaterial color={INK} transparent opacity={phase === 2 ? 0.24 : 0.9} />
          </mesh>
        </>
      )}

      {phase === 2 && (
        <>
          <ThreadCurve points={[[-0.3, 0.01, 0.11], [-0.23, -0.1, 0.11], [-0.11, -0.18, 0.11]]} color={BLUE} radius={0.014} />
          <mesh position={[-0.08, -0.19, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.29, 0.014, 8, 30]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </>
      )}
    </group>
  );
}

function SyntaxCueObject({ phase }: { phase: number }) {
  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[0, 0.02, 0.025]}>
        <boxGeometry args={[0.018, 0.7, 0.025]} />
        <meshStandardMaterial color={INK} transparent opacity={0.25} />
      </mesh>

      <group position={[-0.38, 0.02, 0.07]}>
        <mesh position={[-0.055, 0.26, 0]}>
          <sphereGeometry args={[0.025, 9, 6]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.025, 0.26, 0]}>
          <sphereGeometry args={[0.025, 9, 6]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <coneGeometry args={[0.16, 0.31, 14]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      </group>

      {phase >= 1 && (
        <group position={[0.38, 0.02, 0.07]}>
          {[-0.08, 0, 0.08].map((x, index) => (
            <mesh key={x} position={[x, 0.26 + (index === 1 ? 0.015 : 0), 0]}>
              <sphereGeometry args={[0.022, 9, 6]} />
              <meshStandardMaterial color={index === 1 ? BLUE : INK} />
            </mesh>
          ))}
          <mesh position={[0, -0.12, 0]} scale={[1.55, 0.48, 0.82]}>
            <sphereGeometry args={[0.17, 18, 11]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          {[-0.12, 0, 0.12].map((x, index) => (
            <mesh key={x} position={[x, 0.01 + (index % 2) * 0.035, 0.015]} scale={[0.7, 1, 0.7]}>
              <sphereGeometry args={[0.045, 10, 7]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          ))}
        </group>
      )}

      {phase === 2 && (
        <>
          <ThreadCurve points={[[ -0.405, 0.24, 0.1], [-0.45, 0.1, 0.1], [-0.39, -0.02, 0.1]]} color={BLUE} radius={0.012} />
          <ThreadCurve points={[[0.38, 0.24, 0.1], [0.45, 0.1, 0.1], [0.39, -0.02, 0.1]]} color={BLUE} radius={0.012} />
          <mesh position={[-0.38, -0.08, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.22, 0.013, 8, 28]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          <mesh position={[0.38, -0.08, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.25, 0.013, 8, 28]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </>
      )}
    </group>
  );
}

function CueWeightingObject({ phase }: { phase: number }) {
  const beamRotation = phase === 0 ? 0 : phase === 1 ? -0.1 : -0.2;

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[0, -0.05, 0.07]}>
        <mesh position={[0, -0.2, 0]}>
          <coneGeometry args={[0.13, 0.25, 3]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <group rotation={[0, 0, beamRotation]}>
          <mesh>
            <boxGeometry args={[1.05, 0.035, 0.045]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[-0.42, 0.08, 0]}>
            <boxGeometry args={[0.3, 0.02, 0.04]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0.42, 0.08, 0]}>
            <boxGeometry args={[0.3, 0.02, 0.04]} />
            <meshStandardMaterial color={INK} />
          </mesh>

          <group position={[-0.42, 0.15, 0.02]}>
            {[-0.075, 0, 0.075].map((x, index) => (
              <mesh key={x} position={[x, index === 1 ? 0.025 : 0, 0]}>
                <sphereGeometry args={[0.026, 9, 6]} />
                <meshStandardMaterial color={index === 1 ? BLUE : INK} />
              </mesh>
            ))}
            {phase >= 1 && (
              <mesh position={[0, 0.105, 0]}>
                <sphereGeometry args={[0.034, 10, 7]} />
                <meshStandardMaterial color={BLUE} />
              </mesh>
            )}
            {phase === 2 && (
              <mesh position={[0, 0.185, 0]}>
                <sphereGeometry args={[0.034, 10, 7]} />
                <meshStandardMaterial color={BLUE} />
              </mesh>
            )}
          </group>

          <group position={[0.42, 0.18, 0.02]}>
            <mesh position={[-0.07, 0, 0]}>
              <coneGeometry args={[0.055, 0.11, 10]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
            <mesh position={[0.07, 0, 0]}>
              <boxGeometry args={[0.09, 0.09, 0.07]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          </group>
        </group>
      </group>

      {phase === 2 && (
        <ThreadCurve points={[[ -0.42, 0.31, 0.11], [-0.28, 0.4, 0.11], [0.03, 0.38, 0.11]]} color={BLUE} radius={0.014} />
      )}
    </group>
  );
}

function PredictionErrorObject({ phase }: { phase: number }) {
  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[-0.28, 0.1, 0.07]}>
        {[-0.34, -0.17, 0].map((x, index) => (
          <mesh key={x} position={[x, 0, 0]}>
            <sphereGeometry args={[0.055, 12, 8]} />
            <meshStandardMaterial color={index === 2 ? BLUE : INK} />
          </mesh>
        ))}
        <ThreadCurve points={[[-0.34, 0, 0], [-0.17, 0, 0], [0, 0, 0], [0.24, 0, 0]]} color={INK} radius={0.012} />
        <mesh position={[0.28, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.018, 8, 28]} />
          <meshStandardMaterial color={INK} transparent opacity={phase === 0 ? 0.9 : 0.22} />
        </mesh>
      </group>

      {phase >= 1 && (
        <group position={[0.38, -0.16, 0.08]}>
          <mesh rotation={[0, 0, 0.14]}>
            <coneGeometry args={[0.16, 0.3, 3]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          <ThreadCurve points={[[-0.3, 0.2, 0.02], [-0.2, 0.07, 0.02], [-0.08, 0.12, 0.02], [0, 0.02, 0.02]]} color={BLUE} radius={0.016} />
        </group>
      )}

      {phase === 2 && (
        <>
          <mesh position={[-0.01, 0.1, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.015, 8, 32, Math.PI * 1.4]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          {[[-0.15, -0.2], [0.02, -0.29], [0.18, -0.25]].map(([x, y]) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.09]}>
              <sphereGeometry args={[0.025, 9, 6]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

function LatentCauseObject({ phase }: { phase: number }) {
  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[-0.28, 0, 0.07]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.31, 0.018, 8, 40]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        {[[-0.11, 0.07], [0.02, 0.12], [0.1, -0.04]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.02]}>
            {index === 2 ? <boxGeometry args={[0.09, 0.09, 0.07]} /> : <sphereGeometry args={[0.045, 10, 7]} />}
            <meshStandardMaterial color={index === 1 ? BLUE : INK} />
          </mesh>
        ))}
      </group>

      <mesh position={[phase === 0 ? 0.2 : 0.38, -0.04, 0.09]} rotation={[0, 0, 0.1]}>
        <coneGeometry args={[0.105, 0.2, 3]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>

      {phase >= 1 && (
        <group position={[0.38, -0.04, 0.07]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[phase === 1 ? 0.17 : 0.29, 0.018, 8, 40]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </group>
      )}

      {phase === 2 && (
        <>
          <ThreadCurve points={[[0.02, 0.16, 0.1], [0.12, 0.27, 0.1], [0.25, 0.22, 0.1]]} color={BLUE} radius={0.014} />
          {[[-0.48, -0.22], [0.5, 0.16], [0.52, -0.22]].map(([x, y]) => (
            <mesh key={`${x}-${y}`} position={[x, y, 0.09]}>
              <sphereGeometry args={[0.025, 9, 6]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

function CompositionalityObject({ phase }: { phase: number }) {
  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[-0.38, 0.18, 0.07]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.48, 0.32, 0.04]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.09, 0, 0.035]}>
          <coneGeometry args={[0.065, 0.13, 3]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.1, 0, 0.035]}>
          <boxGeometry args={[0.14, 0.025, 0.035]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>

      <group position={[0.38, 0.18, 0.07]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.48, 0.32, 0.04]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.09, 0, 0.035]}>
          <boxGeometry args={[0.1, 0.1, 0.07]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0.1, 0, 0.035]}>
          <boxGeometry args={[0.025, 0.14, 0.035]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      </group>

      {phase >= 1 && (
        <>
          <ThreadCurve points={[[-0.47, 0.08, 0.11], [-0.37, -0.03, 0.11], [-0.18, -0.08, 0.11]]} color={BLUE} radius={0.014} />
          <ThreadCurve points={[[0.48, 0.08, 0.11], [0.38, -0.03, 0.11], [0.18, -0.08, 0.11]]} color={BLUE} radius={0.014} />
        </>
      )}

      {phase === 2 && (
        <group position={[0, -0.18, 0.08]}>
          <mesh position={[0, 0, -0.015]}>
            <boxGeometry args={[0.52, 0.28, 0.04]} />
            <meshStandardMaterial color={PAPER} />
          </mesh>
          <mesh position={[-0.1, 0, 0.035]}>
            <coneGeometry args={[0.065, 0.13, 3]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          <mesh position={[0.1, 0, 0.035]}>
            <boxGeometry args={[0.025, 0.14, 0.035]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.012, 8, 30, Math.PI]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function EmergenceObject({ phase }: { phase: number }) {
  const layouts = [
    [
      [-0.58, 0.24, -0.2], [-0.3, 0.08, -1.05], [0.02, 0.3, 0.35],
      [0.46, 0.2, -1.7], [-0.52, -0.12, -2.2], [-0.12, -0.2, -0.65],
      [0.28, -0.1, 0.8], [0.56, -0.22, -1.2],
    ],
    [
      [-0.48, 0.18, -1.15], [-0.27, 0.08, -1.35], [-0.04, 0.22, -1.05],
      [0.18, 0.12, -1.3], [-0.38, -0.14, -1.45], [-0.12, -0.09, -1.15],
      [0.18, -0.12, -1.4], [0.43, -0.03, -1.2],
    ],
    [
      [-0.5, -0.12, -1.16], [-0.34, 0.02, -1.2], [-0.16, 0.13, -1.24],
      [0.04, 0.2, -1.3], [0.24, 0.19, -1.38], [0.42, 0.1, -1.45],
      [0.56, -0.04, -1.52], [0.08, -0.06, -1.35],
    ],
  ] as const;
  const birds = layouts[phase] ?? layouts[2];

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      {phase === 1 && (
        <mesh position={[-0.12, -0.09, 0.045]}>
          <ringGeometry args={[0.17, 0.183, 36]} />
          <meshStandardMaterial color="#9aaeff" />
        </mesh>
      )}

      {phase === 2 && (
        <>
          <ThreadCurve points={[[-0.61, -0.24, 0.04], [-0.12, 0.28, 0.04], [0.62, 0.04, 0.04]]} color="#a9b9ff" radius={0.009} />
          <ThreadCurve points={[[-0.48, -0.28, 0.04], [0.04, 0.12, 0.04], [0.56, -0.14, 0.04]]} color="#d0d8ff" radius={0.007} />
        </>
      )}

      {birds.map(([x, y, rotation], index) => (
        <group key={`${x}-${y}`} position={[x, y, 0.09]} rotation={[0, 0, rotation]}>
          <mesh>
            <coneGeometry args={[0.052, 0.135, 3]} />
            <meshStandardMaterial color={index === 3 || index === 7 ? BLUE : INK} />
          </mesh>
          <mesh position={[0, -0.045, 0.035]}>
            <sphereGeometry args={[0.012, 7, 6]} />
            <meshStandardMaterial color={PAPER} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ContinuityObject({ phase }: { phase: number }) {
  const replacementCount = phase === 0 ? 0 : phase === 1 ? 3 : 7;
  const planks = [
    [-0.48, 0.01, -0.2], [-0.32, -0.05, -0.13], [-0.16, -0.09, -0.05],
    [0, -0.11, 0], [0.16, -0.09, 0.05], [0.32, -0.05, 0.13], [0.48, 0.01, 0.2],
  ] as const;

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <group position={[0, -0.02, 0.08]}>
        {planks.map(([x, y, rotation], index) => (
          <mesh key={x} position={[x, y, 0]} rotation={[0, 0, rotation]}>
            <boxGeometry args={[0.155, 0.24, 0.055]} />
            <meshStandardMaterial color={index < replacementCount ? BLUE : INK} />
          </mesh>
        ))}
        <ThreadCurve points={[[-0.6, -0.16, 0.035], [0, -0.29, 0.035], [0.6, -0.16, 0.035]]} color={INK} radius={0.014} />
        <mesh position={[0.03, 0.25, 0]}>
          <boxGeometry args={[0.025, 0.58, 0.04]} />
          <meshStandardMaterial color={phase === 2 ? BLUE : INK} />
        </mesh>
        <mesh position={[0.2, 0.3, 0.01]} rotation={[0, 0, -0.75]}>
          <coneGeometry args={[0.14, 0.32, 3]} />
          <meshStandardMaterial color={phase === 2 ? BLUE : PAPER} />
        </mesh>
      </group>

      {phase >= 1 && [0, 1, 2].slice(0, phase === 1 ? 2 : 3).map((index) => (
        <mesh key={index} position={[-0.48 + index * 0.16, -0.31 + index * 0.015, 0.1]} rotation={[0, 0, -0.16 + index * 0.12]}>
          <boxGeometry args={[0.13, 0.045, 0.035]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}
    </group>
  );
}

function HysteresisObject({ phase }: { phase: number }) {
  const ballPosition = phase === 0
    ? [-0.43, -0.14]
    : phase === 1
      ? [0, 0.2]
      : [0.43, -0.14];

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[1.46, 0.025, 0.035]} />
        <meshStandardMaterial color={INK} />
      </mesh>

      <ThreadCurve
        points={[[-0.72, 0.2, 0.04], [-0.58, -0.03, 0.04], [-0.42, -0.2, 0.04], [0, 0.22, 0.04], [0.42, -0.2, 0.04], [0.58, -0.03, 0.04], [0.72, 0.2, 0.04]]}
        color={INK}
        radius={0.018}
      />
      {[[-0.43, -0.14], [0.43, -0.14]].map(([x, y]) => (
        <mesh key={x} position={[x, y, 0.055]}>
          <ringGeometry args={[0.08, 0.09, 32]} />
          <meshStandardMaterial color="#c8d2ff" />
        </mesh>
      ))}
      <mesh position={[ballPosition[0], ballPosition[1], 0.11]}>
        <sphereGeometry args={[0.085, 18, 14]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>

      {phase === 1 && (
        <ThreadCurve points={[[-0.5, -0.06, 0.08], [-0.3, 0.08, 0.08], [-0.09, 0.17, 0.08]]} color={BLUE} radius={0.012} />
      )}
      {phase === 2 && (
        <>
          <ThreadCurve points={[[0.62, 0.08, 0.08], [0.48, 0.02, 0.08], [0.31, 0.03, 0.08]]} color={BLUE} radius={0.012} />
          <mesh position={[0.28, 0.03, 0.09]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.04, 0.09, 3]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </>
      )}
    </group>
  );
}

function CriticalSlowingObject({ phase }: { phase: number }) {
  const ball = useRef<THREE.Mesh>(null);
  const damping = [1.55, 0.68, 0.22][phase] ?? 0.22;
  const trailCount = 3 + phase * 2;

  useFrame(({ clock }) => {
    if (!ball.current) return;
    const elapsed = clock.elapsedTime % 4.8;
    const x = 0.56 * Math.exp(-damping * elapsed) * Math.cos(elapsed * 4.2);
    ball.current.position.x = x;
    ball.current.position.y = -0.19 + 0.7 * x * x;
    ball.current.rotation.z += 0.025;
  });

  return (
    <group position={[0.76, -0.04, -0.42]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.72, 1.04, 0.06]} />
        <meshStandardMaterial color={PALE} />
      </mesh>
      <ThreadCurve
        points={[[-0.72, 0.23, 0.04], [-0.5, -0.02, 0.04], [-0.25, -0.16, 0.04], [0, -0.21, 0.04], [0.25, -0.16, 0.04], [0.5, -0.02, 0.04], [0.72, 0.23, 0.04]]}
        color={INK}
        radius={0.018}
      />
      <mesh position={[0, -0.19, 0.055]}>
        <ringGeometry args={[0.075, 0.086, 28]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      {Array.from({ length: trailCount }, (_, index) => {
        const persistence = 0.55 + phase * 0.13;
        const x = 0.53 * Math.pow(persistence, index) * (index % 2 === 0 ? 1 : -1);
        return (
          <mesh key={index} position={[x, -0.19 + 0.7 * x * x, 0.07]}>
            <ringGeometry args={[0.026, 0.034, 18]} />
            <meshStandardMaterial color="#a8b8ff" />
          </mesh>
        );
      })}
      <mesh ref={ball} position={[0.56, 0.03, 0.11]}>
        <sphereGeometry args={[0.085, 18, 14]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
      <mesh position={[0, -0.36, 0.03]}>
        <boxGeometry args={[0.025, 0.18, 0.025]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
    </group>
  );
}

export function LessonObject({ lesson, phase }: { lesson: number; phase: number }) {
  if (lesson === 0) return <StudioPainting phase={phase} />;

  if (lesson === 6) return <ThreadingObject phase={phase} />;

  if (lesson === 7) return <MemoryRecordObject phase={phase} />;

  if (lesson === 8) return <ParallaxObject phase={phase} />;

  if (lesson === 9) return <MeanderObject phase={phase} />;

  if (lesson === 10) return <CoolingColumnsObject phase={phase} />;

  if (lesson === 11) return <CapillaryObject phase={phase} />;

  if (lesson === 12) return <TranspirationObject phase={phase} />;

  if (lesson === 13) return <EntropyObject phase={phase} />;

  if (lesson === 14) return <LocalOrderObject phase={phase} />;

  if (lesson === 15) return <EnergyBudgetObject phase={phase} />;

  if (lesson === 16) return <CargoTagObject phase={phase} />;

  if (lesson === 17) return <DamageSignalObject phase={phase} />;

  if (lesson === 18) return <StressFilterObject phase={phase} />;

  if (lesson === 19) return <FusionRepairObject phase={phase} />;

  if (lesson === 20) return <FissionTriageObject phase={phase} />;

  if (lesson === 21) return <SharedPowerObject phase={phase} />;

  if (lesson === 22) return <SelfModelObject phase={phase} />;

  if (lesson === 23) return <OtherMindsObject phase={phase} />;

  if (lesson === 24) return <JointAttentionObject phase={phase} />;

  if (lesson === 25) return <WordReferenceObject phase={phase} />;

  if (lesson === 26) return <CrossSituationalObject phase={phase} />;

  if (lesson === 27) return <ShapeBiasObject phase={phase} />;

  if (lesson === 28) return <MaterialBiasObject phase={phase} />;

  if (lesson === 29) return <SyntaxCueObject phase={phase} />;

  if (lesson === 30) return <CueWeightingObject phase={phase} />;

  if (lesson === 31) return <PredictionErrorObject phase={phase} />;

  if (lesson === 32) return <LatentCauseObject phase={phase} />;

  if (lesson === 33) return <CompositionalityObject phase={phase} />;

  if (lesson === 34) return <EmergenceObject phase={phase} />;

  if (lesson === 35) return <ContinuityObject phase={phase} />;

  if (lesson === 36) return <HysteresisObject phase={phase} />;

  if (lesson === 37) return <CriticalSlowingObject phase={phase} />;

  if (lesson === 1) {
    return (
      <group position={[0.9, -0.18, -0.4]}>
        <mesh position={[-0.36, 0.16, 0]}>
          <boxGeometry args={[0.09, 0.58, 0.09]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[-0.46, -0.12, 0.02]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        {phase >= 1 && [0.3, 0.62, 0.42].map((height, index) => (
          <mesh key={height} position={[(index - 0.3) * 0.27, height / 2 - 0.12, 0]}>
            <boxGeometry args={[0.11, height, 0.11]} />
            <meshStandardMaterial color={index === 1 ? BLUE : INK} />
          </mesh>
        ))}
        {phase >= 2 && (
          <mesh position={[0.05, 0.56, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.62, 0.035, 10, 40, Math.PI * 1.72]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        )}
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[1.3, 0.08, 0.45]} />
          <meshStandardMaterial color={PALE} />
        </mesh>
      </group>
    );
  }

  if (lesson === 2) {
    return (
      <group position={[0.92, -0.43, -0.35]}>
        <mesh position={[0, -0.42, 0]}>
          <boxGeometry args={[1.45, 0.08, 0.65]} />
          <meshStandardMaterial color={PALE} />
        </mesh>
        {phase === 0 && (
          <group>
            <mesh position={[-0.63, -0.26, 0]}>
              <boxGeometry args={[0.12, 0.12, 0.12]} />
              <meshStandardMaterial color="#b8c6ff" />
            </mesh>
            <mesh position={[-0.47, -0.24, 0]}>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial color="#7894ff" />
            </mesh>
          </group>
        )}
        <mesh
          position={[phase === 0 ? -0.2 : -0.46, phase >= 2 ? -0.23 : -0.22, 0]}
          rotation={[0, 0, phase >= 2 ? 0.78 : 0]}
        >
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        {phase >= 1 && (
          <mesh position={[0.02, 0.03, 0]}>
            <boxGeometry args={[0.28, 0.94, 0.28]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        )}
        {phase >= 2 && (
          <group position={[0.54, 0.02, 0]}>
            <mesh position={[0, -0.04, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.72, 8]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <mesh position={[0.13, 0.23, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.14, 0.28, 3]} />
              <meshStandardMaterial color={PAPER} />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  if (lesson === 3) {
    return (
      <group position={[0.78, -0.25, -0.42]}>
        {[-0.45, 0, 0.45].map((x, index) => (
          <group key={x} position={[x, 0, index * -0.06]}>
            <mesh position={[0, 0.38, 0]}>
              <sphereGeometry args={[0.15, 20, 20]} />
              <meshStandardMaterial color={index === 1 ? BLUE : INK} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <capsuleGeometry args={[0.11, 0.32, 8, 14]} />
              <meshStandardMaterial color={index === 1 ? BLUE : INK} />
            </mesh>
            {phase >= 1 && (
              <mesh position={[0, 0.75 + index * 0.04, 0]}>
                {index === 0
                  ? <sphereGeometry args={[0.07, 12, 10]} />
                  : index === 1
                    ? <octahedronGeometry args={[0.09]} />
                    : <boxGeometry args={[0.12, 0.12, 0.08]} />}
                <meshStandardMaterial color={index === 1 ? BLUE : INK} />
              </mesh>
            )}
          </group>
        ))}
        {phase === 0 && (
          <mesh position={[0, -0.31, 0.03]}>
            <boxGeometry args={[1.2, 0.035, 0.08]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        )}
        {phase >= 2 && (
          <group position={[0.72, 0.48, -0.06]}>
            <mesh position={[0, 0, -0.02]}>
              <boxGeometry args={[0.38, 0.5, 0.05]} />
              <meshStandardMaterial color={PAPER} />
            </mesh>
            <mesh position={[0, 0.07, 0.02]} rotation={[0, 0, -0.25]}>
              <torusGeometry args={[0.09, 0.026, 8, 18, Math.PI * 1.28]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
            <mesh position={[-0.02, -0.12, 0.02]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  if (lesson === 4) {
    return (
      <group position={[0.88, -0.5, -0.42]}>
        {phase >= 1 && (
          <group position={[0.72, 1.0, -0.08]}>
            <mesh>
              <boxGeometry args={[0.56, 0.62, 0.055]} />
              <meshStandardMaterial color="#dfe7ff" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.03, 0.62, 0.07]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.56, 0.03, 0.07]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          </group>
        )}
        <group position={[phase >= 1 ? 0.22 : 0, 0, 0]} rotation={[0, 0, phase >= 1 ? -0.1 : 0]}>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.35, 0.27, 0.46, 18]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.025, 0.035, 0.9, 10]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          <mesh position={[-0.2, 0.33, 0]} rotation={[0, 0, 0.7]}>
            <sphereGeometry args={[0.2, 20, 12]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          {phase >= 2 && (
            <mesh position={[0.2, 0.62, 0]} rotation={[0, 0, -0.7]}>
              <sphereGeometry args={[0.2, 20, 12]} />
              <meshStandardMaterial color={BLUE} />
            </mesh>
          )}
        </group>
        {phase === 0 && [-0.18, 0.02, 0.2].map((x, index) => (
          <mesh key={x} position={[x, 0.75 + index * 0.13, 0.04]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.045, 0.14, 10]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[0.86, 0.05, -0.42]} rotation={[0.2, 0, 0]}>
      {phase === 0 && [-0.38, 0, 0.38].map((x, index) => (
        <group key={x} position={[x, index === 1 ? 0.12 : 0, index * -0.03]} rotation={[0, 0, (index - 1) * 0.12]}>
          <mesh>
            <boxGeometry args={[0.34, 0.46, 0.045]} />
            <meshStandardMaterial color={index === 1 ? '#dfe7ff' : PAPER} />
          </mesh>
          <mesh position={[0, 0.08, 0.03]}>
            <boxGeometry args={[0.2, 0.025, 0.018]} />
            <meshStandardMaterial color={index === 1 ? BLUE : INK} />
          </mesh>
          <mesh position={[-0.03, -0.04, 0.03]}>
            <boxGeometry args={[0.14, 0.025, 0.018]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        </group>
      ))}
      {phase === 1 && (
        <group>
          <mesh position={[-0.42, 0, 0]} rotation={[0, 0, 0.45]}>
            <torusGeometry args={[0.32, 0.06, 14, 36, Math.PI * 1.55]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI + 0.45]}>
            <torusGeometry args={[0.32, 0.06, 14, 36, Math.PI * 1.55]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </group>
      )}
      {phase >= 2 && (
        <group>
          <mesh position={[-0.27, 0, 0]} rotation={[0, 0, 0.25]}>
            <torusGeometry args={[0.32, 0.06, 14, 36]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0.27, 0, 0]} rotation={[0, 0, -0.25]}>
            <torusGeometry args={[0.32, 0.06, 14, 36]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
          <mesh position={[0, -0.54, 0]}>
            <boxGeometry args={[0.7, 0.22, 0.045]} />
            <meshStandardMaterial color={PAPER} />
          </mesh>
          <mesh position={[0, -0.54, 0.03]}>
            <boxGeometry args={[0.46, 0.025, 0.018]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function HeldObject({ lesson }: { lesson: number }) {
  if (lesson === 0) {
    return (
      <group rotation={[0, 0, -0.65]}>
        <mesh>
          <cylinderGeometry args={[0.015, 0.015, 0.5, 8]} />
          <meshStandardMaterial color="#b59467" />
        </mesh>
        <mesh position={[0, 0.31, 0]}>
          <coneGeometry args={[0.06, 0.18, 8]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
    );
  }

  if (lesson === 1) {
    return (
      <group rotation={[0, 0, -0.22]}>
        <mesh>
          <cylinderGeometry args={[0.018, 0.018, 0.52, 8]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0, 0.31, 0]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      </group>
    );
  }

  if (lesson === 2) {
    return (
      <group rotation={[0.15, 0.25, -0.12]}>
        <mesh>
          <boxGeometry args={[0.25, 0.18, 0.1]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[-0.06, 0, 0.06]}>
          <boxGeometry args={[0.045, 0.045, 0.02]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.065, 0, 0.06]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
      </group>
    );
  }

  if (lesson === 4) {
    return (
      <group rotation={[0.1, 0, -0.12]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.14, 0.22, 14]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.18, 0.04, 0]} rotation={[0, 0, -Math.PI / 2.8]}>
          <coneGeometry args={[0.07, 0.3, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[-0.13, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1, 0.022, 8, 18, Math.PI * 1.5]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
    );
  }

  if (lesson === 6) {
    return (
      <group rotation={[0.08, 0.1, -0.28]}>
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.18, 0.3, 0.07]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve
          points={[
            [0, 0.02, 0],
            [0.14, 0.22, 0],
            [0, 0.43, 0],
          ]}
          color={INK}
          radius={0.012}
        />
        <ThreadCurve
          points={[
            [0, 0.02, 0],
            [-0.14, 0.22, 0],
            [0, 0.43, 0],
          ]}
          color={INK}
          radius={0.012}
        />
      </group>
    );
  }

  if (lesson === 7) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh>
          <boxGeometry args={[0.3, 0.38, 0.04]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.07, 0.08, 0.03]}>
          <circleGeometry args={[0.045, 14]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.05, -0.04, 0.03]}>
          <boxGeometry args={[0.15, 0.024, 0.014]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
    );
  }

  if (lesson === 8) {
    return (
      <group rotation={[0.08, 0.12, -0.16]}>
        <mesh>
          <boxGeometry args={[0.38, 0.055, 0.055]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        {[-0.17, 0.17].map((x) => (
          <mesh key={x} position={[x, 0, 0.04]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lesson === 9) {
    return (
      <group rotation={[0.08, 0.12, -0.16]}>
        <mesh>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        {[[-0.08, 0.08], [0.07, 0.04], [0.03, -0.08]].map(([x, y]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.11]}>
            <sphereGeometry args={[0.026, 8, 6]} />
            <meshStandardMaterial color={PAPER} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lesson === 10) {
    return (
      <group rotation={[Math.PI / 2, 0.08, -0.12]}>
        <mesh>
          <cylinderGeometry args={[0.14, 0.14, 0.08, 6]} />
          <meshStandardMaterial color={INK} flatShading />
        </mesh>
        <mesh position={[0.02, 0.045, 0]} rotation={[0, 0, 0.7]}>
          <boxGeometry args={[0.025, 0.2, 0.016]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      </group>
    );
  }

  if (lesson === 11) {
    return (
      <group rotation={[0.08, 0.12, -0.16]}>
        <mesh>
          <cylinderGeometry args={[0.055, 0.055, 0.4, 16]} />
          <meshStandardMaterial color={PALE} transparent opacity={0.48} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.075, 0]}>
          <cylinderGeometry args={[0.036, 0.036, 0.25, 14]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      </group>
    );
  }

  if (lesson === 12) {
    return (
      <group rotation={[0.08, 0.12, -0.18]}>
        <mesh scale={[0.16, 0.3, 0.06]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={PALE} />
        </mesh>
        <mesh position={[0.08, 0.22, 0.04]} scale={[0.035, 0.055, 0.035]}>
          <sphereGeometry args={[1, 10, 7]} />
          <meshStandardMaterial color={BLUE} transparent opacity={0.7} />
        </mesh>
      </group>
    );
  }

  if (lesson === 13) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        {[[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.06]} />
            <meshStandardMaterial color={index === 0 ? BLUE : index === 3 ? INK : PAPER} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lesson === 14) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        {[[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.06]} />
            <meshStandardMaterial color={index % 2 === 0 ? BLUE : PAPER} />
          </mesh>
        ))}
        <mesh position={[0.23, 0.08, 0]}>
          <sphereGeometry args={[0.035, 10, 7]} />
          <meshStandardMaterial color={PALE} />
        </mesh>
      </group>
    );
  }

  if (lesson === 15) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.026, 8, 22, Math.PI * 1.72]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        {[[-0.06, 0.03], [0.04, -0.05], [0.08, 0.06]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.02]} rotation={[0, 0, index * 0.35]}>
            <boxGeometry args={[0.055, index === 1 ? 0.08 : 0.055, 0.04]} />
            <meshStandardMaterial color={index === 1 ? INK : PAPER} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lesson === 16) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        <mesh rotation={[Math.PI / 2, 0, 0.35]}>
          <torusGeometry args={[0.15, 0.024, 8, 24, Math.PI * 1.55]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[-0.02, 0, 0.02]} rotation={[0, 0, 0.22]}>
          <boxGeometry args={[0.13, 0.09, 0.05]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.09, 0.08, 0.04]}>
          <boxGeometry args={[0.045, 0.045, 0.035]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      </group>
    );
  }

  if (lesson === 17) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.35, 0.88, 1]}>
          <torusGeometry args={[0.12, 0.022, 8, 22, Math.PI * 1.9]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        {[[-0.09, 0.1], [0.02, 0.12], [0.1, 0.07]].map(([x, y]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.025]}>
            <boxGeometry args={[0.04, 0.04, 0.03]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lesson === 18) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        {[-0.09, 0, 0.09].map((x, index) => (
          <mesh key={x} position={[x, 0, 0]}>
            <boxGeometry args={[0.035, 0.08 + index * 0.035, 0.03]} />
            <meshStandardMaterial color={index === 1 ? INK : BLUE} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lesson === 19) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        {[-0.09, 0.09].map((x, index) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.2, 0.82, 1]}>
            <torusGeometry args={[0.08, 0.018, 8, 20]} />
            <meshStandardMaterial color={index === 0 ? INK : BLUE} />
          </mesh>
        ))}
        <mesh>
          <boxGeometry args={[0.14, 0.035, 0.03]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      </group>
    );
  }

  if (lesson === 20) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        {[-0.1, 0.1].map((x, index) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.2, 0.82, 1]}>
            <torusGeometry args={[0.075, 0.018, 8, 20]} />
            <meshStandardMaterial color={index === 0 ? INK : BLUE} />
          </mesh>
        ))}
        <mesh position={[-0.1, 0, 0.03]}>
          <boxGeometry args={[0.04, 0.04, 0.025]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
    );
  }

  if (lesson === 21) {
    return (
      <group rotation={[0.12, 0.18, -0.14]}>
        {[[0, 0.1], [-0.1, -0.08], [0.1, -0.08]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0]}>
            {index === 0 ? <boxGeometry args={[0.1, 0.07, 0.05]} /> : <sphereGeometry args={[0.055, 9, 6]} />}
            <meshStandardMaterial color={index === 1 ? INK : BLUE} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lesson === 22) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh>
          <boxGeometry args={[0.3, 0.38, 0.04]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <ThreadCurve points={[[0, 0.12, 0.03], [0.09, -0.08, 0.03], [-0.09, -0.08, 0.03], [0, 0.12, 0.03]]} color={BLUE} radius={0.012} />
        <mesh position={[0, -0.02, 0.045]}>
          <circleGeometry args={[0.035, 14]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
    );
  }

  if (lesson === 23) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.025, 0.3, 0.025]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[-0.085, 0.02, 0.035]}>
          <sphereGeometry args={[0.03, 9, 6]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.085, -0.03, 0.035]}>
          <circleGeometry args={[0.045, 14]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
    );
  }

  if (lesson === 24) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <ThreadCurve points={[[-0.1, 0.09, 0.03], [0, -0.1, 0.03], [0.1, 0.09, 0.03]]} color={BLUE} radius={0.01} />
        {[[-0.1, 0.09], [0, -0.1], [0.1, 0.09]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.045]}>
            <sphereGeometry args={[index === 1 ? 0.04 : 0.03, 9, 6]} />
            <meshStandardMaterial color={index === 1 ? BLUE : INK} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lesson === 25) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        {[[-0.1, -0.05], [0, -0.05], [0.1, -0.05]].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.045]}>
            {index === 1 ? <sphereGeometry args={[0.04, 9, 6]} /> : <boxGeometry args={[0.055, 0.055, 0.035]} />}
            <meshStandardMaterial color={index === 1 ? BLUE : INK} />
          </mesh>
        ))}
        <ThreadCurve points={[[0.11, 0.12, 0.03], [0.04, 0.04, 0.03], [0, -0.01, 0.03]]} color={BLUE} radius={0.01} />
      </group>
    );
  }

  if (lesson === 26) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.08, -0.05, 0.04]}>
          <sphereGeometry args={[0.035, 9, 6]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.08, -0.05, 0.04]}>
          <sphereGeometry args={[0.035, 9, 6]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve points={[[ -0.08, -0.01, 0.035], [0, 0.1, 0.035], [0.08, -0.01, 0.035]]} color={INK} radius={0.009} />
      </group>
    );
  }

  if (lesson === 27) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.08, -0.05, 0.04]}>
          <coneGeometry args={[0.045, 0.09, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.08, -0.05, 0.04]}>
          <coneGeometry args={[0.045, 0.09, 10]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <ThreadCurve points={[[-0.08, 0.01, 0.035], [0, 0.11, 0.035], [0.08, 0.01, 0.035]]} color={BLUE} radius={0.009} />
      </group>
    );
  }

  if (lesson === 28) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.08, -0.045, 0.04]} scale={[0.55, 1.25, 0.6]}>
          <sphereGeometry args={[0.045, 9, 6]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.08, -0.045, 0.04]} scale={[1.25, 0.55, 0.6]}>
          <sphereGeometry args={[0.045, 9, 6]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve points={[[-0.08, 0.01, 0.035], [0, 0.11, 0.035], [0.08, 0.01, 0.035]]} color={INK} radius={0.009} />
      </group>
    );
  }

  if (lesson === 29) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.08, 0.09, 0.04]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[-0.08, -0.06, 0.04]}>
          <coneGeometry args={[0.04, 0.08, 10]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.08, 0.09, 0.04]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0.08, -0.065, 0.04]} scale={[1.2, 0.48, 0.7]}>
          <sphereGeometry args={[0.05, 10, 7]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve points={[[-0.08, 0.065, 0.035], [-0.08, 0.015, 0.035], [-0.08, -0.02, 0.035]]} color={BLUE} radius={0.008} />
        <ThreadCurve points={[[0.08, 0.065, 0.035], [0.08, 0.015, 0.035], [0.08, -0.02, 0.035]]} color={INK} radius={0.008} />
      </group>
    );
  }

  if (lesson === 30) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[0, -0.02, 0.04]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.23, 0.018, 0.025]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0, -0.095, 0.035]}>
          <coneGeometry args={[0.04, 0.08, 3]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        {[-0.085, -0.045].map((x) => (
          <mesh key={x} position={[x, 0.04, 0.045]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        ))}
        <mesh position={[0.075, 0.005, 0.045]}>
          <coneGeometry args={[0.027, 0.055, 9]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
    );
  }

  if (lesson === 31) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.075, 0.035, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.04, 0.01, 8, 20]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0.075, -0.045, 0.045]} rotation={[0, 0, 0.12]}>
          <coneGeometry args={[0.045, 0.085, 3]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve points={[[-0.025, 0.025, 0.04], [0.005, -0.005, 0.04], [0.035, 0.015, 0.04], [0.055, -0.02, 0.04]]} color={BLUE} radius={0.008} />
      </group>
    );
  }

  if (lesson === 32) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.07, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.055, 0.009, 8, 24]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0.07, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.055, 0.009, 8, 24]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.07, 0, 0.055]}>
          <coneGeometry args={[0.021, 0.04, 3]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve points={[[-0.01, 0.065, 0.04], [0.02, 0.09, 0.04], [0.05, 0.065, 0.04]]} color={BLUE} radius={0.007} />
      </group>
    );
  }

  if (lesson === 33) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <mesh position={[-0.07, 0.045, 0.045]}>
          <coneGeometry args={[0.028, 0.055, 3]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <mesh position={[0.07, 0.045, 0.045]}>
          <boxGeometry args={[0.045, 0.045, 0.035]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0, -0.07, 0.045]}>
          <boxGeometry args={[0.018, 0.08, 0.025]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve points={[[-0.05, 0.01, 0.04], [0, -0.02, 0.04], [0.05, 0.01, 0.04]]} color={INK} radius={0.007} />
      </group>
    );
  }

  if (lesson === 34) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        {[
          [-0.08, -0.025], [0, 0.06], [0.08, -0.025],
        ].map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.045]} rotation={[0, 0, -1.35 + index * 0.08]}>
            <coneGeometry args={[0.025, 0.065, 3]} />
            <meshStandardMaterial color={index === 1 ? BLUE : INK} />
          </mesh>
        ))}
        <ThreadCurve points={[[-0.1, -0.095, 0.04], [0, -0.045, 0.04], [0.11, -0.075, 0.04]]} color={BLUE} radius={0.007} />
      </group>
    );
  }

  if (lesson === 35) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        {[-0.09, -0.03, 0.03, 0.09].map((x, index) => (
          <mesh key={x} position={[x, -0.035 + Math.abs(x) * 0.22, 0.045]} rotation={[0, 0, x * 0.9]}>
            <boxGeometry args={[0.052, 0.15, 0.03]} />
            <meshStandardMaterial color={index < 2 ? BLUE : INK} />
          </mesh>
        ))}
        <mesh position={[0.01, 0.075, 0.045]}>
          <boxGeometry args={[0.012, 0.16, 0.02]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve points={[[-0.12, -0.115, 0.04], [0, -0.145, 0.04], [0.12, -0.115, 0.04]]} color={INK} radius={0.007} />
      </group>
    );
  }

  if (lesson === 36) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <ThreadCurve points={[[-0.13, 0.08, 0.04], [-0.075, -0.07, 0.04], [0, 0.06, 0.04], [0.075, -0.07, 0.04], [0.13, 0.08, 0.04]]} color={INK} radius={0.008} />
        <mesh position={[0.075, -0.04, 0.055]}>
          <sphereGeometry args={[0.027, 9, 7]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
        <ThreadCurve points={[[0.12, 0.13, 0.04], [0.08, 0.1, 0.04], [0.04, 0.11, 0.04]]} color={BLUE} radius={0.006} />
      </group>
    );
  }

  if (lesson === 37) {
    return (
      <group rotation={[0.08, 0.12, -0.12]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.32, 0.38, 0.035]} />
          <meshStandardMaterial color={PAPER} />
        </mesh>
        <ThreadCurve points={[[ -0.13, 0.08, 0.04], [-0.07, -0.025, 0.04], [0, 0.02, 0.04], [0.06, -0.045, 0.04], [0.13, -0.02, 0.04]]} color={INK} radius={0.007} />
        {[-0.1, -0.035, 0.025, 0.085].map((x, index) => (
          <mesh key={x} position={[x, 0.075 - index * 0.03, 0.055]}>
            <sphereGeometry args={[0.014, 8, 6]} />
            <meshStandardMaterial color={BLUE} />
          </mesh>
        ))}
        <mesh position={[0.13, -0.08, 0.05]}>
          <boxGeometry args={[0.01, 0.11, 0.012]} />
          <meshStandardMaterial color={BLUE} />
        </mesh>
      </group>
    );
  }

  return (
    <group rotation={[0.08, 0.12, -0.12]}>
      <mesh>
        <boxGeometry args={[lesson === 3 ? 0.28 : 0.34, lesson === 3 ? 0.38 : 0.22, 0.035]} />
        <meshStandardMaterial color={PAPER} />
      </mesh>
      <mesh position={[0, lesson === 3 ? 0.07 : 0, 0.025]}>
        <boxGeometry args={[0.18, 0.022, 0.012]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
    </group>
  );
}

type WorldFamily =
  | 'color'
  | 'sound'
  | 'pattern'
  | 'company'
  | 'growth'
  | 'markers'
  | 'thread'
  | 'memory'
  | 'perspective'
  | 'water'
  | 'stone'
  | 'particles'
  | 'energy'
  | 'signal'
  | 'branches';

type WorldPalette = {
  sky: string;
  ground: string;
  hill: string;
  hillFar: string;
  trail: string;
};

const worldFamilyByLesson: WorldFamily[] = [
  'color', 'sound', 'pattern', 'company', 'growth', 'markers',
  'thread', 'memory', 'perspective', 'water', 'stone', 'water',
  'growth', 'particles', 'pattern', 'energy', 'markers', 'signal',
  'signal', 'growth', 'branches', 'company', 'memory', 'company',
  'company', 'markers', 'company', 'pattern', 'pattern', 'thread',
  'signal', 'signal', 'memory', 'pattern', 'growth', 'memory',
  'water', 'signal',
];

function paletteFor(family: WorldFamily): WorldPalette {
  if (family === 'water') {
    return { sky: '#edf2ef', ground: '#e4ebe4', hill: '#9db3aa', hillFar: '#bdc9c0', trail: '#bd826c' };
  }
  if (family === 'growth' || family === 'branches') {
    return { sky: '#f0f2e8', ground: '#e7eadc', hill: '#98ad91', hillFar: '#bac6ad', trail: '#cf8769' };
  }
  if (family === 'color' || family === 'sound') {
    return { sky: '#f5eee7', ground: '#eee5da', hill: '#b4b9a7', hillFar: '#d0c6b5', trail: '#cb7258' };
  }
  if (family === 'signal' || family === 'energy') {
    return { sky: '#f1eee5', ground: '#e8e5dc', hill: '#9fac9d', hillFar: '#c3c8bb', trail: '#c68065' };
  }
  return { sky: '#f2f0e7', ground: '#ece9de', hill: '#aab9a7', hillFar: '#bac5b5', trail: '#d38b6f' };
}

const walkingTrail = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-2.15, -0.43, 0.72),
  new THREE.Vector3(-1.42, -0.42, 0.34),
  new THREE.Vector3(-0.58, -0.42, 0.04),
  new THREE.Vector3(0.2, -0.41, -0.28),
  new THREE.Vector3(0.82, -0.4, -0.68),
]);

function FieldCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const isNarrow = size.width < 720;
    camera.position.set(0, isNarrow ? 1.34 : 1.05, isNarrow ? 5.2 : 4.2);
    camera.lookAt(0, isNarrow ? -0.38 : -0.1, isNarrow ? -0.1 : -0.25);
    camera.updateProjectionMatrix();
  }, [camera, size.width]);

  return null;
}

function GrassTuft({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[-0.07, 0, 0.07].map((x, index) => (
        <mesh key={x} position={[x, 0.12 + index * 0.02, 0]} rotation={[0, 0, (index - 1) * -0.34]}>
          <coneGeometry args={[0.035, 0.28 + index * 0.035, 4]} />
          <meshStandardMaterial color={index === 1 ? '#627966' : '#7f927f'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function FieldGround({ palette }: { palette: WorldPalette }) {
  const stones: Array<[number, number, number, number]> = [
    [-2.72, -0.96, -0.46, 0.28],
    [-1.68, -0.95, -1.36, 0.13],
    [-0.74, -0.96, -1.72, 0.1],
    [0.22, -0.95, -1.58, 0.08],
    [1.86, -0.96, -1.42, 0.22],
    [2.58, -0.95, -0.62, 0.34],
  ];

  return (
    <group>
      <mesh position={[0, -1.04, -0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.2, 9.6]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>

      <mesh position={[-2.92, -0.9, -2.32]} scale={[2.5, 0.62, 0.9]}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color={palette.hillFar} roughness={1} flatShading />
      </mesh>
      <mesh position={[2.78, -0.84, -2.38]} scale={[2.7, 0.72, 0.95]}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color={palette.hill} roughness={1} flatShading />
      </mesh>

      <ThreadCurve
        points={[
          [-3.65, -0.965, 1.35],
          [-2.5, -0.955, 0.96],
          [-1.4, -0.95, 0.42],
          [-0.35, -0.945, 0.08],
          [0.68, -0.94, -0.62],
          [1.72, -0.945, -1.12],
          [3.5, -0.955, -1.55],
        ]}
        color={palette.trail}
        radius={0.025}
      />

      {stones.map(([x, y, z, size], index) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]} rotation={[0.18, index * 0.73, -0.08]} scale={[1.45, 0.62, 1]}>
          <dodecahedronGeometry args={[size, 0]} />
          <meshStandardMaterial color={index % 2 === 0 ? '#90a18e' : '#c5cec0'} roughness={1} flatShading />
        </mesh>
      ))}

      <GrassTuft position={[-2.18, -0.82, -0.76]} scale={0.82} />
      <GrassTuft position={[2.16, -0.82, -0.92]} scale={0.96} />
      <GrassTuft position={[1.46, -0.84, -1.72]} scale={0.62} />
    </group>
  );
}

function WorldChanges({ family, phase }: { family: WorldFamily; phase: number }) {
  const count = phase + 1;

  if (family === 'color') {
    const patches = [
      [-1.85, -0.98, -1.05, 0.26, CLAY],
      [-0.92, -0.98, -1.52, 0.2, BLUE],
      [0.08, -0.98, -1.68, 0.16, '#d8b46f'],
    ] as const;
    return (
      <group>
        {patches.slice(0, count).map(([x, y, z, size, color]) => (
          <mesh key={x} position={[x, y, z]} rotation={[-Math.PI / 2, 0, x * 0.18]} scale={[1.55, 0.9, 1]}>
            <circleGeometry args={[size, 18]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        ))}
      </group>
    );
  }

  if (family === 'sound') {
    return (
      <group position={[-0.85, -0.62, -1.2]}>
        {Array.from({ length: count + 1 }, (_, index) => (
          <mesh key={index} position={[index * 0.34, index * 0.08, -index * 0.07]} rotation={[0, 0.1, -0.22]}>
            <torusGeometry args={[0.16 + index * 0.06, 0.018, 8, 32, Math.PI * 1.45]} />
            <meshStandardMaterial color={index % 2 === 0 ? BLUE : CLAY} roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }

  if (family === 'pattern') {
    return (
      <group>
        {Array.from({ length: 3 + phase * 2 }, (_, index) => {
          const row = index % 2;
          return (
            <mesh key={index} position={[-1.42 + index * 0.34, -0.9, -1.36 - row * 0.18]} rotation={[0.05, index * 0.42, 0]}>
              {index % 3 === 0 ? <octahedronGeometry args={[0.11]} /> : <boxGeometry args={[0.17, 0.12, 0.17]} />}
              <meshStandardMaterial color={index % 2 === 0 ? '#778b79' : '#c4ccbd'} roughness={1} flatShading />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (family === 'company') {
    const people = [
      [-1.2, -0.76, -1.36],
      [-0.72, -0.76, -1.52],
      [-0.25, -0.76, -1.34],
    ] as const;
    return (
      <group>
        {people.slice(0, count + 1).map(([x, y, z], index) => (
          <group key={x} position={[x, y, z]}>
            <mesh position={[0, 0.12, 0]}>
              <dodecahedronGeometry args={[0.1, 0]} />
              <meshStandardMaterial color={index === 1 ? CLAY : BLUE} roughness={1} flatShading />
            </mesh>
            <mesh position={[0, -0.04, 0]}>
              <cylinderGeometry args={[0.055, 0.075, 0.2, 7]} />
              <meshStandardMaterial color={index === 1 ? CLAY : BLUE} roughness={1} flatShading />
            </mesh>
          </group>
        ))}
        {phase >= 1 && <ThreadCurve points={[[-1.2, -0.61, -1.36], [-0.96, -0.49, -1.44], [-0.72, -0.61, -1.52]]} color="#8d9c8b" radius={0.009} />}
        {phase >= 2 && <ThreadCurve points={[[-0.72, -0.61, -1.52], [-0.48, -0.48, -1.43], [-0.25, -0.61, -1.34]]} color="#c68065" radius={0.009} />}
      </group>
    );
  }

  if (family === 'growth') {
    const sprouts = [
      [-1.75, -0.82, -1.2, 0.65],
      [-1.2, -0.82, -1.52, 0.88],
      [-0.55, -0.82, -1.65, 0.72],
      [0.05, -0.82, -1.48, 0.56],
    ] as const;
    return (
      <group>
        {sprouts.slice(0, count + 1).map(([x, y, z, scale]) => <GrassTuft key={x} position={[x, y, z]} scale={scale} />)}
        {phase >= 1 && (
          <group position={[-0.42, -0.72, -1.78]} scale={0.7 + phase * 0.17}>
            <mesh position={[0, 0.17, 0]}>
              <cylinderGeometry args={[0.035, 0.05, 0.42, 7]} />
              <meshStandardMaterial color="#6c6854" roughness={1} />
            </mesh>
            <mesh position={[0, 0.48, 0]} scale={[1.2, 0.85, 1]}>
              <icosahedronGeometry args={[0.22, 1]} />
              <meshStandardMaterial color="#799276" roughness={1} flatShading />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  if (family === 'markers') {
    return (
      <group>
        {Array.from({ length: 2 + phase }, (_, index) => (
          <group key={index} position={[-1.55 + index * 0.48, -0.7, -1.5 - (index % 2) * 0.1]}>
            <mesh>
              <cylinderGeometry args={[0.025, 0.035, 0.48 + index * 0.05, 7]} />
              <meshStandardMaterial color="#5d6f60" roughness={1} />
            </mesh>
            <mesh position={[0, 0.28 + index * 0.025, 0]}>
              <octahedronGeometry args={[0.065]} />
              <meshStandardMaterial color={index === phase ? CLAY : '#a7b2a3'} roughness={1} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (family === 'thread') {
    return (
      <group>
        <ThreadCurve points={[[-1.75, -0.9, -1.5], [-1.25, -0.4, -1.58], [-0.75, -0.9, -1.48]]} color="#718673" radius={0.018} />
        {phase >= 1 && <ThreadCurve points={[[-1.1, -0.9, -1.62], [-0.55, -0.28, -1.7], [0, -0.9, -1.54]]} color="#c77b60" radius={0.018} />}
        {phase >= 2 && <ThreadCurve points={[[-1.7, -0.65, -1.46], [-0.82, -0.34, -1.42], [0.08, -0.6, -1.5]]} color="#9eaa9b" radius={0.009} />}
      </group>
    );
  }

  if (family === 'memory') {
    return (
      <group position={[-0.88, -0.83, -1.54]}>
        {Array.from({ length: 2 + phase }, (_, index) => (
          <mesh key={index} position={[index * 0.035, index * 0.12, -index * 0.015]} rotation={[0, index * 0.38, index * 0.06]}>
            <dodecahedronGeometry args={[0.17 - index * 0.012, 0]} />
            <meshStandardMaterial color={index === phase + 1 ? CLAY : '#879989'} roughness={1} flatShading />
          </mesh>
        ))}
        {phase >= 2 && (
          <mesh position={[0.08, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.13, 0.012, 8, 28]} />
            <meshStandardMaterial color="#c68065" transparent opacity={0.75} />
          </mesh>
        )}
      </group>
    );
  }

  if (family === 'perspective') {
    return (
      <group>
        {Array.from({ length: 3 }, (_, index) => (
          <mesh key={index} position={[-1.4 + index * 0.58, -0.68 + index * 0.04, -1.18 - index * 0.34]} rotation={[0, 0, index * 0.04]}>
            <boxGeometry args={[0.055 + index * 0.015, 0.58 - index * 0.08, 0.055]} />
            <meshStandardMaterial color={index <= phase ? CLAY : '#7f917f'} roughness={1} />
          </mesh>
        ))}
      </group>
    );
  }

  if (family === 'water') {
    return (
      <group>
        <ThreadCurve points={[[-2.35, -0.975, -1.45], [-1.65, -0.96, -1.8], [-0.8, -0.97, -1.48], [0.1, -0.965, -1.86], [0.76, -0.97, -1.58]]} color="#789a94" radius={0.045 + phase * 0.008} />
        {Array.from({ length: count }, (_, index) => (
          <mesh key={index} position={[-1.5 + index * 0.78, -0.95, -1.68 + (index % 2) * 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12 + index * 0.03, 0.132 + index * 0.03, 30]} />
            <meshStandardMaterial color="#a5bdb5" transparent opacity={0.68} />
          </mesh>
        ))}
      </group>
    );
  }

  if (family === 'stone') {
    return (
      <group>
        {Array.from({ length: 3 + phase }, (_, index) => (
          <mesh key={index} position={[-1.45 + index * 0.36, -0.82 + index * 0.04, -1.55 - (index % 2) * 0.12]}>
            <cylinderGeometry args={[0.11, 0.14, 0.32 + index * 0.08, 6]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#6d7e70' : '#aeb9aa'} roughness={1} flatShading />
          </mesh>
        ))}
      </group>
    );
  }

  if (family === 'particles') {
    return (
      <group>
        {Array.from({ length: 5 + phase * 3 }, (_, index) => {
          const x = -1.65 + (index % 5) * 0.38;
          const y = -0.78 + (index % 3) * 0.17;
          const z = -1.5 - Math.floor(index / 5) * 0.22;
          return (
            <mesh key={index} position={[x, y, z]}>
              <sphereGeometry args={[0.035 + (index % 2) * 0.015, 7, 5]} />
              <meshStandardMaterial color={index % 3 === 0 ? CLAY : BLUE} roughness={1} flatShading />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (family === 'energy') {
    return (
      <group position={[-0.8, -0.52, -1.7]}>
        <mesh position={[0, 0.2, 0]}>
          <icosahedronGeometry args={[0.16 + phase * 0.035, 1]} />
          <meshStandardMaterial color="#d8a55f" emissive="#b66f49" emissiveIntensity={0.18 + phase * 0.1} roughness={0.8} flatShading />
        </mesh>
        {Array.from({ length: count + 1 }, (_, index) => (
          <mesh key={index} position={[0, 0.2, 0]} rotation={[0, 0, index * 0.78]}>
            <boxGeometry args={[0.018, 0.56 + index * 0.1, 0.018]} />
            <meshStandardMaterial color="#c88a63" transparent opacity={0.4} />
          </mesh>
        ))}
      </group>
    );
  }

  if (family === 'branches') {
    return (
      <group>
        <ThreadCurve points={[[-1.25, -0.94, -1.55], [-1.05, -0.55, -1.58], [-0.92, -0.18, -1.62]]} color="#6c705d" radius={0.025} />
        <ThreadCurve points={[[-1.06, -0.56, -1.58], [-1.32, -0.4, -1.6], [-1.5, -0.24, -1.58]]} color="#6c705d" radius={0.014} />
        {phase >= 1 && <ThreadCurve points={[[-1.03, -0.5, -1.59], [-0.72, -0.36, -1.62], [-0.5, -0.14, -1.6]]} color="#6c705d" radius={0.014} />}
        {Array.from({ length: count + 1 }, (_, index) => (
          <mesh key={index} position={[-1.48 + index * 0.47, -0.2 + (index % 2) * 0.08, -1.57]} rotation={[0, 0, index % 2 ? -0.7 : 0.7]} scale={[0.45, 1, 0.32]}>
            <coneGeometry args={[0.12, 0.3, 4]} />
            <meshStandardMaterial color="#738b72" roughness={1} flatShading />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[-0.92, -0.66, -1.55]}>
      <mesh>
        <cylinderGeometry args={[0.025, 0.035, 0.62, 7]} />
        <meshStandardMaterial color="#617463" roughness={1} />
      </mesh>
      {Array.from({ length: 2 + phase }, (_, index) => (
        <mesh key={index} position={[0, 0.18, 0]} scale={1 + index * 0.28}>
          <torusGeometry args={[0.16, 0.012, 7, 30]} />
          <meshStandardMaterial color={index === phase + 1 ? CLAY : '#8da08e'} transparent opacity={0.72 - index * 0.12} />
        </mesh>
      ))}
    </group>
  );
}

function StudyFind({ lesson, phase }: { lesson: number; phase: number }) {
  const find = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (find.current) {
      find.current.position.y = -0.54 + Math.sin(time * 1.25) * 0.025;
      find.current.rotation.y = Math.sin(time * 0.36) * 0.14;
    }
    if (ring.current) {
      const pulse = 1 + Math.sin(time * 1.5) * 0.07;
      ring.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[1.43, 0, -0.88]} scale={1.08}>
      <mesh position={[0, -0.94, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.345, 42]} />
        <meshStandardMaterial color="#c88065" transparent opacity={0.38 + phase * 0.13} />
      </mesh>
      <mesh ref={ring} position={[0, -0.935, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.462, 48]} />
        <meshStandardMaterial color="#7e927f" transparent opacity={0.14 + phase * 0.08} />
      </mesh>
      <mesh position={[0, -0.86, 0]} scale={[1.4, 0.55, 1]}>
        <dodecahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color="#a8b5a4" roughness={1} flatShading />
      </mesh>
      <group ref={find} position={[0, -0.54, 0.05]} scale={1.38}>
        <HeldObject lesson={lesson} />
      </group>
      {Array.from({ length: phase + 1 }, (_, index) => {
        const angle = index * 2.1 + 0.6;
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.48, -0.4 + index * 0.12, Math.sin(angle) * 0.2]}>
            <sphereGeometry args={[0.026, 8, 6]} />
            <meshStandardMaterial color={index % 2 === 0 ? CLAY : BLUE} />
          </mesh>
        );
      })}
    </group>
  );
}

function Pipt({ phase, celebrating }: { phase: number; celebrating: boolean }) {
  const group = useRef<THREE.Group>(null);
  const face = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const time = clock.elapsedTime;
    const routeTime = time * 0.21 + phase * 0.08;
    const progress = (Math.sin(routeTime - Math.PI / 2) + 1) / 2;
    const point = walkingTrail.getPointAt(progress);
    const motion = Math.abs(Math.cos(routeTime));
    const gait = Math.sin(time * 6.2) * motion;

    group.current.position.set(point.x, point.y + Math.abs(Math.sin(time * 6.2)) * 0.018 * motion, point.z);
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      Math.cos(routeTime) >= 0 ? -0.13 : 0.13,
      0.04,
    );
    if (celebrating) group.current.rotation.z = Math.sin(time * 9) * 0.055;
    else group.current.rotation.z *= 0.9;

    if (leftArm.current) leftArm.current.rotation.z = 0.8 + gait * 0.24;
    if (rightArm.current) rightArm.current.rotation.z = -0.8 + gait * 0.24;
    if (leftLeg.current) leftLeg.current.rotation.z = 0.08 - gait * 0.22;
    if (rightLeg.current) rightLeg.current.rotation.z = -0.08 - gait * 0.22;
    if (face.current) {
      face.current.position.x = pointer.x * 0.018;
      face.current.position.y = pointer.y * 0.014;
    }
  });

  return (
    <group ref={group} position={[-2.15, -0.43, 0.72]} scale={1.08}>
      <mesh rotation={[0.06, 0.12, -0.04]} scale={[1.08, 0.96, 0.86]}>
        <icosahedronGeometry args={[0.42, 2]} />
        <meshStandardMaterial color={CLAY} roughness={0.92} flatShading />
      </mesh>
      <mesh position={[0.18, 0.4, -0.05]} rotation={[0.08, 0.18, 0.38]} scale={[0.4, 0.86, 0.32]}>
        <coneGeometry args={[0.22, 0.5, 4]} />
        <meshStandardMaterial color={BLUE} roughness={0.96} flatShading />
      </mesh>
      <group ref={face} position={[0, 0.04, 0]}>
        <mesh position={[-0.12, 0.03, 0.35]}>
          <sphereGeometry args={[0.039, 10, 8]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        <mesh position={[0.12, 0.03, 0.35]}>
          <sphereGeometry args={[0.039, 10, 8]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      </group>
      <mesh ref={leftLeg} position={[-0.18, -0.39, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.026, 0.026, 0.28, 8]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={rightLeg} position={[0.18, -0.39, 0.02]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.026, 0.026, 0.28, 8]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={leftArm} position={[-0.39, -0.05, 0.01]} rotation={[0, 0, 0.8]}>
        <cylinderGeometry args={[0.022, 0.022, 0.46, 8]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={rightArm} position={[0.39, -0.05, 0.02]} rotation={[0, 0, -0.8]}>
        <cylinderGeometry args={[0.022, 0.022, 0.46, 8]} />
        <meshStandardMaterial color={INK} />
      </mesh>
    </group>
  );
}

export default function StudioScene({ lesson, phase, celebrating }: { lesson: number; phase: number; celebrating: boolean }) {
  const family = worldFamilyByLesson[lesson] ?? 'pattern';
  const palette = paletteFor(family);

  return (
      <Canvas camera={{ position: [0, 1.05, 4.2], fov: 32 }} dpr={[1, 1.6]}>
      <FieldCamera />
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.sky, 6.2, 10.5]} />
      <ambientLight intensity={1.75} />
      <hemisphereLight args={['#fffaf0', '#718271', 1.35]} />
      <directionalLight position={[-3, 5, 4]} intensity={1.85} />
      <FieldGround palette={palette} />
      <WorldChanges family={family} phase={phase} />
      <StudyFind lesson={lesson} phase={phase} />
      <Pipt phase={phase} celebrating={celebrating} />
    </Canvas>
  );
}
