

const { MessageEmbed } = require('discord.js');

let aboutEmbed = new MessageEmbed({
    description: `Wintergatan is a band from Sweden. They are gearing up to release an album & embark on a world tour with the Marble Machine X, a mechanical machine that plays music with marbles. Follow the MMX build in their YouTube series [Wintergatan Wednesdays](https://www.youtube.com/wintergatan2000)!`
});

let faqEmbed = new MessageEmbed({
    fields: [
        {
            name: 'Can I use Wintergatan music in my project/video?', value: `
You can find a license to use original Wintergatan songs as background music for your videos and livestreams here: https://wintergatan.net/products/license-to-use-wintergatan-music-for-video-and-livestream-background-music
Please read the license carefully before using the music.
License is only valid providing the usage is complying to all the License conditions.

For commercial use, contact management@wintergatan.net.
`}]
});

let linksEmbed = new MessageEmbed({
    description: ``,
    fields: [
        {
            name: ':globe_with_meridians: Official Pages', value: `
[Website](https://wintergatan.net)
[YouTube](https://www.youtube.com/user/wintergatan2000)
[Facebook](https://www.facebook.com/wintergatan)
[Twitter](https://twitter.com/wintergatan)
`}, {
            name: '💪 Support the MMX Project', value: `
[Youtube Membership](https://www.youtube.com/wintergatan2000/join)
[Patreon](https://patreon.com/wintergatan)
`}, {
            name: '🎧 Listen', value: `
[Spotify](https://bit.ly/2oKxXWd)
[Apple Music](https://apple.co/2ntWNsZ)
[Bandcamp](https://wintergatan.bandcamp.com/)
[YouTube Music](https://music.youtube.com/channel/UCLFMX5KXvYScjRJ7ccDkOYg)
`}, {
            name: '💸 Buy things', value: `
[T-Shirts, Hoodies, Posters and Mugs](https://teespring.com/stores/wintergatan)
[Physical records](https://wintergatan.net/collections/frontpage)
[Limited Edition Posters](https://wintergatan.net/collections/lost-and-found-poster)
[Pay What You Want for music, poster/CAD files and more](https://wintergatan.net/collections/download)
`},
        {
            name:
                '<:reddit' + ':748619882874273853> Reddit', value:
                `[r/Wintergatan](https://reddit.com/r/wintergatan)
[r/MarbleMachineX](https://reddit.com/r/marblemachinex)
`}, {
            name: '📜 Old Discord server (archived)', value: `
[Find it here](https://discord.gg/Ncw7qWV)
`}]
});

let communityEmbed = new MessageEmbed({
    description: '', fields: [
        {
            name: 'The CAD MMX Project (aka the CAD Team)', value: `
We're a team of hundreds of volunteers, working together on the monster project detailed in WW Episode #139. If you are interested in learning more, check out our public channel <#714558371591749662>! To join the team or follow along more closely, click on the angle grinder icon at the bottom left of this post: https://discordapp.com/channels/649165975647682560/710417521907597382/710775342448771122

Clicking the angle grinder will give you the role of <@&714554830466842654>, write access to <#714558371591749662> and the ability to view our private work channels. Once you join, be sure to read all the pins in all our channels for all the details. We welcome everyone regardless of cad experience, including people who want to learn more about CAD or just watch as we eat our way through this elephant. :) Please contact <@712764299487084636> (Maureen/MeticulaeDesigns#1334) with any questions!
_ _
`}, {
            name: 'The Virtual MMX Project', value: `
We're creating a Web App, that'll let anyone create and share music in a virtual space with the limitations of the MMX.
To see the latest (work in progress) build, check out https://wintergatan-community.github.io/virtual-mmx/. Or have a look at our repositories (raw code) at https://github.com/wintergatan-community (note that there are \`dev\` branches).

If you're interested in getting involved, check out the pinned message in <#712733531687878676> for more information. Feel free to ask questions there or direct them at <@222710078174658560> (mozi\\_h#5401).
_ _
`}, {
            name: 'The Subtitles Team', value: `
This community driven team coordinates the effort to subtitle all Wintergatan videos. Join the Wednesday Writers from this post:
https://discord.com/channels/649165975647682560/649172304638640130/724360443136704523
(You're also welcome with feedback from anyone using the subtitles or closed captions. It helps knowing the time is well spent!)
`}]
});


module.exports = (msg) => {
    msg.guild.channels.cache.get('649173574044745728').send('<:winterw:709383012705370204> __**About Wintergatan**__', aboutEmbed);

//    msg.guild.channels.cache.get('649173574044745728').send('_ _');

    msg.guild.channels.cache.get('649173574044745728').send(':question: __**Frequently Asked Questions**__', faqEmbed);

//    msg.guild.channels.cache.get('649173574044745728').send('_ _');

    msg.guild.channels.cache.get('649173574044745728').send(':link: __**Links**__', linksEmbed);

//    msg.guild.channels.cache.get('649173574044745728').send('_ _');

    msg.guild.channels.cache.get('649173574044745728').send(':busts_in_silhouette: **__Community Projects__**', communityEmbed);
}

