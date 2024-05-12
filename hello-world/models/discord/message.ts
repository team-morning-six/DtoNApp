import axios from 'axios';

export class Message {
  private static DISCORD_API_BASEURL = 'https://discordapp.com/api/';
  private static DISCORD_API_TOKEN = process.env.DiscordApiToken;

  id = '';
  content = '';
  timestamp = '';
  author = {
    id: '',
    username: '',
  };

  constructor(data: Partial<Message> = {}) {
    Object.assign(this, data);
  }

  static async fetchbyChannelId(channelId: string) {
    return await axios
      .get(`${this.DISCORD_API_BASEURL}channels/${channelId}/messages`, {
        headers: { Authorization: 'Bot ' + this.DISCORD_API_TOKEN },
      })
      .then((response) => {
        const messages = (response.data as Message[]) ?? [];
        return messages.map((message) => new Message(message));
      })
      .catch((error) => {
        console.log(error);
        return [];
      });
  }
}
