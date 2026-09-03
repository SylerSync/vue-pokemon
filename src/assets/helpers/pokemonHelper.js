import { getPokemon } from "@/api/pokeapi"
import { getSpecies } from "@/api/pokeapi"
import { getEvoChain } from "@/api/pokeapi"
import { getMove } from "@/api/pokeapi"
import { usePokemonStore } from "@/stores/pokemonStore";
import megaEvos from "@/assets/data/megaEvos.json"
import * as PokemonAPI from "@/api/PokemonAPI"

const pokemonStore = usePokemonStore()

// Must be passed the pokeon name
// If no form the base form will be suplied
// Note: for regional forms the region's name is the form
export async function getPokemonData(pokemon, specialForm) {
  const randInt = Math.floor(Math.random() * 101);
  try {
    let speciesData = await getSpecies(pokemon)
    let pokemonData = null
    if (speciesData.varieties.length > 1) {
      for (let form of speciesData.varieties) {
        if (form.pokemon.name == (pokemon + "-" + specialForm)) {
          pokemonData = await getPokemon(form.pokemon.name)
          break
        }
      }
      if (!pokemonData) {
        if (speciesData.varieties[0].is_default) {
          pokemonData = await getPokemon(speciesData.varieties[0].pokemon.name)
        }
        else {
          let randFormIndex = Math.floor(Math.random() * speciesData.varieties.length)
          let pokemonId = speciesData.varieties[randFormIndex].pokemon.url.split("/")
          pokemonData = await getPokemon(pokemonId.at(-2))
        }
      }
    } else {
      pokemonData = await getPokemon(speciesData.varieties[0].pokemon.name);
    }

    let levelRange = await calculateMaxAndMinLevels(speciesData, pokemonData.name)
    // console.log(`${pokemonData.name} - Min: ${levelRange.min} Max: ${levelRange.max}`)

    const randLevel = Math.floor(Math.random() * (levelRange.max - levelRange.min + 1)) + levelRange.min;
    const randomMoves = [];
    try {
      const movePool = pokemonData.moves.filter(m => m.version_group_details[0].move_learn_method.name === "level-up" && m.version_group_details[0].level_learned_at <= randLevel)
      if (movePool.length > 4) {
        // console.log(pokemonData.name)
        // console.log(movePool)
        let selectedMoves = []
        for (let i = 0; i < 4; i++) {
          let move = null
          let randMoveIndex = getRandomWithExclusions(0, movePool.length - 1, selectedMoves)
          selectedMoves.push(randMoveIndex)
          let spiltUrl = movePool[randMoveIndex].move.url.split("/")
          move = await getMove(spiltUrl.at(-2))
          let moveInfo = await getMoveData(move)
          randomMoves.push(moveInfo)
        }
      } else {
        for (let move of movePool) {
          const moveResp = await fetch(move.move.url)
          const moveData = await moveResp.json()
          let moveInfo = await getMoveData(moveData)
          randomMoves.push(moveInfo)
        }
      }
    } catch (err) {
      console.log(`An error occured getting moves for ${pokemonData.name}`, err)
    }
    const hpCalc = Math.floor(((2 * pokemonData.stats.find(s => s.stat.name == "hp")?.base_stat * randLevel) / 100) + randLevel + 10)

    let url = speciesData.evolution_chain.url
    const match = url?.match(/\/(\d+)\/?$/);
    const chainId = match ? match[1] : null;
    const evoDetails = await getEvolutionRequirements(chainId, speciesData.name)


    //Create the pokemon data with parts from both the API calls
    return {
      name: pokemonData.name,
      id: pokemonData.id,
      shiny: 10 < randInt && randInt < 15 ? true : false,
      sprite: pokemonData.sprites.front_default,
      shinySprite: pokemonData.sprites.front_shiny,
      backSprite: pokemonData.sprites.back_default,
      shinyBackSprite: pokemonData.sprites.back_shiny,
      types: pokemonData.types.map(t => t.type.name),
      height: pokemonData.height,
      weight: pokemonData.weight,
      cry: pokemonData.cries?.latest ? pokemonData.cries.latest : (pokemonData.cries?.legacy || ""),
      // Pokemon uses a scale of 0-255 for capture rate. this is being converted to a percentage of 100
      captureRate: Math.round((speciesData.capture_rate / 255) * 100),
      totalHP: hpCalc,
      currentHP: hpCalc,
      stats: pokemonData.stats.map(s => ({ name: s.stat.name, base_stat: s.base_stat, stat: ((2 * s.base_stat * randLevel) / 100) + 5 })),
      moves: randomMoves,
      totalKOs: 0,
      totalFaints: 0,
      level: randLevel,
      evoDetails: evoDetails,
      baseExp: pokemonData.base_experience,
      currentExp: 0,
      minorStatus: []
    };
  } catch (err) {
    console.error(`An error occurred collecting data for ${pokemon}`, err);
    return null;
  }
}

