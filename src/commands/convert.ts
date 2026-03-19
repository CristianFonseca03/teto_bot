import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { CURRENCIES, fetchRates, fromUSD, toUSD } from '../currencies';

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('convert')
    .setDescription('Convierte un monto entre monedas reales y meme')
    .addNumberOption((opt) => opt.setName('monto').setDescription('Cantidad a convertir').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('moneda').setDescription('Moneda de origen').setRequired(true).setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(focused) || c.name.toLowerCase().includes(focused),
    )
      .slice(0, 25)
      .map((c) => ({ name: `${c.emoji} ${c.code} — ${c.name}`, value: c.code }));
    await interaction.respond(choices);
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (!process.env.EXCHANGE_RATE_API_KEY) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ `EXCHANGE_RATE_API_KEY` no está configurada en el entorno.'),
        ],
      });
      return;
    }

    const monto = interaction.options.getNumber('monto', true);
    const moneda = interaction.options.getString('moneda', true).toUpperCase();
    const fromCurrency = CURRENCIES.find((c) => c.code === moneda);

    if (!fromCurrency) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ Moneda \`${moneda}\` no reconocida. Usa el autocomplete para ver las opciones.`),
        ],
      });
      return;
    }

    let rates;
    try {
      rates = await fetchRates();
    } catch (err) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ No se pudieron obtener las tasas de cambio. Intenta de nuevo más tarde.'),
        ],
      });
      return;
    }

    const amountUSD = toUSD(monto, fromCurrency.code, rates);
    const targets = CURRENCIES.filter((c) => c.code !== fromCurrency.code);
    const realTargets = targets.filter((c) => !c.fictional);
    const memeTargets = targets.filter((c) => c.fictional);

    const buildGroup = (currencies: typeof targets) =>
      currencies
        .map((c) => {
          const result = fromUSD(amountUSD, c.code, rates);
          return `${c.emoji} \`${c.code}\` **${fmt.format(result)}** — ${c.name}`;
        })
        .join('\n');

    const equivalenciasLines = targets
      .map((c) => {
        const rate = fromUSD(toUSD(1, fromCurrency.code, rates), c.code, rates);
        return `${c.emoji} \`${c.code}\` → **${fmt.format(rate)}**`;
      });

    const half = Math.ceil(equivalenciasLines.length / 2);
    const equivCol1 = equivalenciasLines.slice(0, half).join('\n');
    const equivCol2 = equivalenciasLines.slice(half).join('\n');

    const updatedAt = new Date(Date.now()).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    const color = fromCurrency.fictional ? 0x5865f2 : 0x1db954;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${fromCurrency.emoji} ${fmt.format(monto)} ${fromCurrency.code}`)
      .setDescription(`-# ${fromCurrency.name}`)
      .addFields(
        { name: '💵 Monedas reales', value: buildGroup(realTargets), inline: false },
        { name: '🎭 Monedas meme', value: buildGroup(memeTargets), inline: false },
        { name: `📊 1 ${fromCurrency.code} equivale a`, value: equivCol1, inline: true },
        { name: '\u200b', value: equivCol2, inline: true },
      )
      .setFooter({ text: `Tasas actualizadas · ${updatedAt} (MX)` });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
