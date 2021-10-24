const { Message } = require("discord.js");

const test = /(?!discord(?:(?:(?:app|status)\.com)|\.))\b(?<website>[\p{L}\p{Pd}]*d[il][sck]{1,2}[orc]{1,3}i?(?:d|cl)[\p{L}\p{P}]*)\.(?<domain>\w{2,4})/gui;

const excludedRoles = [
  '649189529231556609', // Mod team 
  '650660016755310592', // E team
  '650703325611950096'  // Wintergatan
];

/**
 * 
 * @param {Message} message 
 * @returns 
 */
module.exports = async message => {
  if (message.author.bot) return;

  // Exclude staff members from filter
  if (message.member.roles.cache.some(role => excludedRoles.includes(role))) return;

  // If message contains scam link
  if (message.content.match(test)) {
    // Delete message
    message.delete();

    // Mute member
    message.member.roles.add('710120710084755477');

    // Report in #staff-botspam
    message.guild.channels.resolve('709405505990426624').send?.(`<@${message.author.id}> sent a suspicious message in <#${message.channel.id}>, content:\n\`\`\`\n${message.content}\n\`\`\``);
  }
}