export async function getPokemonWithLevelData(pokemon, specialForm, level) {
  const randInt = Math.floor(Math.random() * 101);
  try {
    let speciesData = await getSpecies(pokemon)
    let pokemonData = null
    if (speciesData.varieties.length > 1) {
      for (let form of speciesData.varieties) {
        if (form.pokemon.name == (pokemon + "-" + specialForm)) {
          pokemonData = await getPokemon(form.pokemon.name)
          break
        }
      }
      if (!pokemonData) {
        if (speciesData.varieties[0].is_default) {
          pokemonData = await getPokemon(speciesData.varieties[0].pokemon.name)
        }
        else {
          let randFormIndex = Math.floor(Math.random() * speciesData.varieties.length)
          let pokemonId = speciesData.varieties[randFormIndex].pokemon.url.split("/")
          pokemonData = await getPokemon(pokemonId.at(-2))
        }
      }
    } else {
      pokemonData = await getPokemon(speciesData.varieties[0].pokemon.name);
    }

    let levelRange = await calculateMaxAndMinLevels(speciesData, pokemonData.name)
    const randomMoves = [];
    try {
      const movePool = pokemonData.moves.filter(m => m.version_group_details[0].move_learn_method.name === "level-up" && m.version_group_details[0].level_learned_at <= level)
      if (movePool.length > 4) {
        // console.log(pokemonData.name)
        // console.log(movePool)
        let selectedMoves = []
        for (let i = 0; i < 4; i++) {
          let move = null
          let randMoveIndex = getRandomWithExclusions(0, movePool.length - 1, selectedMoves)
          selectedMoves.push(randMoveIndex)
          let spiltUrl = movePool[randMoveIndex].move.url.split("/")
          move = await getMove(spiltUrl.at(-2))
          let moveInfo = await getMoveData(move)
          randomMoves.push(moveInfo)
        }
      } else {
        for (let move of movePool) {
          const moveResp = await fetch(move.move.url)
          const moveData = await moveResp.json()
          let moveInfo = await getMoveData(moveData)
          randomMoves.push(moveInfo)
        }
      }
    } catch (err) {
      console.log(`An error occured getting moves for ${pokemon}`, err)
    }
    const hpCalc = Math.floor(((2 * pokemonData.stats.find(s => s.stat.name == "hp")?.base_stat * level) / 100) + level + 10)


    let url = speciesData.evolution_chain.url
    const match = url?.match(/\/(\d+)\/?$/);
    const chainId = match ? match[1] : null;
    const evoDetails = await getEvolutionRequirements(chainId, speciesData.name)

    //Create the pokemon data with parts from both the API calls
    return {
      name: pokemonData.name,
      id: pokemonData.id,
      shiny: 10 < randInt && randInt < 15 ? true : false,
      sprite: pokemonData.sprites.front_default,
      shinySprite: pokemonData.sprites.front_shiny,
      backSprite: pokemonData.sprites.back_default,
      shinyBackSprite: pokemonData.sprites.back_shiny,
      types: pokemonData.types.map(t => t.type.name),
      height: pokemonData.height,
      weight: pokemonData.weight,
      cry: pokemonData.cries?.latest ? pokemonData.cries.latest : (pokemonData.cries?.legacy || ""),
      // Pokemon uses a scale of 0-255 for capture rate. this is being converted to a percentage of 100
      captureRate: Math.round((speciesData.capture_rate / 255) * 100),
      totalHP: hpCalc,
      currentHP: hpCalc,
      stats: pokemonData.stats.map(s => ({ name: s.stat.name, base_stat: s.base_stat, stat: ((2 * s.base_stat * level) / 100) + 5 })),
      moves: randomMoves,
      totalKOs: 0,
      totalFaints: 0,
      level: level,
      evoDetails: evoDetails,
      baseExp: pokemonData.base_experience,
      currentExp: 0,
      minorStatus: []

    };
  } catch (err) {
    console.error(`An error occurred collecting data for ${pokemon}`, err);
    return null;
  }
}

