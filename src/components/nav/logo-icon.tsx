import Svg, { Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';

import { LOGO_ICONS, LOGO_ICON_RIBBON, type ILogoIconShape, type LogoIconName } from './logo-icons.data';

/** Couleurs du logo (`--logo-sky`, `--logo-blue`, `--logo-ribbon` du site). */
const SKY = '#2daae1';
const BLUE = '#3c88c8';
const RIBBON = '#3a5db0';
/** Icône visée : corps blanc et ruban clair, comme `.mobile-nav-act-hot` du site. */
const HOT_BODY = '#fff';
const HOT_RIBBON = '#cfe6ff';

interface ILogoIconProps {
  name: LogoIconName;
  size?: number;
  hot?: boolean;
}

/** Icône du jeu dessiné sur le logo (corps en dégradé + ruban plein, séparés par une réserve). Les ids sont propres à chaque `Svg`. */
export function LogoIcon({ name, size = 24, hot = false }: Readonly<ILogoIconProps>) {
  const shape = LOGO_ICONS[name] as ILogoIconShape;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="grad" gradientUnits="userSpaceOnUse" x1="4" y1="2" x2="20" y2="22">
          <Stop offset="0" stopColor={SKY} />
          <Stop offset="1" stopColor={BLUE} />
        </LinearGradient>
        <Mask id="cut" maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
          <Rect x="-2" y="-2" width="28" height="28" fill="#fff" />
          <Path d={LOGO_ICON_RIBBON} fill="#000" stroke="#000" strokeWidth={2.6} strokeLinejoin="round" />
        </Mask>
      </Defs>
      <Path
        d={shape.d}
        fillRule={shape.evenodd ? 'evenodd' : 'nonzero'}
        fill={hot ? HOT_BODY : 'url(#grad)'}
        mask="url(#cut)"
      />
      <Path d={LOGO_ICON_RIBBON} fill={hot ? HOT_RIBBON : RIBBON} />
    </Svg>
  );
}
