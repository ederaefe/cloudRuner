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
        EXTRACTION_VERSUS: 'EXTRACTION_VERSUS'
    },

    // Campaign Sectors / Levels
    SECTORS: [
        {
            id: 1,
            name: 'Downtown Canyons',
            subtitle: 'Daylight urban corridors with wide sky-lanes',
            laps: 2,
            payloads: 4,
            fogDensity: 0.0018,
            sunColor: 0xfff0dd,
            skyColor: 0x07111f,
            buildingSpread: 650,
            buildingHeightMax: 130
        },
        {
            id: 2,
            name: 'Industrial Port & Cranes',
            subtitle: 'Overcast twilight with dense gantries and narrow chicanes',
            laps: 3,
            payloads: 6,
            fogDensity: 0.0024,
            sunColor: 0xffaa77,
            skyColor: 0x0b1724,
            buildingSpread: 800,
            buildingHeightMax: 170
        },
        {
            id: 3,
            name: 'Stratosphere Monoliths',
            subtitle: 'High-altitude storm run with vertical climbs and wind shear',
            laps: 3,
            payloads: 8,
            fogDensity: 0.0030,
            sunColor: 0x88ccff,
            skyColor: 0x050c18,
            buildingSpread: 950,
            buildingHeightMax: 220
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
        BASE_SPEED: 130.0,
        MAX_CRUISE_SPEED: 180.0,
        STAGE2_BOOST_SPEED: 240.0,
        STAGE3_BOOST_SPEED: 320.0,
        ACCELERATION: 45.0,
        BRAKING_DECEL: 55.0,
        ROLL_RATE: 2.8,
        PITCH_RATE: 2.2,
        YAW_RATE: 1.8,
        BANKING_TILT: 0.55,
        PITCH_TILT: 0.35,
        VERTICAL_THRUST: 32.0,
        INDUCED_DRAG: 0.04,
        DRAFTING_DISTANCE: 18.0,
        DRAFTING_BOOST_RATE: 16.0
    },

    // Intrinsic Aerobatic Stunt State Machine
    STUNTS: {
        SNAP_ROLL_DURATION: 0.45,
        SNAP_ROLL_NITRO_GAIN: 22.0,
        SNAP_ROLL_HITBOX_SCALE: 0.55,
        KNIFE_EDGE_MIN_BANK: 1.45,
        KNIFE_EDGE_MAX_BANK: 1.69,
        KNIFE_EDGE_NITRO_RATE: 14.0,
        KNIFE_EDGE_SCORE_RATE: 150,
        COBRA_DURATION: 0.55,
        COBRA_PITCH_ANGLE: 1.35,
        COBRA_SPEED_DUMP: 0.62,
        NEAR_MISS_DISTANCE: 3.5,
        NEAR_MISS_NITRO_GAIN: 12.0
    },

    // Nitro Overcharge Mechanics
    NITRO: {
        MAX_CAPACITY: 100.0,
        STAGE2_DRAIN_RATE: 18.0,
        STAGE3_DRAIN_RATE: 28.0,
        STAGE3_SWEET_SPOT_MIN: 70,
        NATURAL_RECHARGE_RATE: 2.5
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
        BASE_FOV: 58.0,
        STAGE2_FOV: 74.0,
        STAGE3_FOV: 92.0,
        BASE_DISTANCE: 7.5,
        BASE_HEIGHT: 2.6,
        SPRING_STIFFNESS: 8.5,
        SPRING_DAMPING: 5.5,
        SHAKE_INTENSITY: 0.18
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
        CHECKPOINT_RADIUS: 9.0
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
            dpr: Math.min(window.devicePixelRatio || 1.5, 2.0),
            shadows: true,
            shadowMapSize: 2048,
            maxProps: 500,
            particles: 220,
            speedLines: true,
            postProcess: true
        }
    }
};
