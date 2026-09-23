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
            fogDensity: 0.0008,
            sunColor: 0xfff0dd,
            skyColor: 0x07111f,
            zenithColor: 0x040814,
            horizonColor: 0x0c2238,
            gridColor: 0x00e5ff,
            trackEmissive: 0x00f0ff,
            trackEdge: 0x0E7C7B,
            buildingSpread: 2200,
            buildingHeightMax: 65,
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
            fogDensity: 0.0012,
            sunColor: 0xffaa77,
            skyColor: 0x0b1724,
            zenithColor: 0x060c16,
            horizonColor: 0x2b1c18,
            gridColor: 0xffaa00,
            trackEmissive: 0xff8800,
            trackEdge: 0xff5500,
            buildingSpread: 2600,
            buildingHeightMax: 85,
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
            fogDensity: 0.0014,
            sunColor: 0x88ccff,
            skyColor: 0x050c18,
            zenithColor: 0x090218,
            horizonColor: 0x1b143c,
            gridColor: 0x9d4edd,
            trackEmissive: 0x00ffff,
            trackEdge: 0x7209b7,
            buildingSpread: 3000,
            buildingHeightMax: 110,
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
            fogDensity: 0.0016,
            sunColor: 0xff4422,
            skyColor: 0x14041a,
            zenithColor: 0x12000d,
            horizonColor: 0x360515,
            gridColor: 0xff2a4b,
            trackEmissive: 0xffc400,
            trackEdge: 0xff0044,
            buildingSpread: 3400,
            buildingHeightMax: 140,
            buildingColors: [0x621708, 0x941B0C, 0xBC3908, 0xF6AA1C, 0xD4A373, 0x3F0008, 0xE63946, 0xFB8500],
            beaconColors: [0xff0033, 0xffbb00, 0xff0077],
            trimColor: 0xffc400,
            windowGlow: 0xffd000
        },
        {
            id: 5,
            name: 'Lunar Orbital Drydocks',
            subtitle: 'Sub-orbital vacuum corridor with low-gravity physics',
            briefing: 'LOW-G FLIGHT ZONE: Maneuver through zero-friction orbital crane gantries and magnetic containment rings.',
            laps: 3,
            payloads: 8,
            requiredSectorId: 4,
            gravityMultiplier: 0.42,
            dragMultiplier: 0.45,
            isLowGravity: true,
            fogDensity: 0.0006,
            sunColor: 0xffffff,
            skyColor: 0x020307,
            zenithColor: 0x000002,
            horizonColor: 0x0a101f,
            gridColor: 0x00ffff,
            trackEmissive: 0x00ffff,
            trackEdge: 0x0E7C7B,
            buildingSpread: 3800,
            buildingHeightMax: 160,
            buildingColors: [0x1a1a24, 0x222233, 0x333344, 0x00ffff, 0x444455, 0x11111a],
            beaconColors: [0x00ffff, 0xff0055, 0xffffff],
            trimColor: 0x00ffff,
            windowGlow: 0x00ffff
        }
    ],

    // Three distinct Slow Roads-inspired atmospheric skylines: Evening Gloomy, Morning Bright, Night Neon
    SKYLINES: [
        {
            id: 'MORNING_CALM',
            name: 'Morning Bright Calm',
            subtitle: 'Clear azure skies and golden morning sunlight',
            sunColor: 0xfff0d0,
            skyColor: 0x4a90e2,
            zenithColor: 0x1d4e89,
            horizonColor: 0xfbd07c,
            fogDensity: 0.0016,
            gridColor: 0x00f0ff,
            windowGlow: 0xffe899,
            lightIntensity: 1.35
        },
        {
            id: 'EVENING_GLOOMY',
            name: 'Evening Gloomy Dusk',
            subtitle: 'Atmospheric moody violet haze with overcast skyline',
            sunColor: 0xff5533,
            skyColor: 0x22132e,
            zenithColor: 0x140a20,
            horizonColor: 0x7a2245,
            fogDensity: 0.0032,
            gridColor: 0xff3b5c,
            windowGlow: 0xffa040,
            lightIntensity: 0.95
        },
        {
            id: 'NIGHT_NEON',
            name: 'Night Sky Neon City',
            subtitle: 'Deep obsidian twilight with illuminated cybernetic towers',
            sunColor: 0x4466ff,
            skyColor: 0x030712,
            zenithColor: 0x010206,
            horizonColor: 0x09142b,
            fogDensity: 0.0022,
            gridColor: 0x00ffff,
            windowGlow: 0x00f5d4,
            lightIntensity: 0.75
        }
    ],

    // Procedural generation parameters (Tasks 11-20)
    PROCEDURAL: {
        DEFAULT_SEED: 'BARCH-ALPHA',
        CANYON_WIDTH_MIN: 24,
        CANYON_WIDTH_MAX: 52,
        CLIMB_ANGLE_MAX: 0.78, // ~45 degrees
        CHUNK_SEGMENT_LENGTH: 220,
        CHUNKS_AHEAD: 3,
        CHUNKS_BEHIND: 2
    },

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

    // Aircraft Kinematics & Aerodynamics (Hovercar Configuration)
    FLIGHT: {
        BASE_SPEED: 0.0,
        IDLE_SPEED: 0.0,
        MAX_CRUISE_SPEED: 95.0,
        REVERSE_SPEED: 25.0,
        STAGE2_BOOST_SPEED: 140.0,
        STAGE3_BOOST_SPEED: 190.0,
        ACCELERATION: 42.0,
        BRAKING_DECEL: 55.0,
        ROLL_RATE: 2.0,
        PITCH_RATE: 0.0,
        YAW_RATE: 1.2,         // Slow, zen turn rate — world opens up around you
        BANKING_TILT: 0.42,    // Pronounced body lean into turns
        PITCH_TILT: 0.0,
        VERTICAL_THRUST: 38.0,
        INDUCED_DRAG: 0.032,
        DRAFTING_DISTANCE: 22.0,
        DRAFTING_BOOST_RATE: 20.0
    },

    // Flight Assist, Fixed Altitude Hold, Autopilot & Hovercar ADAS
    ASSIST: {
        HOVERCAR_ADAS: {
            ESC_LATERAL_STABILITY: 0.92,
            WALL_REPULSION_DIST: 4.5,
            WALL_REPULSION_FORCE: 35.0,
            GATE_MAGNETISM_DIST: 28.0,
            GATE_MAGNETISM_FORCE: 14.0,
            AUTO_ELEVATION_RATE: 6.0,
            HOVER_HEIGHT_DEFAULT: 22.0,
            LANE_ASSIST_FORCE: 5.5,    // Soft lateral push toward track centerline
            LANE_ASSIST_DIST: 60.0,    // Activation radius from nearest spline point
            TRACK_ALIGN_GAIN: 0.28     // Fraction of track tangent blended into player yaw
        },
        FLY_ASSIST: {
            AUTO_LEVEL_RATE: 8.0,
            DRIFT_DAMPENING: 0.95,
            OBSTACLE_REPULSION_DIST: 9.0,
            OBSTACLE_REPULSION_FORCE: 32.0
        },
        ALTITUDE_HOLD: {
            DEFAULT_ALT: 18.0,
            MIN_ALT: 8.0,
            MAX_ALT: 280.0,
            STEP: 5.0,
            P_GAIN: 2.2,
            D_GAIN: 0.85,
            MAX_VERT_SPEED: 22.0
        },
        AUTOPILOT: {
            LOOKAHEAD_DIST: 38.0,
            SPLINE_TENSION: 0.5,
            STEER_GAIN: 3.2,
            PITCH_GAIN: 0.0,
            TARGET_CRUISE_RATIO: 0.95,
            ALLOW_BOOST_ON_STRAIGHTS: true,
            MIN_BOOST_HEADING_ALIGNMENT: 0.94
        },
        HOVER_STOP: {
            DECEL_RATE: 160.0,
            STATION_DAMPENING: 0.82
        }
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
        BASE_FOV: 75.0,
        STAGE2_FOV: 90.0,
        STAGE3_FOV: 108.0,
        BASE_DISTANCE: 10.0,
        BASE_HEIGHT: 3.2,
        SPRING_STIFFNESS: 5.5,   // Loose — camera drifts serenely into position
        SPRING_DAMPING: 4.2,
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