export async function getMoveData(move) {
  return {
    name: move.name,
    type: move.type.name,
    power: move.power,
    maxPP: move.pp,
    currentPP: move.pp,
    accuracy: move.accuracy,          // null = never misses
    priority: move.priority,
    damageClass: move.damage_class.name,
    targetsSelf: move.target.name === 'user',
    statChanges: move.stat_changes.map(s => ({
      stat: s.stat.name,
      change: s.change,
    })),
    statChance: move.meta?.stat_chance ?? 0,
    ailment: move.meta?.ailment?.name && move.meta.ailment.name !== 'none' ? move.meta.ailment.name : null,
    ailmentChance: move.meta?.ailment_chance ?? 0,
    drain: move.meta?.drain ?? 0,     // negative = recoil
    healing: move.meta?.healing ?? 0, // % of max HP
    flinchChance: move.meta?.flinch_chance ?? 0,
    critRate: move.meta?.crit_rate ?? 0,
    minTurns: move.meta?.min_turns ?? 0,
    maxTurns: move.meta?.max_turns ?? 0,
    minHits: move.meta?.min_hits ?? null,
    maxHits: move.meta?.max_hits ?? null,
    category: move.meta?.category?.name ?? null,
  }
}

export function buildEvolvedPokemonObject(baseApiData, currentPokemon) {
  const currLevel = currentPokemon.level

  // Calculate new stat values based on evolved base stats
  const mappedStats = baseApiData.stats.map(s => ({
    name: s.name,
    base_stat: s.base_stat,
    stat: Math.floor(((2 * s.base_stat * currLevel) / 100) + 5)
  }))

  const hpBase = baseApiData.stats.find(s => s.name === "hp")?.base_stat || 45
  const newTotalHp = Math.floor(((2 * hpBase * currLevel) / 100) + currLevel + 10)

  // Calculate HP gain from evolution and scale current HP accordingly
  const oldTotalHp = currentPokemon.totalHP || newTotalHp;
  const hpGain = Math.max(0, newTotalHp - oldTotalHp);
  const newCurrentHp = Math.min(newTotalHp, (currentPokemon.currentHP || 0) + hpGain);

  // Preserve original object properties while overwriting only transformed fields
  return {
    ...currentPokemon,
    name: baseApiData.name,
    id: baseApiData.id,
    sprites: baseApiData.sprites,
    types: baseApiData.types,
    height: baseApiData.height,
    weight: baseApiData.weight,
    cry: baseApiData.cry || currentPokemon.cry,
    baseExp: baseApiData.baseExp || baseApiData.base_experience,
    stats: mappedStats,
    totalHp: newTotalHp,
    currentHp: newCurrentHp
  }
}

export async function handleEvolution(currPokemon, evoPokemonName) {
  const apiData = await getPokemonData(evoPokemonName)
  const newPokemon = buildEvolvedPokemonObject(apiData, currPokemon)

  const index = pokemonStore.caughtPokemon.findIndex(p => p.instanceId === newPokemon.instanceId)

  if (index !== -1) {
    pokemonStore.caughtPokemon[index] = newPokemon // PERMANENT SAVE
    return true
  }
  return false
}

export async function handleMegaEvo(currPokemon) {
  if (!currPokemon) return currPokemon

  let baseSpecies = ""
  let specialForm = ""

  // 1. Rayquaza Special Case (Bypasses held-item check)
  if (currPokemon.name?.toLowerCase() === "rayquaza") {
    baseSpecies = "rayquaza"
    specialForm = "mega"
  } else {
    // 2. Standard Held-Item Lookup for all other Pokémon
    const rawItem = currPokemon?.heldItem

    if (!rawItem) {
      console.error("Cannot Mega Evolve: No held item string found.")
      return currPokemon
    }

    const key = rawItem.toLowerCase().trim().replace(/\s+/g, '-')
    const catalog = megaEvos.default || megaEvos

    const itemData = catalog[rawItem] || catalog[key] ||
      Object.values(catalog).find(item => item.name?.toLowerCase() === rawItem.toLowerCase())

    const megaSlug = itemData?.megaForm // e.g. "charizard-mega-x" or "lucario-mega"

    if (!megaSlug) {
      console.error(`Could not find a valid megaForm slug for held item: "${rawItem}"`)
      return currPokemon
    }

    baseSpecies = itemData.pokemon.toLowerCase()
    specialForm = megaSlug.replace(`${baseSpecies}-`, '')
  }

  // 3. Fetch Mega Data (e.g. "rayquaza" & "mega" -> "rayquaza-mega")
  const data = await getPokemonData(baseSpecies, specialForm)
  const apiData = await PokemonAPI.getPokemon(data.id)

  if (!apiData) {
    console.error(`Failed to fetch API data for ${baseSpecies} (${specialForm})`)
    return currPokemon
  }

  // 4. Build the fresh Mega object
  const megaPokemon = buildEvolvedPokemonObject(apiData, currPokemon)

  // Preserve battle damage taken in base form
  const damageTaken = currPokemon.totalHP - currPokemon.currentHP
  megaPokemon.currentHp = Math.max(1, megaPokemon.totalHP - damageTaken)
  megaPokemon.isMega = true

  console.log("returning mega evolution")
  return megaPokemon
}

