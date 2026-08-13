<template>
    
</template>

<script setup>
import { usePokemonStore } from "@/stores/pokemonStore"
import { useInventoryStore } from "@/stores/inventoryStore"

const pokemonStore = usePokemonStore()
const inventoryStore = useInventoryStore()

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const anim = ref(null); // { actor: 'ally' | 'foe', type: 'lunge' | 'hit' | 'faint' }

async function playAnim(actor, type, ms) {
  anim.value = { actor, type };
  await delay(ms);
  anim.value = null;
}

async function battleTurn(userPokemon, userMove, opponentPokemon, opponentMove, item, battleLog) {
    let userSpeed = userPokemon.stats.find(s => s.name == "speed").stat
    let oppSpeed = opponentPokemon.stats.find(s => s.name == "speed").stat
    // An Item is used
    if(item){
        // The Item is a pokeball
        if(inventoryStore.pokeballs.some(p => p.id == item.id)) {
            await CatchPokemon(opponentPokemon, item, battleLog)
            if(!battleStarted.value) {return}
            await delay(800)
            battleLog.push(`Oh no, ${selectedPokemon.value.name} broke out`)
        }
        // Put other item use logic here

        // The turn continues as normal after item usage
        await useMove(selectedPokemon.value, userPokemon, opponentMove)
        if (userPokemon.currentHp <= 0) {
              endBattle()
              return
        }
        return
    }

    try {
        // decide order
        const userFirst =
          userSpeed > oppSpeed ||
          (userSpeed === oppSpeed && Math.random() < 0.5);

        const order = userFirst
          ? [[userPokemon, opponentPokemon, userMove], [opponentPokemon, userPokemon, opponentMove]]
          : [[opponentPokemon, userPokemon, opponentMove], [userPokemon, opponentPokemon, userMove]];

        for (const [attacker, defender, chosenMove] of order) {
          if (!chosenMove) continue;
          await useMove(attacker, defender, chosenMove, battleLog, userPokemon);
          if (defender.currentHp <= 0) {
            battleLog.push(`${defender.name} fainted!`);
            await delay(800);
            endBattle();
            return;
          }
        }
    } catch(err) {

    }
}

async function useMove(user, target, move, battleLog, userPokemon) {
    const actor = user === userPokemon ? 'ally' : 'foe';
    const victim = actor === 'ally' ? 'foe' : 'ally';

    battleLog.push(`${user.name} used ${move.name}`)
    await playAnim(actor, 'lunge', 300);
    const randInt = Math.floor(Math.random() * 100) + 1
    if(randInt > move.accuracy) {
        battleLog.push(`${move.name} missed`)
        await delay(800)
        return
    }
    if(move.power) {
        const results = calculateDamage(user, target, move)
        if(results.critical) {
            battleLog.push("Critical Hit!")
        }
        if(results.immune) {
          battleLog.push(`It doesn't affect ${target.name}...`);
          return;
        }
        if(results.effectiveness == 2){
            battleLog.push("Super Effective")
        } else if (results.effectiveness == .5){
            battleLog.push("Not very effective")
        }
        // await delay(800)
        await playAnim(victim, 'hit', 400);
        battleLog.push(`${user.name} did ${results.damage} damage`)
        target.currentHp -= results.damage
        await delay(800)
    } else {
        battleLog.push("This move does nothing bozo.")
    }
}

function calculateDamage(attacker, defender, move, opts = {}) {
  const {
    critical = Math.random() < 1 / 24,
    randomFactor = Math.max(.85, Math.random()),
    weatherMod = 1,
    otherMod = 1,
  } = opts;

  if (move.class === 'status' || !move.power) {
    return { damage: 0, effectiveness: 1, critical: false, immune: false };
  }

  const physical = move.class === 'physical';
  const atk = physical ? attacker.stats.find(s => s.name == "attack").stat : attacker.stats.find(s => s.name == "special-attack").stat;
  const def = physical ? defender.stats.find(s => s.name == "defense").stat : defender.stats.find(s => s.name == "special-defense").stat;

  const base =
    Math.floor(
      Math.floor(
        (Math.floor((2 * attacker.level) / 5 + 2) * move.power * atk) / def
      ) / 50
    ) + 2;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = typeEffectiveness(move.type, defender.types);
  const critMod = critical ? 1.5 : 1;

  if (effectiveness === 0) {
    return { damage: 0, effectiveness: 0, critical: false, immune: true };
  }

  const damage = Math.max(
    1,
    Math.floor(
      base * weatherMod * critMod * randomFactor * stab * effectiveness * otherMod
    )
  );

  return { damage, effectiveness, critical, immune: false };
}

function typeEffectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce(
    (mult, t) => mult * (pokemonStore.typeChart[moveType]?.[t] ?? 1),
    1
  );
}

async function CatchPokemon(pokemon, pokeball, battleLog) {
    if (!pokemon || pokemon === null) {
        console.warn("Unable to catch pokemon, pokemon data was not found")
        return
    }
    // if(pokemonStore.caughtPokemon.length === 0){
    //     CatchStarter()
    //     return
    // }
    try {
        if(inventoryStore.UsePokeball(pokeball.id)){
            // Roll chances for capturing or fleeing
            let captureRoll = Math.floor(Math.random() * 101);
            let damageBonus = 0
            console.log(hpPercent(pokemon))
            damageBonus = hpPercent(pokemon) < 20 ? 20 : hpPercent(pokemon) < 50 ? 10 : 0
            const rawRate = captureRoll - pokeball.catchPower - damageBonus
            let effectiveCaptureRate = Math.min(100, Math.max(0, rawRate))

            console.log(`Capture roll: ${captureRoll} Damage Modifier: -${damageBonus} Effective Roll: ${effectiveCaptureRate} Capture Chance: ${pokemon.captureRate}`)
            battleLog.push(`You threw a ${pokeball.id} at ${pokemon.name}...`)
        
        // Capture roll chance hits, pokemon is set and relavent data is set
            if(effectiveCaptureRate <= pokemon.captureRate){
                await delay(800)
                battleLog.push(`Congradulations, you caught ${pokemon.name}`)
                pokemonStore.addPokemon(pokemon)
                console.log(`${Math.trunc(3000/pokemon.captureRate)} has been added to your balance`)
                inventoryStore.AddFunds(Math.trunc(3000/pokemon.captureRate))
                await delay(800)
            }
            // If a roll chance fails the pokemon has the chance to flee
            else{
                if(checkPokemonFlees(pokemon)){
                    await delay(800)
                    battleLog.push(`${pokemon.name} fled`)
                    await delay(800)
                }
            }
        }
        else{
            catchMessage.value = `You don't have any ${pokeball.id}, switching to default Pokeball.`
            showFeedback.value = true
        }
    }
    catch (err) {
        console.error("Unable to catch pokemon", err)
    }

}

function checkPokemonFlees(pokemon) {
  const fleeChance = Math.min(20, 100 - pokemon.captureRate);
  const fleeRoll = Math.floor(Math.random() * 101);
  return fleeRoll <= fleeChance
}
</script>

<style>

</style>