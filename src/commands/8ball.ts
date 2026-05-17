import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';

const RESPONSES = [
  'Sí, definitivamente.',
  'Sin duda alguna.',
  'Puedes contar con ello.',
  'Las señales apuntan a que sí.',
  'Muy probable.',
  'Pregunta en otro momento.',
  'No puedo predecirlo ahora.',
  'Mejor no te digo.',
  'Concéntrate y vuelve a preguntar.',
  'No cuentes con ello.',
  'Mi respuesta es no.',
  'Mis fuentes dicen que no.',
  'Las perspectivas no son buenas.',
  'Muy dudoso.',
  'Rotundamente no.',
];

const eightball: Command = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Consulta a la bola 8 mágica')
    .addStringOption(opt =>
      opt.setName('pregunta').setDescription('¿Qué quieres saber?').setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('pregunta', true).slice(0, 1024);
    const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🎱 Bola 8 mágica')
          .addFields(
            { name: 'Pregunta', value: question },
            { name: 'Respuesta', value: answer },
          ),
      ],
    });
  },
};

export default eightball;