async function calculateMaxAndMinLevels(pokemonSpecies, name) {
  let max = 100;
  let min = pokemonSpecies.is_legendary ? 85 : pokemonSpecies.is_mythical ? 75 : 1

  function walk(node, parentDetails) {
    if (node.species.name === name) {
      // min: the level it evolved at (if it has a pre-evolution)
      const lvl = parentDetails?.find(d => d.min_level)?.min_level;
      if (lvl) min = lvl;
      // max: the lowest level any of its evolutions require
      const nextLevels = node.evolves_to
        .flatMap(e => e.evolution_details)
        .map(d => d.min_level)
        .filter(Boolean);
      if (nextLevels.length) max = Math.min(...nextLevels) - 1;
      return true;
    }
    return node.evolves_to.some(e => walk(e, e.evolution_details));
  }

  try {
    let url = pokemonSpecies.evolution_chain.url.split("/")
    const evoChain = await getEvoChain(url.at(-2))
    walk(evoChain.chain, null);
    return { min, max };
  } catch (err) {
    console.error(`There was an issue getting the min and max levels for ${name}.`, err);
    return { min, max };
  }
}

function getRandomWithExclusions(min, max, excludeArray) {
  // 1. Clean, filter to only valid range elements, and sort exclusions ascending
  const uniqueExcludes = [...new Set(excludeArray)]
    .filter(num => num >= min && num <= max)
    .sort((a, b) => a - b);

  // 2. Adjust the max range down by the number of active exclusions
  const availableRangeCount = (max - min + 1) - uniqueExcludes.length;

  if (availableRangeCount <= 0) return null; // No available options

  // 3. Generate a random index within the newly shrunk range
  let randomNum = Math.floor(Math.random() * availableRangeCount) + min;

  // 4. Shift the random number upward for every exclusion it meets or passes
  for (const exclude of uniqueExcludes) {
    if (randomNum >= exclude) {
      randomNum++;
    } else {
      break; // Safe to stop checking since uniqueExcludes is sorted
    }
  }

  return randomNum;
}

async function getEvolutionRequirements(chainId, pokeName) {
  const requirements = [];

  if (!chainId) {
    console.warn(`No valid pokemon ID was found`);
    return requirements;
  }

  const evoData = await getEvoChain(chainId);

  if (!evoData) {
    console.warn(`Could not find the evo chain for ${pokeName}, chain id: ${chainId}`);
    return requirements;
  }

  if (evoData.chain.evolves_to?.length === 0) {
    return requirements;
  }

  const evos = {
    firstEvo: evoData.chain,
    secondEvo: evoData.chain.evolves_to ?? []
  };

  // --- STAGE 1 (e.g. Bulbasaur, Eevee, Wurmple) ---
  if (pokeName === evos.firstEvo.species.name) {
    for (let evo of evos.secondEvo) {
      const details = evo.evolution_details[0];
      requirements.push({
        level: details?.min_level ?? null,
        item: details?.item?.name ?? null,
        heldItem: details?.held_item?.name ?? null,
        trigger: details?.trigger?.name ?? null,
        nextEvo: evo.species ?? null
      });
    }
    return requirements;
  }

  // --- STAGE 2 (e.g. Ivysaur, Gloom, Silcoon, Kirlia) ---
  for (let pokemon of evos.secondEvo) {
    if (pokeName === pokemon.species.name) {
      if (pokemon.evolves_to?.length > 0) {
        for (let evo of pokemon.evolves_to) {
          const details = evo.evolution_details[0];
          requirements.push({
            level: details?.min_level ?? null,
            item: details?.item?.name ?? null,
            heldItem: details?.held_item?.name ?? null,
            trigger: details?.trigger?.name ?? null,
            nextEvo: evo.species ?? null
          });
        }
      }
      return requirements;
    }
  }

  // --- STAGE 3 / FULLY EVOLVED ---
  return requirements;
}