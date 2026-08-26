<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Builders · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Builders</h1>
<p class="mt-3 text-muted">
	A builder is a calculator that describes itself. It carries a title, a summary, the list of inputs
	it takes — with their labels, units, ranges and options — and a <code>compute</code> function that turns
	those inputs into a result. Because the description is data, you can render a form, register a slash
	command, or generate a test from the calculator itself, and add a new calculator without touching any
	of them.
</p>

<h2 class="mt-10 text-xl font-semibold">The Fifteen Builders</h2>
<p class="mt-3 text-muted">
	Every builder is in <code>CALCULATOR_BUILDERS</code>, and <code>findCalculatorBuilder</code> looks one
	up by id.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { CALCULATOR_BUILDERS } from 'thetowersdk/builders'

for (const builder of CALCULATOR_BUILDERS) {
  console.log(builder.id.padEnd(24), builder.title)
}

// assist.stones            Assist module stones
// bot.upgrade              Bot upgrade
// economy.coins-per-kill   Coins per kill
// damage.reduction         Damage reduction
// dissonance.boost         Dissonance boost
// drops.enemy              Enemy drops
// enemy.wave               Enemy stats by wave
// guardian.upgrade         Guardian upgrade
// uw.inner-land-mines      Inner Land Mines
// lab.research             Lab research
// module.cost              Module upgrade cost
// thorns.damage            Thorn damage
// uw.stones                Ultimate weapon stones
// uptime.ratio             Ability uptime
// workshop.upgrade         Workshop upgrade`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Run One</h2>
<p class="mt-3 text-muted">
	Start from <code>defaults</code>, change what you care about, pass it through
	<code>normalize</code>, then <code>compute</code>. Normalising first clamps values into the ranges
	the fields declare, so a number typed into a form is safe to hand straight to the calculator.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { findCalculatorBuilder } from 'thetowersdk/builders'

const uptime = findCalculatorBuilder('uptime.ratio')

const input = uptime.normalize({ durationSeconds: 23, cooldownSeconds: 220 })
const result = uptime.compute(input)

console.log(result)
// { ratio: 0.1045…, percent: 10.45…, permanent: false, downtimeSeconds: 197, notes: [] }`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Read The Inputs</h2>
<p class="mt-3 text-muted">
	<code>fields</code> is the shape of the calculator. Each field has a <code>key</code>, a
	<code>label</code> and a <code>kind</code>; number fields carry <code>min</code>,
	<code>max</code> and sometimes a <code>unit</code> or a <code>help</code> line; select fields
	carry their <code>options</code>.
</p>
<div class="mt-4">
	<CodeBlock
		code={`const uptime = findCalculatorBuilder('uptime.ratio')

console.log(uptime.summary)
// 'What share of the time an ultimate weapon is active, from its duration and cooldown.'

console.log(uptime.fields)
// [
//   { key: 'durationSeconds', label: 'Duration', kind: 'number', unit: 'seconds', min: 0 },
//   { key: 'cooldownSeconds', label: 'Cooldown', kind: 'number', unit: 'seconds', min: 0,
//     help: 'Measured from activation, so duration ≥ cooldown means permanent uptime.' }
// ]`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Generate A Form</h2>
<p class="mt-3 text-muted">
	Because the fields are data, one loop renders any calculator. This is the whole of a working form
	— add a builder to the package and it appears here with no further work.
</p>
<p class="mt-4 text-sm text-muted">The component logic — three lines:</p>
<div class="mt-2">
	<CodeBlock
		code={`import { findCalculatorBuilder } from 'thetowersdk/builders'

const builder = findCalculatorBuilder('lab.research')
let input = $state({ ...builder.defaults })
let result = $derived(builder.compute(builder.normalize(input)))`}
	/>
</div>
<p class="mt-4 text-sm text-muted">And the markup, which never mentions a specific field:</p>
<div class="mt-2">
	<CodeBlock
		code={`{#each builder.fields as field}
  <label>
    {field.label}{field.unit ? \` (\${field.unit})\` : ''}

    {#if field.kind === 'select'}
      <select bind:value={input[field.key]}>
        {#each field.options as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {:else}
      <input type="number" min={field.min} max={field.max} bind:value={input[field.key]} />
    {/if}

    {#if field.help}<small>{field.help}</small>{/if}
  </label>
{/each}

<output>{result.totalCoinCost}</output>`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Results Carry Their Own Detail</h2>
<p class="mt-3 text-muted">
	<code>compute</code> returns the whole working, not just a headline number — a per-level breakdown where
	one applies, totals, and any notes the calculator wants to show alongside the figure.
</p>
<div class="mt-4">
	<CodeBlock
		code={`const labs = findCalculatorBuilder('lab.research')

const result = labs.compute(
  labs.normalize({
    labName: 'Attack Speed',
    currentLevel: 10,
    targetLevel: 20,
    coinDiscountPercent: 15,
    labSpeedPercent: 40
  })
)

console.log(result.totalCoinCost)   // coins for the whole run
console.log(result.totalHours)      // research time, discounts applied
console.log(result.maxLevel)        // where this lab tops out
console.log(result.levels[0])       // { level: 11, coinCost: …, hours: … }
console.log(result.notes)           // anything worth showing next to the total`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Turn Every Builder Into A Command</h2>
<p class="mt-3 text-muted">
	The same description registers a Discord command. Loop the builders, map each field to a command
	option, and the bot answers with the numbers your site shows.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { CALCULATOR_BUILDERS, findCalculatorBuilder } from 'thetowersdk/builders'

const commands = CALCULATOR_BUILDERS.map((builder) => ({
  name: builder.id.replace('.', '-'),
  description: builder.summary,
  options: builder.fields.map((field) => ({
    name: field.key.toLowerCase(),
    description: field.label,
    type: field.kind === 'select' ? 'STRING' : 'NUMBER',
    choices: field.kind === 'select' ? field.options : undefined,
    required: builder.defaults[field.key] === undefined
  }))
}))

function run(commandName, values) {
  const builder = findCalculatorBuilder(commandName.replace('-', '.'))
  return builder.compute(builder.normalize({ ...builder.defaults, ...values }))
}`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Test Them All At Once</h2>
<p class="mt-3 text-muted">
	Because every builder has the same shape, one test covers all fifteen — and covers the next one
	automatically.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { CALCULATOR_BUILDERS } from 'thetowersdk/builders'

for (const builder of CALCULATOR_BUILDERS) {
  const result = builder.compute(builder.normalize(builder.defaults))
  console.log(builder.id, Object.keys(result))
}`}
	/>
</div>

<p class="mt-8 text-sm">
	<a href={href('/docs/mechanics/')}>Formulas →</a>
	·
	<a href={href('/docs/bots/')}>Discord Bots →</a>
	·
	<a href={href('/playground/')}>Runnable Examples →</a>
</p>
