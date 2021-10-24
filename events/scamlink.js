const { Message } = require("discord.js");

const scamRegex = new RegExp(
  /(?!discord(?:(?:(?:app|status)\.com)|\.))/.source + // ignore real links
  /\b(?<website>[\p{L}\p{Pd}]*d[il][sck]{1,2}[orc]{1,3}i?(?:d|cl)[\p{L}\p{P}]*)/.source + // match anything thats similar to 'discord'
  /\.(?<domain>\w{2,4})/.source, // match the domain of the link
  'gui'
);

const excludedRoles = [
  '649189529231556609', // Mod team 
  '650660016755310592', // E team
  '650703325611950096'  // Wintergatan
];

module.exports = async message => {
  if (message.author.bot) return;

  // Exclude staff members from filter
  if (message.member.roles.cache.some(role => excludedRoles.includes(role))) return;

  if (message.content.match(scamRegex)) {
    message.delete();

    // Mute member
    message.member.roles.add('710120710084755477');

    // Report in #staff-botspam
    message.guild.channels.resolve('709405505990426624').send?.(`<@${message.author.id}> sent a suspicious message in <#${message.channel.id}>, content:\n\`\`\`\n${message.content}\n\`\`\``);
  }
}
