export enum ExchangerType {
  VELODROME = 'Velodrome',
  AERODROME = 'Aerodrome',
  BEEFY = 'Beefy',
  CONVEX = 'Convex',
  VEPLUS = 'Veplus',
  GND = 'Gnd',
  CURVE = 'Curve',
  PANCAKE = 'Pancake',
  LYNEX = 'Lynex',
  FRAX = 'Frax Finance',
  SWAPBLAST = 'Swapblast',
  SWAPBASED = 'Swapbased',
  THRUSTER = 'Thruster',
  AMBIENT = 'Ambient',
  BLADESWAP = 'Bladeswap',
  TRADERJOE = 'Traderjoe',
}

export const DEX_SUPPORT_SKIM: ExchangerType[] = [ExchangerType.VELODROME, ExchangerType.AERODROME];
