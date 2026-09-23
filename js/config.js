/*
================================================================================
BARCH AERO-CANYON RACING - MASTER CONFIGURATION MANIFEST
Central physics, game modes, sector levels, skins, upgrades, and graphics tiers
================================================================================
*/

export const CONFIG = {
    // Game Modes
    MODES: {
        CIRCUIT_RACE: 'CIRCUIT_RACE',
        EXTRACTION_SOLO: 'EXTRACTION_SOLO',
        EXTRACTION_VERSUS: 'EXTRACTION_VERSUS',
        TEAMWORK_COOP: 'TEAMWORK_COOP'
    },

    // Campaign Sectors / Levels
    SECTORS: [
        {
            id: 1,
            name: 'Downtown Canyons',
            subtitle: 'Daylight urban corridors with wide sky-lanes',
            briefing: 'Establish flight telemetry and secure preliminary energy relays across low-altitude skyscrapers.',
            laps: 2,
            payloads: 4,
            requiredSectorId: null,
            fogDensity: 0.0018,
            sunColor: 0xfff0dd,
            skyColor: 0x07111f,
            buildingSpread: 650,
            buildingHeightMax: 130,
            buildingColors: [0x0F8B8D, 0x1E3D59, 0xEC9A29, 0x17B978, 0x2B4162, 0xFF6E40, 0x38A3A5, 0x57CC99],
            beaconColors: [0x00ffff, 0xff0055, 0xffaa00],
            trimColor: 0x00ffff,
            windowGlow: 0xfff3b0
        },
        {
            id: 2,
            name: 'Industrial Port & Cranes',
            subtitle: 'Overcast twilight with dense gantries and narrow chicanes',
            briefing: 'Navigate coastal heavy-crane infrastructure under increasing wind shear to retrieve critical power cell freight.',
            laps: 3,
            payloads: 6,
            requiredSectorId: 1,
            fogDensity: 0.0024,
            sunColor: 0xffaa77,
            skyColor: 0x0b1724,
            buildingSpread: 800,
            buildingHeightMax: 170,
            buildingColors: [0xDDA15E, 0xBC6C25, 0x3A506B, 0xE76F51, 0x264653, 0xF4A261, 0xE63946, 0x457B9D],
            beaconColors: [0xffaa00, 0xff3300, 0x00e5ff],
            trimColor: 0xffa500,
            windowGlow: 0xffd166
        },
        {
            id: 3,
            name: 'Stratosphere Monoliths',
            subtitle: 'High-altitude storm run with vertical climbs and wind shear',
            briefing: 'Ascend beyond cloud cover into high-tension storm corridors to link the sub-orbital relay nodes.',
            laps: 3,
            payloads: 8,
            requiredSectorId: 2,
            fogDensity: 0.0030,
            sunColor: 0x88ccff,
            skyColor: 0x050c18,
            buildingSpread: 950,
            buildingHeightMax: 220,
            buildingColors: [0x240046, 0x3C096C, 0x5A189A, 0x7B2CBF, 0x9D4EDD, 0x00F5D4, 0x7209B7, 0x4361EE],
            beaconColors: [0xff00ff, 0x00ffff, 0x7000ff],
            trimColor: 0xff00aa,
            windowGlow: 0x00ffff
        },
        {
            id: 4,
            name: 'Operation Apex Horizon',
            subtitle: 'Climactic storm eye run - deploy the Primary Atmospheric Uplink',
            briefing: 'FINAL PROTOCOL: The metropolitan grid is in catastrophic cascade. Race through violent ionospheric vortexes and rival interceptors to deliver the Master Thermal Core.',
            isClimax: true,
            laps: 4,
            payloads: 10,
            requiredSectorId: 3,
            fogDensity: 0.0035,
            sunColor: 0xff4422,
            skyColor: 0x14041a,
            buildingSpread: 1100,
            buildingHeightMax: 280,
            buildingColors: [0x621708, 0x941B0C, 0xBC3908, 0xF6AA1C, 0xD4A373, 0x3F0008, 0xE63946, 0xFB8500],
            beaconColors: [0xff0033, 0xffbb00, 0xff0077],
            trimColor: 0xffc400,
            windowGlow: 0xffd000
        }
    ],

    // Drone Skins (Hangar Customization)
    SKINS: [
        {
            id: 'SAR_ORANGE',
            name: 'Search & Rescue',
            bodyColor: 0x1a2130,
            accentColor: 0xE8580A,
            glowColor: 0xE8580A,
            unlocked: true,
            cost: 0
        },
        {
            id: 'ARCTIC_GHOST',
            name: 'Arctic Ghost',
            bodyColor: 0xdde6ed,
            accentColor: 0x00ffff,
            glowColor: 0x00ffff,
            unlocked: true,
            cost: 250
        },
        {
            id: 'STEALTH_CARBON',
            name: 'Stealth Black Ops',
            bodyColor: 0x101216,
            accentColor: 0xF4A426,
            glowColor: 0xF4A426,
            unlocked: false,
            cost: 500
        },
        {
            id: 'CYBER_NEON',
            name: 'Cyber Outrun',
            bodyColor: 0x090a14,
            accentColor: 0xff007f,
            glowColor: 0x00ffff,
            unlocked: false,
            cost: 1000
        },
        {
            id: 'APEX_PROTO',
            name: 'Apex Sovereign',
            bodyColor: 0x0a0c14,
            accentColor: 0xffc400,
            glowColor: 0x00ffd5,
            unlocked: false,
            cost: 0,
            isCampaignExclusive: true,
            badge: 'CAMPAIGN REWARD'
        }
    ],

    // Loadout Upgrade Trees (1 to 5 levels)
    UPGRADES: {
        turbineSpeed: {
            name: 'Turbine Velocity',
            unit: 'km/h',
            baseValue: 180,
            stepValue: 15,
            baseCost: 200,
            costMultiplier: 1.5,
            maxLevel: 5
        },
        winchRadius: {
            name: 'Winch Magnetic Latch',
            unit: 'm',
            baseValue: 8.0,
            stepValue: 2.0,
            baseCost: 150,
            costMultiplier: 1.4,
            maxLevel: 5
        },
        hullArmor: {
            name: 'Reinforced Hull Armor',
            unit: 'HP',
            baseValue: 100,
            stepValue: 20,
            baseCost: 150,
            costMultiplier: 1.4,
            maxLevel: 5
        },
        nitroCapacity: {
            name: 'Nitro Fuel Cell',
            unit: '%',
            baseValue: 100,
            stepValue: 20,
            baseCost: 180,
            costMultiplier: 1.5,
            maxLevel: 5
        }
    },

    // Aircraft Kinematics & Aerodynamics
    FLIGHT: {
        BASE_SPEED: 140.0,
        MAX_CRUISE_SPEED: 200.0,
        STAGE2_BOOST_SPEED: 250.0,
        STAGE3_BOOST_SPEED: 320.0,
        ACCELERATION: 65.0,
        BRAKING_DECEL: 70.0,
        ROLL_RATE: 3.5,
        PITCH_RATE: 2.8,
        YAW_RATE: 2.4,
        BANKING_TILT: 0.72,
        PITCH_TILT: 0.48,
        VERTICAL_THRUST: 38.0,
        INDUCED_DRAG: 0.032,
        DRAFTING_DISTANCE: 22.0,
        DRAFTING_BOOST_RATE: 20.0
    },

    // Intrinsic Aerobatic Stunt State Machine
    STUNTS: {
        SNAP_ROLL_DURATION: 0.40,
        SNAP_ROLL_NITRO_GAIN: 22.0,
        SNAP_ROLL_HITBOX_SCALE: 0.55,
        KNIFE_EDGE_MIN_BANK: 1.45,
        KNIFE_EDGE_MAX_BANK: 1.69,
        KNIFE_EDGE_NITRO_RATE: 16.0,
        KNIFE_EDGE_SCORE_RATE: 180,
        COBRA_DURATION: 0.50,
        COBRA_PITCH_ANGLE: 1.35,
        COBRA_SPEED_DUMP: 0.62,
        NEAR_MISS_DISTANCE: 3.5,
        NEAR_MISS_NITRO_GAIN: 14.0
    },

    // Nitro Overcharge Mechanics
    NITRO: {
        MAX_CAPACITY: 100.0,
        STAGE2_DRAIN_RATE: 18.0,
        STAGE3_DRAIN_RATE: 28.0,
        STAGE3_SWEET_SPOT_MIN: 70,
        NATURAL_RECHARGE_RATE: 3.2
    },

    // Boost Enhancement Parameters (/boost)
    BOOST: {
        STAGE2_SPEED: 250.0,
        STAGE3_SPEED: 320.0,
        STAGE2_FOV: 88.0,
        STAGE3_FOV: 104.0,
        HYPER_OVERDRIVE_BURN: 26.0,
        RECHARGE_RATE: 3.5,
        SWEET_SPOT_MIN: 70.0
    },

    // Teamwork Squadron Parameters (/teamwork-preview)
    TEAMWORK: {
        ESCORT_DISTANCE: 14.0,
        TETHER_DISTANCE: 25.0,
        BOOST_RECHARGE_RATE: 20.0,
        WINGMAN_COLOR: 0x00e5ff
    },

    // Extraction Cargo Mechanics
    EXTRACTION: {
        WINCH_CABLE_COLOR: 0x88bbdd,
        BASE_DROP_RADIUS: 9.0,
        BASE_DROP_ALT_MAX: 36.0,
        CARGO_WEIGHT_DRAG: 0.15
    },

    // Camera Rig & Psychophysics
    CAMERA: {
        BASE_FOV: 70.0,
        STAGE2_FOV: 88.0,
        STAGE3_FOV: 104.0,
        BASE_DISTANCE: 6.4,
        BASE_HEIGHT: 2.1,
        SPRING_STIFFNESS: 10.5,
        SPRING_DAMPING: 6.0,
        SHAKE_INTENSITY: 0.24
    },

    // AI Rival Racers
    AI: {
        RACER_COUNT: 3,
        BASE_SPEED_VARIATION: 0.12,
        LANE_WOBBLE_FREQ: 0.6,
        LANE_WOBBLE_AMP: 3.5,
        AGILITY: 3.2,
        STUNT_PROBABILITY: 0.15
    },

    // Spline Track & Circuit Specifications
    TRACK: {
        RIBBON_WIDTH: 14.0,
        TOTAL_GATES: 18,
        GATE_RADIUS: 8.5,
        CHECKPOINT_RADIUS: 9.0,
        LAPS_TO_WIN: 2
    },

    // Device Hardware Profiles
    TIERS: {
        1: {
            name: 'MOBILE_LOW',
            dpr: 1.0,
            shadows: false,
            shadowMapSize: 0,
            maxProps: 120,
            particles: 30,
            speedLines: true,
            postProcess: false
        },
        2: {
            name: 'MOBILE_MID',
            dpr: 1.25,
            shadows: true,
            shadowMapSize: 512,
            maxProps: 280,
            particles: 90,
            speedLines: true,
            postProcess: false
        },
        3: {
            name: 'DESKTOP_HIGH',
            dpr: Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1.5, 2.0),
            shadows: true,
            shadowMapSize: 2048,
            maxProps: 500,
            particles: 220,
            speedLines: true,
            postProcess: true
        }
    }
};
