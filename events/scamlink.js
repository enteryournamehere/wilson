const scamRegex = new RegExp(
  '(?!discord(?:app|status)?\\.(?:com|net|dev|gift))' + // ignore real links
  '\\b(?<website>[\\p{L}\\p{Pd}]*d[il][sckz]{1,2}[orc]{1,3}i?(?:d|cl)[\\p{L}\\p{P}]*)' + // match anything thats similar to 'discord'
  '\\.(?<domain>\\w{2,4})', // match the domain of the link
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
    message.delete().catch(console.error);

    // Give member muted role
    message.member.roles.add('710120710084755477').catch(console.error);

    // Report in #staff-botspam
    message.guild.channels.resolve('709405505990426624').send?.(`<@${message.author.id}> sent a suspicious message in <#${message.channel.id}>, content:\n\`\`\`\n${message.content}\n\`\`\``).catch(console.error);
  }
}
